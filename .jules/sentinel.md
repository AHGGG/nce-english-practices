## 2024-05-22 - Path Traversal Vulnerability
**Vulnerability:** Found a potential path traversal vulnerability in `app/api/routers/dictionary.py`. The endpoint `get_dict_asset` uses `os.path.join` without checking if the resulting path is within the intended directory.
**Learning:** Even when using frameworks like FastAPI, file system operations on user input must be carefully validated. Path traversal allows attackers to read arbitrary files.
**Prevention:** Use `os.path.commonpath` to ensure the resolved path is inside the base directory.
