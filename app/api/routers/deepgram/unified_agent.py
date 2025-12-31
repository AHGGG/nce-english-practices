from fastapi import WebSocket, WebSocketDisconnect, Query
from app.config import settings
from app.services.agent_functions import FUNCTION_DEFINITIONS, FUNCTION_MAP, is_special_function
import logging
import json
import asyncio
import websockets

logger = logging.getLogger(__name__)

DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse"
USER_AUDIO_SAMPLE_RATE = 16000 
AGENT_AUDIO_SAMPLE_RATE = 16000

async def deepgram_unified_voice_agent_websocket(
    websocket: WebSocket,
    voice: str = Query(default="aura-2-asteria-en", description="TTS voice model"),
    llm_provider: str = Query(default="default", description="LLM provider: default (gpt-4o-mini), dashscope, or deepseek"),
    system_prompt: str = Query(default="You are a helpful and concise AI assistant. Keep responses brief, and don't use markdown in your response."),
    greeting: str = Query(default="Hello! How can I help you today?"),
    functions_enabled: bool = Query(default=True, description="Enable function calling for lookup_word, get_example_sentences, etc.")
):
    """
    Unified Voice Agent using Deepgram's Agent API.
    """
    await websocket.accept()
    
    if not settings.DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Deepgram API Key not configured"})
        await websocket.close()
        return

    # Build LLM endpoint configuration
    if llm_provider == "default":
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": "gpt-4o-mini",
                "temperature": 0.7,
            },
            "prompt": system_prompt,
        }
    elif llm_provider == "dashscope":
        if not settings.DASHSCOPE_API_KEY:
            await websocket.send_json({"type": "error", "message": "Dashscope API Key not configured"})
            await websocket.close()
            return
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": settings.DASHSCOPE_MODEL_NAME or "qwen3-30b-a3b",
                "temperature": 0.7,
            },
            "endpoint": {
                "url": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
                "headers": {
                    "authorization": f"Bearer {settings.DASHSCOPE_API_KEY}"
                }
            },
            "prompt": system_prompt,
        }
    else:
        think_config = {
            "provider": {
                "type": "open_ai",
                "model": settings.MODEL_NAME or "deepseek-chat",
                "temperature": 0.7,
            },
            "endpoint": {
                "url": settings.DEEPSEEK_BASE_URL + "/chat/completions" if settings.DEEPSEEK_BASE_URL else "https://api.deepseek.com/v1/chat/completions",
                "headers": {
                    "authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"
                }
            },
            "prompt": system_prompt,
        }

    if functions_enabled:
        think_config["functions"] = FUNCTION_DEFINITIONS
        logger.info(f"Function calling enabled with {len(FUNCTION_DEFINITIONS)} functions")

    agent_settings = {
        "type": "Settings",
        "audio": {
            "input": {
                "encoding": "linear16",
                "sample_rate": USER_AUDIO_SAMPLE_RATE,
            },
            "output": {
                "encoding": "linear16",
                "sample_rate": AGENT_AUDIO_SAMPLE_RATE,
                "container": "none",
            },
        },
        "agent": {
            "language": "en",
            "listen": {
                "provider": {
                    "type": "deepgram",
                    "model": "nova-3",
                }
            },
            "think": think_config,
            "speak": {
                "provider": {
                    "type": "deepgram",
                    "model": voice,
                }
            },
            "greeting": greeting,
        }
    }

    headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

    try:
        logger.info(f"Connecting to Deepgram Agent API: {DEEPGRAM_AGENT_URL}")
        async with websockets.connect(
            DEEPGRAM_AGENT_URL,
            additional_headers=headers,
            open_timeout=10,
            close_timeout=5,
            ping_interval=20,
        ) as dg_ws:
            await dg_ws.send(json.dumps(agent_settings))
            
            should_close = False
            
            await websocket.send_json({
                "type": "ready",
                "voice": voice,
                "llm_provider": llm_provider,
                "sample_rate": AGENT_AUDIO_SAMPLE_RATE,
                "functions_enabled": functions_enabled,
            })

            async def receive_from_deepgram():
                nonlocal should_close
                try:
                    async for message in dg_ws:
                        if isinstance(message, bytes):
                            await websocket.send_bytes(message)
                        else:
                            try:
                                data = json.loads(message)
                                msg_type = data.get("type", "")
                                
                                logger.info(f"[Deepgram Agent] {msg_type}: {json.dumps(data)[:200]}")
                                
                                if msg_type == "Welcome":
                                    await websocket.send_json({
                                        "type": "connected",
                                        "session_id": data.get("session_id"),
                                    })
                                elif msg_type == "UserStartedSpeaking":
                                    await websocket.send_json({"type": "user_started_speaking"})
                                elif msg_type == "UserStoppedSpeaking":
                                    await websocket.send_json({"type": "user_stopped_speaking"})
                                elif msg_type == "AgentStartedSpeaking":
                                    await websocket.send_json({"type": "agent_started_speaking"})
                                elif msg_type == "AgentAudioDone":
                                    await websocket.send_json({"type": "agent_audio_done"})
                                elif msg_type == "ConversationText":
                                    await websocket.send_json({
                                        "type": "conversation_text",
                                        "role": data.get("role"),
                                        "content": data.get("content"),
                                    })
                                elif msg_type == "AgentThinking":
                                    content = data.get("content", "")
                                    if content:
                                        await websocket.send_json({
                                            "type": "agent_thinking",
                                            "content": content,
                                        })
                                elif msg_type == "FunctionCalling":
                                    await websocket.send_json({"type": "function_calling"})
                                
                                elif msg_type == "FunctionCallRequest":
                                    functions = data.get("functions", [])
                                    for func_data in functions:
                                        function_name = func_data.get("name")
                                        function_call_id = func_data.get("id")
                                        arguments_str = func_data.get("arguments", "{}")
                                        
                                        try:
                                            parameters = json.loads(arguments_str) if isinstance(arguments_str, str) else arguments_str
                                        except json.JSONDecodeError:
                                            parameters = {}
                                        
                                        logger.info(f"[Function] Calling: {function_name}({json.dumps(parameters)})")
                                        
                                        await websocket.send_json({
                                            "type": "function_call",
                                            "name": function_name,
                                            "parameters": parameters,
                                        })
                                        
                                        try:
                                            func = FUNCTION_MAP.get(function_name)
                                            if not func:
                                                raise ValueError(f"Function '{function_name}' not found")
                                            
                                            result = await func(parameters, dg_ws)
                                            
                                            if is_special_function(function_name):
                                                function_response = result.get("function_response", result)
                                                inject_message = result.get("inject_message")
                                                close_message = result.get("close_message")
                                                
                                                response = {
                                                    "type": "FunctionCallResponse",
                                                    "id": function_call_id,
                                                    "name": function_name,
                                                    "content": json.dumps(function_response),
                                                }
                                                await dg_ws.send(json.dumps(response))
                                                
                                                if inject_message:
                                                    await dg_ws.send(json.dumps(inject_message))
                                                
                                                if close_message:
                                                    should_close = True
                                            else:
                                                response = {
                                                    "type": "FunctionCallResponse",
                                                    "id": function_call_id,
                                                    "name": function_name,
                                                    "content": json.dumps(result),
                                                }
                                                await dg_ws.send(json.dumps(response))
                                            
                                            await websocket.send_json({
                                                "type": "function_result",
                                                "name": function_name,
                                                "result": result.get("function_response", result) if is_special_function(function_name) else result,
                                            })
                                            
                                        except Exception as e:
                                            logger.error(f"[Function] Error executing {function_name}: {e}")
                                            error_response = {
                                                "type": "FunctionCallResponse",
                                                "id": function_call_id,
                                                "name": function_name,
                                                "content": json.dumps({"error": str(e)}),
                                            }
                                            await dg_ws.send(json.dumps(error_response))
                                            await websocket.send_json({
                                                "type": "function_result",
                                                "name": function_name,
                                                "result": {"error": str(e)},
                                            })
                                
                                elif msg_type == "Error":
                                    logger.error(f"Deepgram Agent Error: {data}")
                                    await websocket.send_json({
                                        "type": "error",
                                        "message": data.get("description", "Unknown error"),
                                    })
                                elif msg_type == "CloseConnection":
                                    logger.info("Deepgram requested close")
                                    break

                            except json.JSONDecodeError:
                                pass
                                
                except websockets.exceptions.ConnectionClosed:
                    pass
                except Exception as e:
                    logger.error(f"Error receiving from Deepgram: {e}")

            async def send_to_deepgram():
                try:
                    while True:
                        message = await websocket.receive()
                        
                        if "bytes" in message:
                            await dg_ws.send(message["bytes"])
                        elif "text" in message:
                            try:
                                data = json.loads(message["text"])
                                cmd_type = data.get("type", "")
                                
                                if cmd_type == "close":
                                    await dg_ws.send(json.dumps({"type": "CloseStream"}))
                                    break
                                elif cmd_type == "inject_message":
                                    await dg_ws.send(json.dumps({
                                        "type": "InjectAgentMessage",
                                        "message": data.get("message", ""),
                                    }))
                            except json.JSONDecodeError:
                                pass
                except WebSocketDisconnect:
                    try:
                         if should_close:
                             await dg_ws.send(json.dumps({"type": "CloseStream"}))
                    except Exception:
                        pass

            await asyncio.gather(
                send_to_deepgram(),
                receive_from_deepgram(),
                return_exceptions=True
            )

    except Exception as e:
        logger.error(f"Deepgram Unified Agent Error: {e}")
        try:
             await websocket.send_json({"type": "error", "message": f"Critical Error: {str(e)}"})
        except Exception:
             pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
