from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio


from app.generators.theme import ensure_theme, ThemeVocabulary
from app.generators.sentence import ensure_sentences
from app.generators.story import ensure_story
from app.generators.quiz import generate_quiz
from app.generators.scenario import generate_scenario, grade_scenario_response
from app.services.chat import start_new_mission, handle_chat_turn
from app.core.practice import client, grade_sentence, log_matrix_attempt
from app.models import SelectionSnapshot, Story, QuizItem, ScenarioPrompt, ScenarioResponse, Mission

# [DB] Import new DB functions
from app.database import log_session, log_story, log_attempt, get_user_stats
from app.config import MODEL_NAME


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load dictionary on startup (Background)
    print("Startup: Initiating dictionary loading in background...")
    # Run synchronous load_dictionaries in a thread to avoid blocking the event loop
    asyncio.create_task(asyncio.to_thread(dict_manager.load_dictionaries))
    yield
    # Cleanup if needed

app = FastAPI(title="NCE English Practice", lifespan=lifespan)

# Mount paths need to be careful about CWD
# If running `uv run python -m app.main` from root, CWD is root.
# Static files:
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/dict-assets", StaticFiles(directory="resources/dictionaries"), name="dictionaries")
templates = Jinja2Templates(directory="templates")

from app.services.dictionary import dict_manager

# ...

class DictionaryLookupRequest(BaseModel):
    word: str

class DictionaryContextRequest(BaseModel):
    word: str
    sentence: str

# ... Routes ...

