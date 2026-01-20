
import asyncio
import os
import sys
import logging
from bs4 import BeautifulSoup

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.dictionary import dict_manager
from app.services.collins_parser import collins_parser
from app.services.ldoce_parser import ldoce_parser

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_collins_unequivocal():
    logger.info("--- Checking Collins: unequivocal ---")
    dict_manager.load_dictionaries()
    
    # manually find the collins dictionary to query raw HTML if needed
    results = dict_manager.lookup("unequivocal")
    
    collins_found_count = 0
    for r in results:
        if "Collins" in r["dictionary"]:
            collins_found_count += 1
            logger.info(f"Checking Collins entry #{collins_found_count}...")
            html = r["definition"]
             # Parse
            parsed = collins_parser.parse(html, "unequivocal")
            
            if parsed.found:
                logger.info(f"  Parsed successfully! Senses: {len(parsed.entry.senses)}")
                for i, sense in enumerate(parsed.entry.senses):
                   logger.info(f"  Sense {i+1}: {sense.definition}")
            else:
                logger.error("  Failed to parse this entry.")
                soup = BeautifulSoup(html, "lxml")
                word_entry = soup.select_one(".word_entry")
                if not word_entry:
                    logger.warning("  No .word_entry found.")
    
    if collins_found_count == 0:
        logger.error("No Collins dictionary entries found for 'unequivocal'.")
    else:
        return # Skip single logic below

    # Old logic removed in favor of loop above
    return

def check_ldoce_epicentre():
    logger.info("--- Checking LDOCE: epicentre ---")
    dict_manager.load_dictionaries()
    
    results = dict_manager.lookup("epicentre")
    ldoce_result = None
    for r in results:
        if "LDOCE" in r["dictionary"] or "Longman" in r["dictionary"]:
            ldoce_result = r
            break
            
    if not ldoce_result:
        logger.error("LDOCE dictionary not found or 'epicentre' not in it.")
        return

    html = ldoce_result["definition"]
    
    # Parse
    parsed = ldoce_parser.parse(html, "epicentre")
    
    if parsed.found:
        logger.info("Parsed successfully!")
        for entry in parsed.entries:
            logger.info(f"Entry POS: {entry.part_of_speech}")
            for sense in entry.senses:
                for ex in sense.examples:
                    logger.info(f"Example: '{ex.text}'")
    else:
        logger.error("Failed to parse 'epicentre'.")

if __name__ == "__main__":
    check_collins_unequivocal()
    check_ldoce_epicentre()
