# Common Pitfalls

## Testing Issues

### Global Run Conflict

Running `uv run pytest tests` fails because `pytest-playwright` (Sync) and `httpx`/`asyncpg` (Async) require conflicting Event Loop policies on Windows (Selector vs Proactor).

**Solution**: We removed most Playwright E2E tests to simplify this. For remaining synchronous tests, run them separately if needed.

### Backend RuntimeError

`asyncio.run()` loops conflict with `pytest-asyncio` loops.

**Fix**: Tests require `nest_asyncio.apply()` on Windows. (This is handled in `tests/conftest.py`).

### Database Connection

- **Tests**: Require PostgreSQL running on `localhost:5432` with `nce_practice_test` database
- **Fixture**: `conftest.py` drops/creates all tables per test function for isolation
- **Override**: Test fixtures override `get_db()` dependency to inject test session

## Database Issues

### Alembic NotNullViolationError

Adding a non-nullable column to an existing table fails without a default value.

**Fix**: Always add `server_default='...'` to `op.add_column` for non-nullable columns in migration scripts.

## API/Frontend Issues

### Contract Mismatch

Frontend components may silently fail to render if API response keys don't match exactly what props expect.

**Fix**: Double-check Pydantic schemas or dict keys in backend against React component usage. (e.g., `total_reviews` vs `total_words_analyzed`)

## Tailwind/CSS Issues

### CSS Variable Opacity

Using `bg-color/50` with CSS variables defined as Hex codes (e.g., `--color: #ff0000`) fails silently.

**Fix**: Define CSS variables as RGB triplets (e.g., `--color: 255 0 0`) and use `rgb(var(--color) / <alpha-value>)` in `tailwind.config.js`.

### Color Token Consistency

When adding new UI components, avoid using raw Tailwind colors (e.g., `text-white`, `bg-green-500`) or undefined tokens (e.g., `category-green` when only `category-blue` is defined).

**Fix**: Always check `tailwind.config.js` to verify the color token exists before using it. Use semantic tokens from the design system (e.g., `text-text-primary`, `bg-accent-success`, `bg-category-blue`).

### Available Category Colors

- `orange`, `blue`, `amber`, `red`, `gray`, `indigo`, `yellow`
- **NO `green`** - use `accent-success` instead

## Mobile NativeWind Issues

### Alpha Syntax

`bg-black/50`, `bg-accent-primary/20` do NOT work on NativeWind.

**Fix**: Use inline styles: `style={{ backgroundColor: "rgba(0,0,0,0.5)" }}`

**Ref**: [Mobile Dev Pitfalls Skill](docs/skills/mobile-dev-pitfalls.md)

### Conditional ClassName

`className={isActive ? "text-green" : "text-gray"}` triggers warnings.

**Fix**: Use explicit styles or separate render logic.

### Authenticated Fetch in PWA/Offline Utils

Native `fetch()` does not include JWT tokens.

**Fix**: Always pass `authFetch` (from `api/auth.js`) or manually add `Authorization` headers when making requests from utility functions like `downloadEpisodeForOffline`.

## Podcast Issues

### Redirects & Content-Length

CDNs (like Megaphone) redirect audio requests, and `httpx` follows redirects by default only for some methods or needs explicit config. Also, `Content-Length` is needed for progress bars.

**Fix**: Use `client.stream('GET', ..., follow_redirects=True)` in backend proxy. Perform a `HEAD` request first to get `Content-Length` if the stream response lacks it.

### RSS Episode Limits

iTunes Search API returns historical total counts (e.g., 100+), but many RSS feeds only provide the most recent episodes (e.g., 4) to save bandwidth. This is NOT a bug.

**Fix**: UI should differentiate between "Total Episodes" (iTunes) and "Available Episodes" (RSS), or provide a tooltip explanation.

## Production Network & Proxy

### SOCKS5 Proxy Support

Standard `httpx` does not support SOCKS5.

**Fix**: Must install `httpx[socks]` dependency.

**Configuration**: Use `PROXY_URL` env var (e.g., `socks5://172.17.0.1:7890`).

### SSL Issues with RSS Feeds

Many older podcast servers have expired/incomplete certificate chains that fail in strict production environments (Linux/Docker) but pass on local dev (Mac/Windows).

**Fix**: Implement an auto-retry mechanism: Try standard SSL first; if it fails, catch `httpx.ConnectError/SSLError` and retry with `verify=False`.

### User-Agent Blocking

CDNs (Cloudflare) often block default Python User-Agents.

**Fix**: Always set a full Browser User-Agent header (e.g., Chrome/123.0) for RSS fetches.

### Proxy Architecture (Sidecar Pattern)

Do NOT embed VLESS/Shadowsocks clients into the application container.

**Best Practice**: Run the proxy client (Xray/Clash) as a separate "Sidecar" container or standalone service on the host. The application should only know about the standard HTTP/SOCKS interface.

**Ref**: [Setup Proxy Client Skill](docs/skills/setup-proxy-client.md)

## Docker Dependency Management

### uv.lock vs pyproject.toml

During rapid dev, `uv.lock` might lag behind `pyproject.toml`.

**Pitfall**: Using `uv sync --frozen` in Dockerfile causes build failures if lockfile is stale.

**Fix**: Remove `--frozen` in Dockerfile unless you have a strict CI process to ensure lockfile currency.

## MDX Resource Paths

- **MDD Keys**: Often use Windows-style paths (`\image.png`) or just filenames
- **Lookup Priority**: Check filesystem first, then MDD cache, then basename fallback
- **Rewriting**: All `src`, `href` attributes in HTML are rewritten to absolute `/dict-assets/` URLs
- **Parsing Robustness**: Some LDOCE entries (like 'palestinian') lack standard `<en>` tags within definitions. The parser implements a fallback to read direct text nodes while excluding `<tran>` tags

## EPUB Sentence Extraction

### Consistency Rule

Always use **Block-Based Extraction** (sentences from `ContentBlock` paragraphs) for counting.

**Do NOT** use `_split_sentences_lenient(full_text)` for logic or status checks, as it often produces different counts than the structured content used in the UI.

### Caching

Use `article.get("block_sentence_count")` which is pre-computed during EPUB loading to avoid O(N) HTML parsing in list endpoints.

## EPUB Provider Caching (Crucial Performance)

### Module-Level Caching

`EpubProvider` uses a module-level `_epub_cache` (Singleton pattern) to store parsed `EpubBook` data.

### Instance-Level Fallacy

Do NOT rely on `self._cached_articles` in a fresh `EpubProvider()` instance without checking the module cache. FastAPI creates a new provider instance for every request.

**Strategy**: The `_load_epub` method automatically checks middleware cache before parsing.