@app.get("/dict-assets/{file_path:path}")
async def get_dict_asset(file_path: str):
    """
    Unified endpoint for dictionary assets (CSS, JS, Images).
    Priority:
    1. Local file system (resources/dictionaries/{file_path})
    2. MDD Cache (using basename of file_path)
    """
    # 1. Check disk
    full_path = os.path.join(r"resources/dictionaries", file_path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        media_type, _ = mimetypes.guess_type(full_path)
        with open(full_path, "rb") as f:
            content = f.read()
        return Response(content=content, media_type=media_type or "application/octet-stream")

    # 2. Check MDD (Fallback)
    # MDD keys are often just the filename (e.g. "image.png") or relative paths.
    # We try the full relative path first, then just filename.
    
    # Try 1: Full path relative to dictionaries root? No, MDD keys are usually "\image.png"
    # Try 2: Just the filename (basename)
    filename = os.path.basename(file_path)
    
    # We can try to look it up in the specific dictionary if we parsed the path,
    # but dict_manager.get_resource iterates all, which is fine for now.
    
    # Try exact match first (if MDD has directory structure)
    content, media_type = dict_manager.get_resource(file_path) # Pass relative path
    if content:
        return Response(content=content, media_type=media_type)

    # Try basename match (common for flat MDD structures)
    if filename != file_path:
        content, media_type = dict_manager.get_resource(filename)
        if content:
             return Response(content=content, media_type=media_type)

    raise HTTPException(status_code=404, detail="Asset not found")

@app.get("/dict/resource")
def get_resource_legacy(path: str):
    """
    Legacy/Direct proxy for MDD resources using generic query param.
    """
    content, media_type = dict_manager.get_resource(path)
    if not content:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    return Response(content=content, media_type=media_type)

@app.post("/api/dictionary/lookup")
async def api_dict_lookup(payload: DictionaryLookupRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        # Result is now List[Dict] usually containing definition and source_dir
        results = await run_in_threadpool(dict_manager.lookup, payload.word)
        
        # Frontend expects: { results: [ { dictionary: "...", definition: "...", source_dir: "..." } ] }
        # dict_manager.lookup now returns exactly this structure of dictionaries in a list
        return {
            "results": results
        }
    except Exception as e:
        print(f"Dict Lookup Error: {e}")
        return {"results": [], "error": str(e)}

@app.post("/api/dictionary/context")
async def api_dict_context(payload: DictionaryContextRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        
        if not client:
            return {"explanation": "AI client is not configured (API Key missing)."}

        # AI Explanation
        prompt = f"""
        Explain the meaning of the word "{payload.word}" in the context of this sentence:
        "{payload.sentence}"
        
        Keep it brief (max 2 sentences). Explain the nuance or usage.
        """
        
        response = await run_in_threadpool(
            lambda: client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
        )
        explanation = response.choices[0].message.content.strip() if response.choices else "Could not generate explanation."
        
        return {"explanation": explanation}
    except Exception as e:
         return {"explanation": f"AI Error: {str(e)}"}

# ... existing stats/log routes ...


# --- Pydantic Models for Requests ---

class ThemeRequest(BaseModel):
    topic: str
    previous_vocab: Optional[Dict[str, Any]] = None

class StoryRequest(BaseModel):
    topic: str
    target_tense: str

class QuizRequest(BaseModel):
    topic: str
    tense: str
    aspect: str
    correct_sentence: str

class ScenarioRequest(BaseModel):
    topic: str
    tense: str
    aspect: str

class ScenarioGradeRequest(BaseModel):
    situation: str
    goal: str
    user_input: str
    tense: str

class ChatStartRequest(BaseModel):
    topic: str
    tense: str
    aspect: str

class ChatReplyRequest(BaseModel):
    session_id: str
    message: str

class SentenceRequest(BaseModel):
    topic: str
    time_layer: str
    subject: str
    verb_base: str
    verb_past: str
    verb_participle: str
    object: str = ""
    manner: str = ""
    place: str = ""
    time: str = ""

class GradeRequest(BaseModel):
    expected: str
    user: str

class LogRequest(BaseModel):
    topic: str
    words: Dict[str, List[str]]
    verb: Dict[str, str]
    tense: str
    form: str
    expected: str
    user: str
    result: Dict[str, Any]
    wh_word: Optional[str] = None

class GenericLogRequest(BaseModel):
    activity_type: str # quiz, mission
    topic: str
    tense: str
    is_pass: bool
    details: Dict[str, Any] = {}

# --- Routes ---

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/stats")
async def api_get_stats():
    return get_user_stats()

@app.post("/api/log_attempt")
async def api_log_generic(payload: GenericLogRequest):
    try:
        log_attempt(
            activity_type=payload.activity_type,
            topic=payload.topic,
            tense=payload.tense,
            input_data={},
            user_response=payload.details,
            is_pass=payload.is_pass
        )
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/api/theme")
async def api_generate_theme(payload: ThemeRequest):
    try:
        prev_vocab_obj = None
        if payload.previous_vocab:
            try:
                prev_vocab_obj = ThemeVocabulary.from_payload(payload.previous_vocab)
            except Exception:
                pass 

        vocab = ensure_theme(
            topic=payload.topic, 
            client=client, 
            refresh=True if prev_vocab_obj else False,
            previous_vocab=prev_vocab_obj
        )
        
        # [DB] Log Session
        log_session(payload.topic, vocab.serialize())

        return vocab.serialize()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/story")
async def api_generate_story(payload: StoryRequest):
    try:
        story = ensure_story(
            topic=payload.topic,
            tense=payload.target_tense,
            client=client
        )
        
        # [DB] Log Story
        log_story(payload.topic, payload.target_tense, story.dict())

        return story
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/quiz")
async def api_generate_quiz(payload: QuizRequest):
    try:
        quiz = generate_quiz(
            client=client,
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect,
            correct_sentence=payload.correct_sentence
        )
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario")
async def api_generate_scenario(payload: ScenarioRequest):
    try:
        scenario = generate_scenario(
            client=client,
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect
        )
        return scenario
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scenario/grade")
async def api_grade_scenario(payload: ScenarioGradeRequest):
    try:
        result = grade_scenario_response(
            client=client,
            situation=payload.situation,
            goal=payload.goal,
            user_input=payload.user_input,
            tense=payload.tense
        )
        
        # [DB] Log Attempt
        log_attempt(
            activity_type='scenario',
            topic='unknown',
            tense=payload.tense,
            input_data={"situation": payload.situation, "goal": payload.goal},
            user_response={"text": payload.user_input},
            is_pass=result.is_pass
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/start")
async def api_chat_start(payload: ChatStartRequest):
    try:
        data = start_new_mission(
            client=client,
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/reply")
async def api_chat_reply(payload: ChatReplyRequest):
    try:
        data = handle_chat_turn(
            client=client,
            session_id=payload.session_id,
            user_message=payload.message
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/sentences")
async def api_generate_sentences(payload: SentenceRequest):
    try:
        data = ensure_sentences(
            topic=payload.topic,
            time_layer=payload.time_layer,
            subject=payload.subject,
            verb_base=payload.verb_base,
            verb_past=payload.verb_past,
            verb_participle=payload.verb_participle,
            object=payload.object,
            manner=payload.manner,
            place=payload.place,
            time=payload.time,
            client=client
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/grade")
async def api_grade(payload: GradeRequest):
    try:
        result = grade_sentence(expected=payload.expected, user=payload.user)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log")
async def api_log(payload: LogRequest):
    try:
        snapshot = SelectionSnapshot(
            topic=payload.topic,
            words=payload.words,
            verb=payload.verb
        )
        log_matrix_attempt(
            snapshot=snapshot,
            tense=payload.tense,
            form=payload.form,
            expected=payload.expected,
            user=payload.user,
            result=payload.result,
            wh_word=payload.wh_word
        )
        return {"status": "ok"}
    except Exception as e:
        print(f"Logging error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
