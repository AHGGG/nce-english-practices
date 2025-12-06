import json
from uuid import uuid4
from config import MODEL_NAME
from models import Mission, ChatState

# Store active sessions in memory for simplicity (in a real app, use Redis/DB)
# session_id -> ChatState
ACTIVE_SESSIONS = {}

MISSION_PROMPT = """You are a Game Master for an English learning RPG.
Create a "Secret Mission" for the user to practice the proper usage of: "{tense} {aspect}".
Topic: "{topic}"

Output JSON Requirements:
1. title: Catchy mission title.
2. description: The roleplay setup. Who is the user? Who is the AI? What is the conflict?
   - AI Role: The AI should play a specific character (e.g., "Grumpy Shopkeeper", "Nosy Neighbor").
3. required_grammar: List of specific grammar targets they must use (e.g., "Use 'didn't' twice", "Ask a question with 'Did you'").

Output JSON Example:
{{
  "id": "mission_123",
  "title": "The Broken Vase",
  "description": "You are a child who broke a vase. I am your angry mother. You must explain what happened without admitting fault directly.",
  "required_grammar": ["Use Past Simple negative", "Use Past Continuous"]
}}
"""

CHAT_SYSTEM_PROMPT = """You are a roleplay partner in an English practice session.
Current Mission: {description}
Target Grammar: {grammar}

Your instructions:
1. Stay in character tightly.
2. Keep responses short (1-2 sentences) to keep the pace fast.
3. If the user makes a grammar mistake related to the Target Grammar, briefly correct them OUT OF CHARACTER in brackets, then continue in character.
   Example: "[Correction: Say 'I didn't do it', not 'I no do it'.] ANYWAY, tell me the truth!"
4. Check if the user has satisfied the mission goals.

"""

def start_new_mission(client, topic: str, tense: str, aspect: str) -> dict:
    if not client:
        raise RuntimeError("LLM client unavailable")

    prompt = MISSION_PROMPT.format(topic=topic, tense=tense, aspect=aspect)
    
    messages = [
        {"role": "system", "content": "You create roleplay missions."},
        {"role": "user", "content": prompt}
    ]

    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.8)
        content = rsp.choices[0].message.content.strip()
        if content.startswith("```json"): content = content[7:-3]
        elif content.startswith("```"): content = content[3:-3]
        
        data = json.loads(content.strip())
        
        # Initialize Session
        session_id = str(uuid4())
        
        # Initial AI message to start the scene
        # We can ask LLM to generate the first line, or just have the user start.
        # Let's generate the first line for better immersion.
        start_msg = generate_ai_reply(client, data['description'], data['required_grammar'], [])
        
        session_state = {
            "mission": data,
            "history": [
                {"role": "assistant", "content": start_msg}
            ]
        }
        
        ACTIVE_SESSIONS[session_id] = session_state
        
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

def handle_chat_turn(client, session_id: str, user_message: str) -> dict:
    if session_id not in ACTIVE_SESSIONS:
        return {"error": "Session not found", "reply": "Session expired."}
    
    session = ACTIVE_SESSIONS[session_id]
    mission = session['mission']
    history = session['history']
    
    # Update history
    history.append({"role": "user", "content": user_message})
    
    # Generate Reply
    reply = generate_ai_reply(
        client, 
        mission['description'], 
        json.dumps(mission['required_grammar']), 
        history
    )
    
    history.append({"role": "assistant", "content": reply})
    
    # Limit history size in memory
    if len(history) > 20:
        session['history'] = history[-20:]
        
    return {
        "reply": reply,
        "history": history
    }

def generate_ai_reply(client, description, grammar, history):
    sys_prompt = CHAT_SYSTEM_PROMPT.format(description=description, grammar=grammar)
    
    messages = [{"role": "system", "content": sys_prompt}] + history
    
    try:
        rsp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.7)
        return rsp.choices[0].message.content.strip()
    except Exception:
        return "..."
