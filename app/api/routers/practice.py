from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.generators.quiz import generate_quiz
from app.generators.scenario import generate_scenario, grade_scenario_response
from app.services.chat import start_new_mission, handle_chat_turn
from app.core.practice import grade_sentence, log_matrix_attempt
from app.database import log_attempt
from app.services.llm import llm_service
from app.models import SelectionSnapshot
from app.generators.coach import polish_sentence
from app.core.utils import SAFE_INPUT_PATTERN

router = APIRouter()

class QuizRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    aspect: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    correct_sentence: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)

class ScenarioRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    aspect: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)

class ScenarioGradeRequest(BaseModel):
    situation: str = Field(..., max_length=1000, pattern=SAFE_INPUT_PATTERN)
    goal: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)
    user_input: str = Field(..., max_length=1000, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)

class ChatStartRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    aspect: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)

class ChatReplyRequest(BaseModel):
    session_id: str = Field(..., max_length=50, pattern=r"^[a-zA-Z0-9\-_]+$") # Session ID is usually UUID or similar
    message: str = Field(..., max_length=2000, pattern=SAFE_INPUT_PATTERN)

class GradeRequest(BaseModel):
    expected: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)
    user: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)

class LogRequest(BaseModel):
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    words: Dict[str, List[str]]
    verb: Dict[str, str]
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    form: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    expected: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)
    user: str = Field(..., max_length=500, pattern=SAFE_INPUT_PATTERN)
    result: Dict[str, Any]
    wh_word: Optional[str] = None

class GenericLogRequest(BaseModel):
    activity_type: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN) # quiz, mission
    topic: str = Field(..., max_length=100, pattern=SAFE_INPUT_PATTERN)
    tense: str = Field(..., max_length=50, pattern=SAFE_INPUT_PATTERN)
    is_pass: bool
    details: Optional[Dict[str, Any]] = None
    duration_seconds: int = 0

class PolishRequest(BaseModel):
    sentence: str = Field(..., max_length=1000, pattern=SAFE_INPUT_PATTERN)
    context: List[Dict[str, str]] = []

@router.post("/api/quiz")
async def api_generate_quiz(payload: QuizRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        quiz = await run_in_threadpool(
            generate_quiz,
            client=llm_service.sync_client,
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect,
            correct_sentence=payload.correct_sentence
        )
        return quiz
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/scenario")
async def api_generate_scenario(payload: ScenarioRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        scenario = await run_in_threadpool(
            generate_scenario,
            client=llm_service.sync_client,
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect
        )
        return scenario
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/scenario/grade")
async def api_grade_scenario(payload: ScenarioGradeRequest):
    try:
        from fastapi.concurrency import run_in_threadpool
        result = await run_in_threadpool(
            grade_scenario_response,
            client=llm_service.sync_client,
            situation=payload.situation,
            goal=payload.goal,
            user_input=payload.user_input,
            tense=payload.tense
        )

        await log_attempt(
            activity_type='scenario',
            topic='unknown',
            tense=payload.tense,
            input_data={"situation": payload.situation, "goal": payload.goal},
            user_response={"text": payload.user_input},
            is_pass=result.is_pass
        )

        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/chat/start")
async def api_chat_start(payload: ChatStartRequest):
    try:
        data = await start_new_mission(
            topic=payload.topic,
            tense=payload.tense,
            aspect=payload.aspect
        )
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/chat/reply")
async def api_chat_reply(payload: ChatReplyRequest):
    try:
        data = await handle_chat_turn(
            session_id=payload.session_id,
            user_message=payload.message
        )
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/grade")
async def api_grade(payload: GradeRequest):
    try:
        result = grade_sentence(expected=payload.expected, user=payload.user)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/api/log")
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
        return {"status": "error", "message": "Internal Server Error"}

@router.post("/api/log_attempt")
async def api_log_generic(payload: GenericLogRequest):
    try:
        await log_attempt(
            activity_type=payload.activity_type,
            topic=payload.topic,
            tense=payload.tense,
            input_data={},
            user_response=payload.details or {},
            is_pass=payload.is_pass,
            duration_seconds=payload.duration_seconds
        )
        return {"status": "ok"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": "Internal Server Error"}

@router.post("/api/chat/polish")
async def api_chat_polish(payload: PolishRequest):
    try:
        suggestion = await polish_sentence(payload.sentence, payload.context)
        return {"suggestion": suggestion}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"suggestion": "Error", "details": "Internal Server Error"}
