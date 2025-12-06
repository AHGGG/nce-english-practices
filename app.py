from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from theme_vocab import ensure_theme, ThemeVocabulary
from sentence_generator import ensure_sentences
from story_generator import ensure_story
from quiz_generator import generate_quiz
from scenario_generator import generate_scenario, grade_scenario_response
from chat_manager import start_new_mission, handle_chat_turn
from practice_core import client, grade_sentence, log_matrix_attempt
from models import SelectionSnapshot, Story, QuizItem, ScenarioPrompt, ScenarioResponse, Mission

# [DB] Import new DB functions
from database import log_session, log_story, log_attempt, get_user_stats

app = FastAPI(title="NCE English Practice")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

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
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
