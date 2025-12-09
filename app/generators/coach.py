from app.config import MODEL_NAME

POLISH_SYSTEM_PROMPT = """You are a native English coach. 
Your task is to Suggest a more natural, idiomatic, or grammatically correct way to say the user's sentence, GIVEN the context of the conversation.
If the sentence is already perfect, just return it as is.
Output ONLY the suggested sentence. Do not add quotes or explanations.
"""

async def polish_sentence(client, user_sentence: str, context_messages: list) -> str:
    """
    Polishes a user sentence based on context.
    """
    if not client:
        return "Error: AI Client unavailable."

    # Prepare messages
    # Context format: [{"role": "user/assistant", "content": "..."}]
    # We might want to limit context size
    
    messages = [{"role": "system", "content": POLISH_SYSTEM_PROMPT}]
    
    # Add recent context (last 4 messages)
    # Add recent context (last 4 messages)
    if context_messages:
        # Sanitize roles: 'ai' -> 'assistant'
        sanitized_context = []
        for msg in context_messages[-4:]:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role == 'ai':
                role = 'assistant'
            # Filter out system messages or unknown roles if strictly needed, 
            # but usually just mapping ai->assistant is enough for this app.
            if role in ['user', 'assistant', 'system']:
                sanitized_context.append({"role": role, "content": content})
        
        messages.extend(sanitized_context)
    
    # Add the target sentence
    messages.append({"role": "user", "content": f"Polish this: {user_sentence}"})
    
    try:
        rsp = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3
        )
        return rsp.choices[0].message.content.strip()
    except Exception as e:
        return f"Error: {e}"
