import json
from app.config import MODEL_NAME
from app.database import create_chat_session, get_chat_session, update_chat_history
from app.services.llm import llm_service
from app.services.prompt_manager import prompt_manager

async def start_new_mission(topic: str, tense: str, aspect: str) -> dict:
    if not llm_service.async_client:
        raise RuntimeError("LLM client unavailable")

    prompt = prompt_manager.format("chat.mission_generation", topic=topic, tense=tense, aspect=aspect)
    
    messages = [
        {"role": "system", "content": "You create roleplay missions."},
        {"role": "user", "content": prompt}
    ]

    try:
        content = await llm_service.chat_complete(messages=messages, temperature=0.8)
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        
        data = json.loads(content.strip())
        
        # Initial AI message to start the scene
        start_msg = await generate_ai_reply(data['description'], data['required_grammar'], [])
        
        initial_history = [
            {"role": "assistant", "content": start_msg}
        ]
        
        # PERSISTENCE: Create Session in DB
        session_id = await create_chat_session(data, initial_history)
        
        return {
            "session_id": session_id,
            "mission": data,
            "first_message": start_msg
        }

    except Exception as e:
        print(f"Mission Gen Error: {e}")
        # Fallback
        return {
            "session_id": "error",
            "mission": {
                "title": "Free Chat", 
                "description": "Just chat with the AI.", 
                "required_grammar": []
            },
            "first_message": "Hello! Let's practice."
        }

async def handle_chat_turn(session_id: str, user_message: str) -> dict:
    # PERSISTENCE: Load Session from DB
    session_data = await get_chat_session(session_id)
    
    if not session_data:
        return {"error": "Session not found", "reply": "Session expired or not found."}
    
    mission = session_data['mission']
    history = session_data['history']
    
    # Update history
    history.append({"role": "user", "content": user_message})
    
    # Generate Reply
    reply = await generate_ai_reply(
        mission['description'], 
        json.dumps(mission['required_grammar']), 
        history
    )
    
    history.append({"role": "assistant", "content": reply})
    
    # PERSISTENCE: Update Session in DB
    await update_chat_history(session_id, history)
        
    return {
        "reply": reply,
        "history": history
    }

async def generate_ai_reply(description, grammar, history):
    # Use formatted prompt from YAML
    sys_prompt = prompt_manager.format("chat.system", description=description, grammar=grammar)
    
    # Limit context window for LLM to avoid tokens limit
    context_window = history[-10:] if len(history) > 10 else history
    
    messages = [{"role": "system", "content": sys_prompt}] + context_window
    
    try:
        content = await llm_service.chat_complete(messages=messages, temperature=0.7)
        return content
    except Exception:
        return "..."
