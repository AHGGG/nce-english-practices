# SQLite Dictionary Index Design

## Problem

Application OOMs on 2GB VPS because `DictionaryManager` loads all MDX dictionaries (~5GB) into RAM.

## Requirements

- Dictionary is a **core feature** - must be preserved
- 2 dictionaries, each 2-3GB (~5GB total)
- Used for both word lookup and reading assistance
- MDD resources (audio, images, CSS) are needed

## Solution: SQLite Indexing

### Architecture

```
Current:  MDX/MDD → Load all to memory (dict) → OOM

New:      MDX/MDD → Convert once → SQLite database
                                        ↓
                                   Query on-demand (mmap)
                                        ↓
                                   Memory: ~10-50MB
```

### Database Structure

Each dictionary gets its own SQLite file:

```
resources/dictionaries/
├── Collins/
│   ├── Collins.mdx       # Original (optional to keep)
│   ├── Collins.mdd
│   └── Collins.db        # New: SQLite database
├── Oxford/
│   └── Oxford.db
```

**Tables:**

```sql
CREATE TABLE entries (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL,
    word_lower TEXT NOT NULL,
    definition BLOB NOT NULL
);
CREATE INDEX idx_word ON entries(word);
CREATE INDEX idx_word_lower ON entries(word_lower);

CREATE TABLE resources (
    path TEXT PRIMARY KEY,
    content BLOB NOT NULL
);
```

### Implementation

#### 1. Conversion Script

New file: `scripts/convert_mdx_to_sqlite.py`

- Reads MDX/MDD files
- Creates SQLite database with entries and resources tables
- Batch inserts for performance (10,000 rows per batch)
- Run locally, upload `.db` files to server

#### 2. DictionaryManager Changes

Modify: `app/services/dictionary.py`

- On startup: Open SQLite connections only (no data loaded)
- On lookup: Query database, return results
- Use `PRAGMA mmap_size` for efficient memory usage
- Use `PRAGMA cache_size = -2000` to limit cache to 2MB

```python
def load_dictionaries(self):
    for db_path in find_db_files():
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.execute("PRAGMA cache_size = -2000")
        conn.execute("PRAGMA mmap_size = 268435456")
        self.databases.append({'conn': conn, ...})

def lookup(self, word: str):
    for db in self.databases:
        cursor = db['conn'].execute(
            "SELECT definition FROM entries WHERE word = ? OR word_lower = ?",
            (word, word.lower())
        )
        # Process results...
```

### Migration Strategy

1. New code checks for `.db` files first
2. Falls back to old MDX loading if `.db` not found
3. Gradual migration - convert dictionaries one by one

### Expected Memory Usage

| Component | Current | After Optimization |
|-----------|---------|-------------------|
| Dictionary | 2-3GB | ~50MB |
| Application | ~200MB | ~200MB |
| Postgres | ~100MB | ~100MB |
| **Total** | 2.5GB+ (OOM) | ~400MB ✓ |

## Verification Plan

1. Convert one dictionary locally → verify `.db` creation
2. Run unit tests → `lookup()` returns same results
3. Deploy to VPS → `docker stats` confirms memory < 200MB
4. Manual test: dictionary lookup and resource loading
