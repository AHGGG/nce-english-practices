import os
import mimetypes
from readmdict import MDX, MDD
from typing import Optional, Tuple
from bs4 import BeautifulSoup

# Global path configuration
DICT_BASE_DIR = r"resources/dictionaries"

class DictionaryManager:
    def __init__(self):
        # List of dict objects: [{'name': '...', 'mdx': ..., 'mdd': ..., 'subdir': '...'}]
        # BUT for performance with limited memory, we might want to be careful.
        # User has enough RAM for 2 dictionaries.
        # We also need a combined cache or iterate through list. 
        # Iterating through list is safer for conflict resolution (first come first serve).
        self.dictionaries = []
        self.loaded = False

    def load_dictionaries(self):
        """
        Scans DICT_BASE_DIR recursively for .mdx files and loads them.
        """
        if self.loaded:
            return

        if not os.path.exists(DICT_BASE_DIR):
            print(f"Warning: Dictionary directory not found: {DICT_BASE_DIR}")
            return
        
        # 1. Find all MDX files
        mdx_files = []
        for root, dirs, files in os.walk(DICT_BASE_DIR):
            for file in files:
                if file.lower().endswith('.mdx'):
                    mdx_files.append(os.path.join(root, file))
        
        print(f"Found {len(mdx_files)} dictionary files.")

        for mdx_path in mdx_files:
            try:
                print(f"Loading MDX: {mdx_path} ...")
                mdx = MDX(mdx_path)
                
                # Associated MDD? (Same basename, .mdd extension)
                base = os.path.splitext(mdx_path)[0]
                mdd_path = base + ".mdd"
                mdd = None
                if os.path.exists(mdd_path):
                    print(f"Loading MDD: {mdd_path} ...")
                    mdd = MDD(mdd_path)
                
                # Build detailed cache for this dictionary
                mdx_cache = {}
                count = 0
                for key, value in mdx.items():
                    try:
                        k_str = key.decode('utf-8').strip()
                        mdx_cache[k_str] = value
                        count += 1
                    except:
                        continue
                
                mdd_cache = {}
                if mdd:
                    m_count = 0
                    for key, value in mdd.items():
                        mdd_cache[key] = value
                        m_count += 1
                    print(f"Loaded {m_count} resources.")

                # Calculate relative subdir for static assets logic if needed
                # e.g. "Collins V2.30"
                rel_path = os.path.relpath(os.path.dirname(mdx_path), DICT_BASE_DIR)
                
                self.dictionaries.append({
                    "name": os.path.basename(mdx_path),
                    "mdx_cache": mdx_cache,
                    "mdd_cache": mdd_cache,
                    "subdir": rel_path if rel_path != "." else ""
                })
                print(f"Loaded {count} entries from {os.path.basename(mdx_path)}")

            except Exception as e:
                print(f"Failed to load {mdx_path}: {e}")

        self.loaded = True
        print(f"Total dictionaries loaded: {len(self.dictionaries)}")

    def get_resource(self, path: str) -> Tuple[Optional[bytes], str]:
        """
        Iterates all loaded dictionaries to find the resource.
        """
        # Normalize path
        key = path.replace("/", "\\")
        if not key.startswith("\\"):
            key = "\\" + key
            
        key_bytes_utf8 = key.encode('utf-8')
        key_bytes_gbk = None 
        try:
            key_bytes_gbk = key.encode('gbk')
        except:
            pass

        for d in self.dictionaries:
            cache = d['mdd_cache']
            if not cache:
                continue
            
            content = cache.get(key_bytes_utf8)
            if not content and key_bytes_gbk:
                content = cache.get(key_bytes_gbk)
            
import os
import mimetypes
from readmdict import MDX, MDD
from typing import Optional, Tuple, List, Dict
from bs4 import BeautifulSoup
import pickle
import time


# Global path configuration
DICT_BASE_DIR = r"resources/dictionaries"

