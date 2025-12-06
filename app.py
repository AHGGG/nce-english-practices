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
from practice_core import client, grade_sentence, log_matrix_attempt
from models import SelectionSnapshot, Story, QuizItem

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

# --- Routes ---

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/theme")
async def api_generate_theme(payload: ThemeRequest):
    try:
        # If previous_vocab is passed, we might need to reconstruct it into a ThemeVocabulary object
        # but ensure_theme handles raw logic. Let's look at signature.
        # ensure_theme takes (topic, client, refresh, previous_vocab)
        # previous_vocab is expected to be ThemeVocabulary object.
        
        prev_vocab_obj = None
        if payload.previous_vocab:
            try:
                prev_vocab_obj = ThemeVocabulary.from_payload(payload.previous_vocab)
            except Exception:
                pass # Ignore malformed previous vocab

        vocab = ensure_theme(
            topic=payload.topic, 
            client=client, 
            refresh=True if prev_vocab_obj else False, # If shuffling (providing prev vocab), we force refresh
            previous_vocab=prev_vocab_obj
        )
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
        # Reconstruct SelectionSnapshot
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
        # Logging failure shouldn't crash the app, but good to know
        print(f"Logging error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
