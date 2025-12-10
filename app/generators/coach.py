from app.config import MODEL_NAME
from app.services.llm import llm_service
from app.services.prompt_manager import prompt_manager

async def polish_sentence(user_sentence: str, context_messages: list) -> str:
    """
    Polishes a user sentence based on context.
    """
    if not llm_service.async_client:
        return "Error: AI Client unavailable."

    # Format Prompt
    # Note: The new prompt template expects {sentence} and {context} as string in user_template.
    # But here we are passing context as 'messages' list to the API directly.
    # Strategy: We use the system prompt from config, and append the user prompt.

    system_prompt = prompt_manager.get("coach.polish.system")
    
    # We will serialize context for the "user_template" OR keep using the message history approach.
    # The config template approach:
    # user_template: "Polish this: {sentence}\nContext: {context}"
    
    # Let's try to serialize context for the prompt to match the template.
    # OR we can just use the system prompt and keep the "Chat history" structure if preferred.
    # But adhering to the template is cleaner for "External Prompts".

    context_str = ""
    if context_messages:
        for msg in context_messages[-4:]:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            context_str += f"{role}: {content}\n"

    user_prompt = prompt_manager.format("coach.polish.user_template",
                                        sentence=user_sentence,
                                        context=context_str)
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]
    
    try:
        content = await llm_service.chat_complete(messages=messages, temperature=0.3)
        return content
    except Exception as e:
        return f"Error: {e}"