class DictionaryManager:
    def __init__(self):
        # List of dict objects: [{'name': '...', 'mdx': ..., 'mdd': ..., 'subdir': '...'}]
        # BUT for performance with limited memory, we might want to be careful.
        # User has enough RAM for 2 dictionaries.
        # We also need a combined cache or iterate through list. 
        # Iterating through list is safer for conflict resolution (first come first serve).
        self.dictionaries = []
        self.loaded = False

    def load_dictionaries(self):
        """
        Scans DICT_BASE_DIR recursively for .mdx files and loads them.
        """
        if self.loaded:
            return

        if not os.path.exists(DICT_BASE_DIR):
            print(f"Warning: Dictionary directory not found: {DICT_BASE_DIR}")
            return
        
        # 1. Find all MDX files
        mdx_files = []
        for root, dirs, files in os.walk(DICT_BASE_DIR):
            for file in files:
                if file.lower().endswith('.mdx'):
                    mdx_files.append(os.path.join(root, file))
        
        print(f"Found {len(mdx_files)} dictionary files.")

        for mdx_path in mdx_files:
            try:
                # Check for Cache
                cache_path = mdx_path + ".cache.pkl"
                loaded_from_cache = False
                
                if os.path.exists(cache_path):
                    mdx_mtime = os.path.getmtime(mdx_path)
                    cache_mtime = os.path.getmtime(cache_path)
                    if cache_mtime > mdx_mtime:
                        print(f"Loading cached dictionary: {cache_path} ...")
                        try:
                            with open(cache_path, "rb") as f:
                                data = pickle.load(f)
                                self.dictionaries.append(data)
                                print(f"Loaded {len(data['mdx_cache'])} entries from cache.")
                                loaded_from_cache = True
                        except Exception as e:
                            print(f"Cache load failed ({e}), falling back to MDX parsing.")

                if not loaded_from_cache:
                    print(f"Loading MDX: {mdx_path} ...")
                    start_time = time.time()
                    mdx = MDX(mdx_path)
                    
                    # Associated MDD? (Same basename, .mdd extension)
                    base = os.path.splitext(mdx_path)[0]
                    mdd_path = base + ".mdd"
                    mdd = None
                    if os.path.exists(mdd_path):
                        print(f"Loading MDD: {mdd_path} ...")
                        mdd = MDD(mdd_path)
                    
                    # Build detailed cache for this dictionary
                    mdx_cache = {}
                    count = 0
                    for key, value in mdx.items():
                        try:
                            k_str = key.decode('utf-8').strip()
                            mdx_cache[k_str] = value
                            count += 1
                        except:
                            continue
                    
                    mdd_cache = {}
                    if mdd:
                        m_count = 0
                        for key, value in mdd.items():
                            mdd_cache[key] = value
                            m_count += 1
                        print(f"Loaded {m_count} resources.")

                    # Calculate relative subdir for static assets logic if needed
                    # e.g. "Collins V2.30"
                    rel_path = os.path.relpath(os.path.dirname(mdx_path), DICT_BASE_DIR)
                    rel_path = rel_path.replace("\\", "/") 
                    
                    dict_data = {
                        "name": os.path.basename(mdx_path),
                        "mdx_cache": mdx_cache,
                        "mdd_cache": mdd_cache,
                        "subdir": rel_path if rel_path != "." else ""
                    }
                    
                    self.dictionaries.append(dict_data)
                    print(f"Loaded {count} entries from {os.path.basename(mdx_path)} in {time.time() - start_time:.2f}s")
                    
                    # Save Cache
                    try:
                        print(f"Saving cache to {cache_path} ...")
                        with open(cache_path, "wb") as f:
                            pickle.dump(dict_data, f)
                        print("Cache saved.")
                    except Exception as e:
                        print(f"Failed to save cache: {e}")

            except Exception as e:
                print(f"Failed to load {mdx_path}: {e}")

        self.loaded = True
        print(f"Total dictionaries loaded: {len(self.dictionaries)}")

    def get_resource(self, path: str) -> Tuple[Optional[bytes], str]:
        """
        Iterates all loaded dictionaries to find the resource.
        """
        # Normalize path
        key = path.replace("/", "\\")
        if not key.startswith("\\"):
            key = "\\" + key
            
        key_bytes_utf8 = key.encode('utf-8')
        key_bytes_gbk = None 
        try:
            key_bytes_gbk = key.encode('gbk')
        except:
            pass

        for d in self.dictionaries:
            cache = d['mdd_cache']
            if not cache:
                continue
            
            content = cache.get(key_bytes_utf8)
            if not content and key_bytes_gbk:
                content = cache.get(key_bytes_gbk)
            
            if content:
                media_type, _ = mimetypes.guess_type(path)
                return content, media_type or "application/octet-stream"
        
        return None, "application/octet-stream"

    def lookup(self, word: str) -> List[Dict[str, str]]:
        """
        Iterates all dictionaries to find the word. Returns list of matches.
        """
        word = word.strip()
        word_variations = [word, word.lower(), word.title(), word.upper()]
        
        results = []

        for d in self.dictionaries:
            cache = d['mdx_cache']
            
            definition_bytes = None
            found_word = None
            
            # Simple lookup
            for w in word_variations:
                if w in cache:
                    definition_bytes = cache[w]
                    found_word = w
                    break
            
            if definition_bytes:
                # Decode
                try:
                    html_content = definition_bytes.decode('utf-8')
                except:
                    try:
                        html_content = definition_bytes.decode('gbk')
                    except:
                        continue # Skip if decode fails
                
                html_content = html_content.strip()

                # Handle Link (Redirect)
                # Format: @@@LINK=target_word
                # We follow up to 5 redirects to avoid infinite loops
                redirect_depth = 0
                while html_content.startswith("@@@LINK=") and redirect_depth < 5:
                    target_word = html_content.replace("@@@LINK=", "").strip()
                    # print(f"DEBUG: Redirecting {word} -> {target_word}")
                    
                    # Look up the target word in THE SAME dictionary first 
                    # (Standard MDX behavior: links are usually internal)
                    target_bytes = cache.get(target_word)
                    if not target_bytes:
                        # Try variations of the target word?
                        # MDX specs says strict match for link, but let's be safe
                        pass
                    
                    if target_bytes:
                        try:
                            # Decode new content
                            try:
                                html_content = target_bytes.decode('utf-8')
                            except:
                                html_content = target_bytes.decode('gbk')
                        except:
                            break
                        
                        html_content = html_content.strip()
                        redirect_depth += 1
                    else:
                        # Broken link or link to another dictionary (not supported yet)
                        break

                processed_html = self._process_html(html_content, d['name'], d['subdir'])
                results.append({
                    "dictionary": d['name'],
                    "definition": processed_html,
                    "source_dir": d['subdir']
                })

        return results

    def _process_html(self, html_content: str, dict_name: str, subdir: str) -> str:
        soup = BeautifulSoup(html_content, "html.parser")

        # Helper to get asset base path
        # If subdir is empty (root), it's /dict-assets/
        # If subdir is "Collins", it's /dict-assets/Collins/
        asset_base = f"/dict-assets/{subdir}/" if subdir else "/dict-assets/"

        # 1. Rewrite src attributes (IMAGES/SCRIPTS)
        for tag in soup.find_all(['img', 'script', 'input', 'embed'], src=True):
            src = tag['src']
            
            # Skip externals
            if src.startswith(('http', 'https', 'data:')):
                continue

            # Standard MDD Tunnel for media
            if src.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.wav', '.mp3', '.spx')):
                tag['src'] = f"/dict/resource?path={src}"
            else:
                # scripts, etc. -> Rewrite to absolute proxy path
                # Clean up leading slashes
                clean_src = src.lstrip('/\\')
                tag['src'] = f"{asset_base}{clean_src}"
        
        # 2. Rewrite href attributes (LINKS/CSS)
        for tag in soup.find_all('link', href=True):
            href = tag['href']
            
            if href.startswith(('http', 'https', 'data:', '#', 'javascript:')):
                continue

            if href.startswith('sound://'):
                 clean_path = href.replace('sound://', '')
                 tag['href'] = f"/dict/resource?path={clean_path}"
                 continue
            
            if href.startswith('entry://'):
                continue 

            # CSS Files -> Rewrite to absolute proxy path
            if href.lower().endswith('.css'):
                clean_href = href.lstrip('/\\')
                tag['href'] = f"{asset_base}{clean_href}"
            else:
                # Other assets? Map to asset base just in case
                clean_href = href.lstrip('/\\')
                tag['href'] = f"{asset_base}{clean_href}"

        # 3. Inject CSS/JS for Collins (if applicable)
        if "Collins" in dict_name:
            if soup.head:
                has_css = soup.find('link', href=lambda h: h and 'colcobuildstyle.css' in h)
                if not has_css:
                     # Inject using absolute proxy path
                     new_css = soup.new_tag("link", rel="stylesheet", href=f"{asset_base}colcobuildstyle.css")
                     soup.head.append(new_css)
                
                # INJECT JS using absolute proxy path
                new_js = soup.new_tag("script", src=f"{asset_base}colcobuildoverhaul_switch.js")
                soup.head.append(new_js)

        return str(soup)

# Singleton
dict_manager = DictionaryManager()
