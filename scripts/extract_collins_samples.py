"""
Quick script to save Collins HTML sample for analysis
"""

import pickle

print("Loading cache (this may take a while)...")
data = pickle.load(
    open(
        r"resources/dictionaries/Collins V2.30/CollinsCOBUILDOverhaul V 2-30.mdx.cache.pkl",
        "rb",
    )
)
print(f"Loaded {len(data['mdx_cache'])} entries")

# Get a few sample words
words = ["simmer", "run", "work", "hello", "beautiful"]

for word in words:
    html = data["mdx_cache"].get(word, b"")
    if html:
        try:
            content = html.decode("utf-8")
        except:
            content = html.decode("gbk", errors="replace")

        with open(f"tests/fixtures/collins_{word}.html", "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Saved: collins_{word}.html ({len(content)} chars)")
    else:
        print(f"Not found: {word}")

print("Done!")
