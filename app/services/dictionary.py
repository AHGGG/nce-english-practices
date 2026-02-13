"""
Dictionary Service with SQLite backend for low-memory usage.

This module provides dictionary lookup functionality using SQLite databases
instead of loading entire MDX files into memory.

SQLite databases are created by running: scripts/convert_mdx_to_sqlite.py
"""

import os
import mimetypes
import sqlite3
import aiosqlite
import asyncio
from typing import Optional, Tuple, List, Dict
from bs4 import BeautifulSoup
import logging
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

# Global path configuration
DICT_BASE_DIR = r"resources/dictionaries"


class DictionaryManager:
    """
    Manages dictionary lookups using SQLite databases (Async with aiosqlite).

    Memory-efficient: Only opens database connections, data is queried on-demand.
    Falls back to legacy MDX loading if .db files are not found.
    """

    def __init__(self):
        self.databases: List[Dict] = []
        self.loaded = False
        self._use_legacy = False

        # LRU cache for lookup results
        self._lookup_cache: dict = {}
        self._cache_max_size: int = 500

    async def load_dictionaries(self):
        """
        Scans DICT_BASE_DIR for .db files (SQLite) and opens connections.
        Falls back to legacy MDX loading if no .db files found.
        """
        if self.loaded:
            return

        if not os.path.exists(DICT_BASE_DIR):
            logger.warning(f"Warning: Dictionary directory not found: {DICT_BASE_DIR}")
            self.loaded = True
            return

        # 1. Find all SQLite database files
        db_files = []
        for root, dirs, files in os.walk(DICT_BASE_DIR):
            for file in files:
                if file.lower().endswith(".db"):
                    db_files.append(os.path.join(root, file))

        if db_files:
            logger.info(f"Found {len(db_files)} SQLite dictionary database(s).")
            await self._load_sqlite_databases(db_files)
        else:
            # Fallback to legacy MDX loading
            logger.warning(
                "No SQLite databases found. Run: uv run python scripts/convert_mdx_to_sqlite.py"
            )
            self._use_legacy = True
            # Legacy loading is blocking, run in thread
            await run_in_threadpool(self._load_legacy_mdx)

        self.loaded = True
        logger.info(f"Total dictionaries loaded: {len(self.databases)}")

    async def _load_sqlite_databases(self, db_files: List[str]):
        """Load SQLite database connections asynchronously."""
        for db_path in db_files:
            try:
                logger.info(f"Opening SQLite (Async): {db_path} ...")
                # aiosqlite.connect
                conn = await aiosqlite.connect(db_path, check_same_thread=False)

                # Optimize for low memory usage
                await conn.execute("PRAGMA cache_size = -2000")  # 2MB cache
                await conn.execute("PRAGMA mmap_size = 268435456")  # 256MB mmap
                await conn.execute("PRAGMA query_only = ON")  # Read-only optimization

                # Calculate relative subdir for asset paths
                rel_path = os.path.relpath(os.path.dirname(db_path), DICT_BASE_DIR)
                rel_path = rel_path.replace("\\", "/")

                self.databases.append(
                    {
                        "name": os.path.basename(db_path),
                        "conn": conn,
                        "subdir": rel_path if rel_path != "." else "",
                        "_legacy": False,
                    }
                )
                logger.info(f"  ✓ Opened {os.path.basename(db_path)}")

            except Exception as e:
                logger.error(f"Failed to open {db_path}: {e}")

    async def shutdown(self):
        """Close all opened dictionary resources for graceful shutdown/reload."""
        closed = 0
        for d in self.databases:
            conn = d.get("conn")
            if not conn:
                continue
            try:
                result = conn.close()
                if asyncio.iscoroutine(result):
                    await result
                closed += 1
            except Exception as e:
                logger.warning(f"Failed to close dictionary connection: {e}")

        if closed:
            logger.info(f"Closed {closed} dictionary connection(s).")

        self.databases.clear()
        self._lookup_cache.clear()
        self.loaded = False
        self._use_legacy = False

    def _load_legacy_mdx(self):
        """Legacy loading: Load MDX files into memory (high memory usage)."""
        try:
            from readmdict import MDX, MDD
        except ImportError:
            logger.error(
                "Warning: readmdict not installed. Dictionary support disabled."
            )
            return

        import pickle
        import time

        mdx_files = []
        for root, dirs, files in os.walk(DICT_BASE_DIR):
            for file in files:
                if file.lower().endswith(".mdx"):
                    mdx_files.append(os.path.join(root, file))

        logger.info(f"Found {len(mdx_files)} MDX dictionary files (legacy mode).")

        for mdx_path in mdx_files:
            try:
                cache_path = mdx_path + ".cache.pkl"
                loaded_from_cache = False

                if os.path.exists(cache_path):
                    mdx_mtime = os.path.getmtime(mdx_path)
                    cache_mtime = os.path.getmtime(cache_path)
                    if cache_mtime > mdx_mtime:
                        logger.info(f"Loading cached dictionary: {cache_path} ...")
                        try:
                            with open(cache_path, "rb") as f:
                                data = pickle.load(f)
                                data["_legacy"] = True
                                self.databases.append(data)
                                logger.info(
                                    f"Loaded {len(data['mdx_cache'])} entries from cache."
                                )
                                loaded_from_cache = True
                        except Exception as e:
                            logger.error(f"Cache load failed ({e}), parsing MDX...")

                if not loaded_from_cache:
                    logger.info(f"Loading MDX: {mdx_path} ...")
                    start_time = time.time()
                    mdx = MDX(mdx_path)

                    base = os.path.splitext(mdx_path)[0]
                    mdd_path = base + ".mdd"
                    mdd = MDD(mdd_path) if os.path.exists(mdd_path) else None

                    mdx_cache = {}
                    for key, value in mdx.items():
                        try:
                            k_str = key.decode("utf-8").strip()
                            mdx_cache[k_str] = value
                        except UnicodeDecodeError:
                            continue

                    mdd_cache = {}
                    if mdd:
                        for key, value in mdd.items():
                            mdd_cache[key] = value

                    rel_path = os.path.relpath(os.path.dirname(mdx_path), DICT_BASE_DIR)
                    rel_path = rel_path.replace("\\", "/")

                    dict_data = {
                        "name": os.path.basename(mdx_path),
                        "mdx_cache": mdx_cache,
                        "mdd_cache": mdd_cache,
                        "subdir": rel_path if rel_path != "." else "",
                        "_legacy": True,
                    }

                    self.databases.append(dict_data)
                    logger.info(
                        f"Loaded {len(mdx_cache)} entries in {time.time() - start_time:.2f}s"
                    )

                    try:
                        with open(cache_path, "wb") as f:
                            pickle.dump(dict_data, f)
                    except Exception:
                        pass

            except Exception as e:
                logger.error(f"Failed to load {mdx_path}: {e}")

    async def get_resource(self, path: str) -> Tuple[Optional[bytes], str]:
        """Get a resource (audio, image, CSS) from dictionary (Async)."""
        # Normalize path
        key = path.replace("/", "\\")
        if not key.startswith("\\"):
            key = "\\" + key

        key_bytes_utf8 = key.encode("utf-8")
        key_bytes_gbk = None
        try:
            key_bytes_gbk = key.encode("gbk")
        except UnicodeEncodeError:
            pass

        for d in self.databases:
            if d.get("_legacy"):
                # Legacy: use mdd_cache dict (Sync is fine, it's just dict lookup)
                cache = d.get("mdd_cache", {})
                content = cache.get(key_bytes_utf8)
                if not content and key_bytes_gbk:
                    content = cache.get(key_bytes_gbk)
            else:
                # SQLite: query resources table (Async)
                conn = d["conn"]
                async with conn.execute(
                    "SELECT content FROM resources WHERE path = ? OR path = ?",
                    (key_bytes_utf8, key_bytes_gbk or key_bytes_utf8),
                ) as cursor:
                    row = await cursor.fetchone()
                    content = row[0] if row else None

            if content:
                media_type, _ = mimetypes.guess_type(path)
                return content, media_type or "application/octet-stream"

        return None, "application/octet-stream"

    async def lookup(self, word: str) -> List[Dict[str, str]]:
        """Look up a word in all dictionaries (Async)."""
        word = word.strip()
        word_lower = word.lower()

        # Check cache first
        cache_key = word_lower
        if cache_key in self._lookup_cache:
            logger.info(f"dict_manager cache HIT for '{word}'")
            return self._lookup_cache[cache_key]

        logger.info(f"dict_manager cache MISS for '{word}'")

        results = []

        for d in self.databases:
            if d.get("_legacy"):
                # Use threadpool for legacy if it gets heavy, but simple dict lookup is fast enough for main thread
                # unless _follow_links does heavy recursion.
                # For consistency, we keep it simple here.
                definition_bytes = self._lookup_legacy(word, d)
            else:
                definition_bytes = await self._lookup_sqlite(
                    word, word_lower, d["conn"]
                )

            if definition_bytes:
                html_content = self._decode_definition(definition_bytes)
                if html_content:
                    # Handle @@@LINK redirects
                    html_content = await self._follow_links(html_content, d)

                    # Process HTML in threadpool to avoid blocking event loop with BeautifulSoup
                    processed_html = await run_in_threadpool(
                        self._process_html, html_content, d["name"], d["subdir"]
                    )

                    results.append(
                        {
                            "dictionary": d["name"],
                            "definition": processed_html,
                            "source_dir": d["subdir"],
                        }
                    )

        # Store in cache (with eviction if too large)
        if len(self._lookup_cache) >= self._cache_max_size:
            # Remove oldest entries (FIFO-ish by clearing half)
            keys_to_remove = list(self._lookup_cache.keys())[
                : self._cache_max_size // 2
            ]
            for k in keys_to_remove:
                del self._lookup_cache[k]
        self._lookup_cache[cache_key] = results

        return results

    async def _lookup_sqlite(
        self, word: str, word_lower: str, conn: aiosqlite.Connection
    ) -> Optional[bytes]:
        """Query SQLite database for word definition (Async)."""
        async with conn.execute(
            "SELECT definition FROM entries WHERE word = ? OR word_lower = ? LIMIT 1",
            (word, word_lower),
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else None

    def _lookup_legacy(self, word: str, d: Dict) -> Optional[bytes]:
        """Query legacy in-memory cache for word definition."""
        cache = d["mdx_cache"]
        for w in [word, word.lower(), word.title(), word.upper()]:
            if w in cache:
                return cache[w]
        return None

    def _decode_definition(self, definition_bytes: bytes) -> Optional[str]:
        """Decode definition bytes to string."""
        try:
            return definition_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            try:
                return definition_bytes.decode("gbk").strip()
            except UnicodeDecodeError:
                return None

    async def _follow_links(self, html_content: str, d: Dict, depth: int = 0) -> str:
        """Follow @@@LINK redirects in definition (Async support)."""
        if depth >= 5 or not html_content.startswith("@@@LINK="):
            return html_content

        target_word = html_content.replace("@@@LINK=", "").strip()
        target_word_lower = target_word.lower()

        if d.get("_legacy"):
            # Try exact match first, then case variations
            target_bytes = d["mdx_cache"].get(target_word)
            if not target_bytes:
                for w in [target_word_lower, target_word.title(), target_word.upper()]:
                    if w in d["mdx_cache"]:
                        target_bytes = d["mdx_cache"][w]
                        break
        else:
            # Query both word and word_lower for case-insensitive matching
            cursor = await d["conn"].execute(
                "SELECT definition FROM entries WHERE word = ? OR word_lower = ? LIMIT 1",
                (target_word, target_word_lower),
            )
            row = await cursor.fetchone()
            target_bytes = row[0] if row else None

        if target_bytes:
            new_content = self._decode_definition(target_bytes)
            if new_content:
                return await self._follow_links(new_content, d, depth + 1)

        return html_content

    def _process_html(self, html_content: str, dict_name: str, subdir: str) -> str:
        """Process HTML content: rewrite asset paths, inject CSS/JS."""
        soup = BeautifulSoup(html_content, "lxml")
        asset_base = f"/dict-assets/{subdir}/" if subdir else "/dict-assets/"

        # Rewrite src attributes
        for tag in soup.find_all(["img", "script", "input", "embed"], src=True):
            src = tag["src"]
            if src.startswith(("http", "https", "data:")):
                continue
            if src.lower().endswith(
                (".jpg", ".jpeg", ".png", ".gif", ".bmp", ".wav", ".mp3", ".spx")
            ):
                tag["src"] = f"/dict/resource?path={src}"
            else:
                clean_src = src.lstrip("/\\")
                tag["src"] = f"{asset_base}{clean_src}"

        # Rewrite href attributes
        for tag in soup.find_all("link", href=True):
            href = tag["href"]
            if href.startswith(("http", "https", "data:", "#", "javascript:")):
                continue
            if href.startswith("sound://"):
                tag["href"] = f"/dict/resource?path={href.replace('sound://', '')}"
                continue
            if href.startswith("entry://"):
                continue
            clean_href = href.lstrip("/\\")
            tag["href"] = f"{asset_base}{clean_href}"

        # Inject Collins-specific assets
        if "Collins" in dict_name and soup.head:
            if not soup.find("link", href=lambda h: h and "colcobuildstyle.css" in h):
                new_css = soup.new_tag(
                    "link", rel="stylesheet", href=f"{asset_base}colcobuildstyle.css"
                )
                soup.head.append(new_css)
            new_js = soup.new_tag(
                "script", src=f"{asset_base}colcobuildoverhaul_switch.js"
            )
            soup.head.append(new_js)

        return str(soup)


# Singleton
dict_manager = DictionaryManager()
