import asyncio
import httpx
import os
import sys
from sqlalchemy import select

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.db import AsyncSessionLocal
from app.models.orm import WordBook, WordBookEntry

# Sources
SOURCES = [
    {
        "code": "coca20000",
        "name": "COCA 20000",
        "url": "https://raw.githubusercontent.com/hao-lee/VocabularyAnalyzer-OpenShift/master/coca-20000.txt",
        "type": "txt",
        "description": "Corpus of Contemporary American English (20k most frequent words)",
    },
    {
        "code": "cet4",
        "name": "CET-4 Core",
        "url": "https://raw.githubusercontent.com/mahavivo/english-wordlists/master/CET4_edited.txt",
        "type": "txt",
        "description": "College English Test Band 4 Vocabulary",
    },
    {
        "code": "cet6",
        "name": "CET-6 Core",
        "url": "https://raw.githubusercontent.com/mahavivo/english-wordlists/master/CET6_edited.txt",
        "type": "txt",
        "description": "College English Test Band 6 Vocabulary",
    },
]


async def seed_lists():
    async with AsyncSessionLocal() as session:
        client = httpx.AsyncClient(verify=False)  # Skip SSL verify if needed

        for source in SOURCES:
            print(f"Processing {source['name']}...")

            # 1. Create/Get Book
            stmt = select(WordBook).where(WordBook.code == source["code"])
            result = await session.execute(stmt)
            book = result.scalars().first()

            if not book:
                book = WordBook(
                    code=source["code"],
                    name=source["name"],
                    description=source["description"],
                )
                session.add(book)
                await session.flush()
                print(f"Created book: {book.name}")
            else:
                print(f"Book exists: {book.name}")

            # 2. Check if entries exist
            count_res = await session.execute(
                select(WordBookEntry).where(WordBookEntry.book_id == book.id).limit(1)
            )
            if count_res.scalars().first():
                print("  Entries already exist, skipping download.")
                continue

            # 3. Download and Parse
            try:
                print(f"  Downloading from {source['url']}...")
                resp = await client.get(source["url"])
                resp.raise_for_status()

                words = []
                if source["type"] == "txt":
                    text = resp.text
                    lines = text.splitlines()
                    for line in lines:
                        # Split by potential delimiters (tab, double space) or just take line
                        # COCA was just words?
                        # CET4 might be "word translation"
                        parts = line.split(None, 1)  # Split on whitespace
                        if parts:
                            w = parts[0].strip()
                            # Basic cleanup
                            if w and not w.isdigit():
                                words.append(w)

                elif source["type"] == "json_list":
                    words = resp.json()

                # 4. Insert Entries
                print(f"  Inserting {len(words)} entries...")
                batch_size = 1000
                total_inserted = 0

                # Prepare objects
                entries_to_add = []
                for i, w in enumerate(words):
                    entries_to_add.append(
                        WordBookEntry(book_id=book.id, word=w.strip(), sequence=i + 1)
                    )

                    if len(entries_to_add) >= batch_size:
                        session.add_all(entries_to_add)
                        await session.flush()
                        total_inserted += len(entries_to_add)
                        entries_to_add = []
                        print(f"  Progress: {total_inserted}/{len(words)}")

                if entries_to_add:
                    session.add_all(entries_to_add)
                    await session.flush()

                await session.commit()
                print(f"  Done! {len(words)} words added.")

            except Exception as e:
                print(f"  Error processing {source['name']}: {e}")
                # Don't rollback immediately if we want to continue to next book?
                # But here we are in one loop.
                # Create a nested transaction or just continue?
                # A rollback here rolls back the WHOLE session if not careful.
                # Actually AsyncSessionLocal implies one transaction.
                # Since we commit per book for success, if one fails we should rollback changes for THAT book.
                # But we committed success ones. uncommitted ones are from failed book.
                await session.rollback()

        await client.aclose()


if __name__ == "__main__":
    asyncio.run(seed_lists())
