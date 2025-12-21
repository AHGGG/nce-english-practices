"""
Agent Functions for Deepgram Voice Agent

Provides custom function calling support for the Voice Agent.
Functions are executed on the backend when the LLM decides to call them.

Reference: docs/voice/deepgram/examples/common/agent_functions.py
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional, Callable, Awaitable
from bs4 import BeautifulSoup

from app.services.dictionary import dict_manager
from app.services.llm import llm_service
from app.config import settings

logger = logging.getLogger(__name__)


# =============================================================================
# Function Implementations
# =============================================================================

async def end_call(params: Dict[str, Any], websocket=None) -> Dict[str, Any]:
    """
    End the conversation and close the connection.
    
    This function prepares farewell messages to be injected before closing.
    The actual closing is handled by the caller after receiving the response.
    """
    farewell_type = params.get("farewell_type", "general")
    
    # Prepare farewell message based on type
    if farewell_type == "thanks":
        message = "Thank you for practicing with me! Keep up the great work with your English studies. Goodbye!"
    elif farewell_type == "help":
        message = "I'm glad I could help with your English learning! Have a wonderful day!"
    else:  # general
        message = "Goodbye! Good luck with your English practice!"

    # Prepare messages to be sent
    inject_message = {"type": "InjectAgentMessage", "message": message}
    close_message = {"type": "close"}

    return {
        "function_response": {"status": "closing", "message": message},
        "inject_message": inject_message,
        "close_message": close_message,
    }


async def agent_filler(params: Dict[str, Any], websocket=None) -> Dict[str, Any]:
    """
    Provide natural conversational filler before looking up information.
    
    This fills the silence while actual lookup is being performed.
    """
    message_type = params.get("message_type", "general")
    
    # Prepare the result that will be the function call response
    result = {"status": "queued", "message_type": message_type}

    # Prepare the inject message
    if message_type == "lookup":
        inject_message = {
            "type": "InjectAgentMessage",
            "message": "Let me look that up for you...",
        }
    else:
        inject_message = {
            "type": "InjectAgentMessage",
            "message": "One moment please...",
        }

    return {"function_response": result, "inject_message": inject_message}


async def lookup_word(params: Dict[str, Any], websocket=None) -> Dict[str, Any]:
    """
    Look up a word in the dictionary.
    
    Uses the MDX dictionary manager to find definitions.
    Returns a text summary suitable for voice output.
    """
    word = params.get("word", "").strip()
    
    if not word:
        return {"error": "No word provided"}
    
    try:
        # Load dictionaries if not already loaded
        dict_manager.load_dictionaries()
        
        # Look up the word
        results = dict_manager.lookup(word)
        
        logger.info(f"Lookup results for '{word}': {results}")

        if not results:
            return {
                "word": word,
                "found": False,
                "message": f"I couldn't find the word '{word}' in the dictionary."
            }
        
        # Extract plain text from HTML definitions
        definitions = []
        for result in results[:2]:  # Limit to first 2 dictionaries
            html_content = result.get("definition", "")
            dict_name = result.get("dictionary", "Unknown")
            
            # Parse HTML and extract text
            soup = BeautifulSoup(html_content, "html.parser")
            
            # Remove script and style elements
            for element in soup(["script", "style"]):
                element.decompose()
            
            # Get text content
            text = soup.get_text(separator=" ", strip=True)
            
            # Truncate if too long (for voice output)
            if len(text) > 500:
                text = text[:500] + "..."
            
            if text:
                definitions.append({
                    "source": dict_name,
                    "definition": text
                })
        
        if definitions:
            return {
                "word": word,
                "found": True,
                "definitions": definitions,
                "message": f"Found {len(definitions)} definition(s) for '{word}'."
            }
        else:
            return {
                "word": word,
                "found": False,
                "message": f"The dictionary entry for '{word}' is empty or couldn't be parsed."
            }
            
    except Exception as e:
        logger.error(f"Error looking up word '{word}': {e}")
        return {
            "word": word,
            "found": False,
            "error": str(e),
            "message": f"Sorry, I encountered an error looking up '{word}'."
        }


async def get_example_sentences(params: Dict[str, Any], websocket=None) -> Dict[str, Any]:
    """
    Get example sentences for a word or phrase.
    
    Uses the LLM to generate contextual example sentences.
    """
    word = params.get("word", "").strip()
    count = min(max(params.get("count", 3), 1), 5)  # Clamp to 1-5
    
    if not word:
        return {"error": "No word or phrase provided"}
    
    try:
        # Build prompt
        prompt = f"""Generate {count} natural English example sentences using the word or phrase "{word}".

Requirements:
- Each sentence should be clear and grammatically correct
- Use different contexts to show various uses of the word
- Keep sentences concise (under 20 words each)
- Return only the sentences, one per line, numbered

