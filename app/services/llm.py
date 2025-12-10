from __future__ import annotations

import os
from typing import Optional, Dict, Any, List
from openai import OpenAI, AsyncOpenAI
from google import genai
from app.config import settings, OPENAI_API_KEY, OPENAI_BASE_URL, GEMINI_API_KEY, MODEL_NAME

class LLMService:
    def __init__(self):
        # 1. Initialize OpenAI / DeepSeek Clients
        self.api_key = OPENAI_API_KEY
        self.base_url = OPENAI_BASE_URL
        self.model_name = MODEL_NAME
        
        # Sync Client
        if self.api_key:
            self.sync_client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            self.sync_client = None
            
        # Async Client
        if self.api_key:
            self.async_client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            self.async_client = None

        # 2. Initialize Gemini Client (Voice)
        # Priority: Settings > Env Vars
        self.gemini_key = GEMINI_API_KEY
        if self.gemini_key:
            self.voice_client = genai.Client(
                api_key=self.gemini_key,
                http_options={'api_version': 'v1alpha'}
            )
        else:
            self.voice_client = None
            
    # --- Accessors ---
    
    def get_sync_client(self) -> Optional[OpenAI]:
        return self.sync_client
        
    def get_async_client(self) -> Optional[AsyncOpenAI]:
        return self.async_client
        
    def get_voice_client(self) -> Optional[genai.Client]:
        return self.voice_client

    # --- Methods ---
    
    def chat_complete_sync(self, messages: List[Dict[str, str]], temperature: float = 0.7, model: str = None) -> str:
        """
        Wrapper for synchronous chat completion.
        """
        if not self.sync_client:
            raise RuntimeError("OpenAI/DeepSeek client is not configured (API Key missing).")
            
        model = model or self.model_name
        response = self.sync_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature
        )
        return response.choices[0].message.content.strip()

    async def chat_complete(self, messages: List[Dict[str, str]], temperature: float = 0.7, model: str = None) -> str:
        """
        Wrapper for asynchronous chat completion.
        """
        if not self.async_client:
            raise RuntimeError("OpenAI/DeepSeek client is not configured (API Key missing).")
            
        model = model or self.model_name
        response = await self.async_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature
        )
        return response.choices[0].message.content.strip()
        
    async def polish_text(self, text: str, context: List[Dict[str, str]] = None) -> str:
        """
        Specific helper for polishing text (Grammar Coach).
        """
        system_prompt = "You are an expert English editor. Improve the following text for naturalness and clarity. Return ONLY the improved text."
        msgs = [{"role": "system", "content": system_prompt}]
        if context:
            msgs.extend(context) # context is list of previous messages
        
        msgs.append({"role": "user", "content": text})
        
        return await self.chat_complete(msgs, temperature=0.3)

# Singleton Instance
llm_service = LLMService()