Example format:
1. [sentence]
2. [sentence]

> Don't use markdown in your response
..."""

        # Call LLM
        client = llm_service.sync_client
        if not client:
            return {
                "word": word,
                "examples": [],
                "error": "LLM client not configured"
            }
        
        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a helpful English teacher."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
        )
        
        content = response.choices[0].message.content
        
        # Parse sentences from response
        lines = content.strip().split("\n")
        examples = []
        for line in lines:
            # Remove numbering and clean up
            line = line.strip()
            if line and line[0].isdigit():
                # Remove "1. " or "1) " prefix
                line = line.lstrip("0123456789.)")
                line = line.strip()
            if line:
                examples.append(line)
        
        return {
            "word": word,
            "examples": examples[:count],
            "message": f"Here are {len(examples[:count])} example sentences for '{word}'."
        }
        
    except Exception as e:
        logger.error(f"Error generating examples for '{word}': {e}")
        return {
            "word": word,
            "examples": [],
            "error": str(e),
            "message": f"Sorry, I couldn't generate examples for '{word}'."
        }


# =============================================================================
# Function Definitions (sent to Deepgram API)
# =============================================================================

FUNCTION_DEFINITIONS = [
    {
        "name": "agent_filler",
        "description": """Use this function to provide natural conversational filler before looking up information.
        ALWAYS call this function first with message_type='lookup' when you're about to look up a word or get examples.
        After calling this function, you MUST immediately follow up with the appropriate lookup function.""",
        "parameters": {
            "type": "object",
            "properties": {
                "message_type": {
                    "type": "string",
                    "description": "Type of filler message. Use 'lookup' when about to search, 'general' for other pauses.",
                    "enum": ["lookup", "general"],
                }
            },
            "required": ["message_type"],
        },
    },
    {
        "name": "lookup_word",
        "description": """Look up a word in the dictionary to get its definition.
        Use this when the user asks about the meaning of a word, wants a definition,
        or asks "What does X mean?" or "Define X".
        
        Examples of when to use:
        - "What does 'serendipity' mean?"
        - "Define 'ephemeral'"
        - "Look up the word 'ubiquitous'"
        - "I don't know what 'eloquent' means"
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "word": {
                    "type": "string",
                    "description": "The word to look up in the dictionary.",
                }
            },
            "required": ["word"],
        },
    },
    {
        "name": "get_example_sentences",
        "description": """Generate example sentences showing how to use a word or phrase.
        Use this when the user wants to see the word used in context.
        
        Examples of when to use:
        - "Give me examples of 'nevertheless'"
        - "How do I use 'albeit' in a sentence?"
        - "Show me sentences with 'furthermore'"
        - "Can you use 'benevolent' in a sentence?"
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "word": {
                    "type": "string",
                    "description": "The word or phrase to generate examples for.",
                },
                "count": {
                    "type": "integer",
                    "description": "Number of example sentences to generate (1-5). Default is 3.",
                    "default": 3,
                }
            },
            "required": ["word"],
        },
    },
    {
        "name": "end_call",
        "description": """End the conversation and close the connection. Call this function when:
        - User says goodbye, thank you, etc.
        - User indicates they're done ("that's all I need", "I'm all set", etc.)
        - User wants to end the conversation
        
        Examples of triggers:
        - "Thank you, bye!"
        - "That's all I needed, thanks"
        - "Have a good day"
        - "Goodbye"
        - "I'm done"
        
        Do NOT call this function if the user is just saying thanks but continuing the conversation.""",
        "parameters": {
            "type": "object",
            "properties": {
                "farewell_type": {
                    "type": "string",
                    "description": "Type of farewell to use in response.",
                    "enum": ["thanks", "general", "help"],
                }
            },
            "required": ["farewell_type"],
        },
    },
]


# =============================================================================
# Function Registry
# =============================================================================

# Map function names to their implementations
FUNCTION_MAP: Dict[str, Callable[[Dict[str, Any], Optional[Any]], Awaitable[Dict[str, Any]]]] = {
    "end_call": end_call,
    "agent_filler": agent_filler,
    "lookup_word": lookup_word,
    "get_example_sentences": get_example_sentences,
}

# Functions that need special handling (injection messages)
SPECIAL_FUNCTIONS = {"end_call", "agent_filler"}


def get_function_definitions() -> list:
    """Get the list of function definitions for the Deepgram API."""
    return FUNCTION_DEFINITIONS


def get_function(name: str) -> Optional[Callable]:
    """Get a function implementation by name."""
    return FUNCTION_MAP.get(name)


def is_special_function(name: str) -> bool:
    """Check if a function requires special handling."""
    return name in SPECIAL_FUNCTIONS
