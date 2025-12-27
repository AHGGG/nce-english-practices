import json
from typing import Optional
from app.models.negotiation_schemas import (
    NegotiationRequest, NegotiationResponse, NegotiationStep, 
    UserIntention, NegotiationSessionState, NegotiationContext
)
from app.services.llm import llm_service
from app.services.proficiency_service import proficiency_service

class NegotiationService:
    def __init__(self):
        # In-memory session store for MVP. In production, use Redis/DB.
        self._sessions: dict[str, NegotiationSessionState] = {}

    async def handle_request(self, request: NegotiationRequest) -> NegotiationResponse:
        """
        Main entry point for the Negotiation Loop.
        Input: User intention (HUH / CONTINUE).
        Output: Next text to speak/display.
        """
        session = self._get_or_create_session(request)
        
        # Get the source word for proficiency tracking
        source_word = self._get_source_word(session)
        
        # 1. Handle Navigation Logic
        if request.user_intention == UserIntention.CONTINUE:
            # Record CONTINUE event for proficiency tracking
            if source_word:
                try:
                    await proficiency_service.record_interaction(source_word, "continue")
                except Exception as e:
                    print(f"Proficiency tracking error: {e}")  # Non-blocking
            
            if session.current_step == NegotiationStep.ORIGINAL:
                return self._finalize_loop(session)
            elif session.current_step == NegotiationStep.VERIFY:
                return self._finalize_loop(session)
            else:
                if session.current_step == NegotiationStep.EXPLAIN_CN:
                    return await self._transition_to_verify(session)
                else:
                     return self._finalize_loop(session)

        elif request.user_intention == UserIntention.HUH:
            # Record HUH event for proficiency tracking
            if source_word:
                try:
                    await proficiency_service.record_interaction(source_word, "huh")
                except Exception as e:
                    print(f"Proficiency tracking error: {e}")  # Non-blocking
            
            return await self._descend_ladder(session)
            
        return NegotiationResponse(
            audio_text="I didn't catch that.",
            next_step=session.current_step
        )
    
    def _get_source_word(self, session: NegotiationSessionState) -> Optional[str]:
        """Extract the source word from session context for proficiency tracking."""
        if session.history and len(session.history) > 0:
            context = session.history[0].get("context", {})
            # Try to extract word from context
            # ContentFeeder provides source_word, but we store target_content
            content = context.get("target_content", "")
            # For now, just use the first word as a simple heuristic
            # In production, this should be the actual source_word from ContentFeeder
            if content:
                words = content.split()
                # Find the first "interesting" word (length > 4)
                for word in words:
                    clean = word.strip('.,!?"\'').lower()
                    if len(clean) > 4:
                        return clean
        return None

    def _get_or_create_session(self, request: NegotiationRequest) -> NegotiationSessionState:
        if request.session_id not in self._sessions:
            if not request.context:
                 # Should handled by caller to ensure context takes place
                 raise ValueError("New session requires context")
            self._sessions[request.session_id] = NegotiationSessionState(
                session_id=request.session_id,
                current_step=NegotiationStep.ORIGINAL
            )
            # Store context in session or assume it's passed? 
            # For MVP let's attach context to the state object (not in Pydantic schema yet, let's dynamically add or fix schema)
            # Actually schema doesn't have `context` field. Let's assume the caller manages content feed, 
            # but Negotiation needs to know WHAT to explain.
            # Let's mock a context storage.
            self._sessions[request.session_id].history.append({"context": request.context.model_dump()})
        
        return self._sessions[request.session_id]
        
    def _get_current_content(self, session: NegotiationSessionState) -> NegotiationContext:
        # Retrieve context from history [0]
        data = session.history[0]["context"]
        return NegotiationContext(**data)

    async def _descend_ladder(self, session: NegotiationSessionState) -> NegotiationResponse:
        """
        Logic for: Original -> Explain EN -> Explain CN -> Verify
        """
        content = self._get_current_content(session)
        target = content.target_content
        
        if session.current_step == NegotiationStep.ORIGINAL:
            # Step 1: Explain in simple English (i+1)
            session.current_step = NegotiationStep.EXPLAIN_EN
            explanation = await self._generate_explanation(target, "en", content)
            return NegotiationResponse(
                audio_text=explanation,
                display_text=explanation, # Scaffolding
                next_step=NegotiationStep.EXPLAIN_EN
            )
            
        elif session.current_step == NegotiationStep.EXPLAIN_EN:
            # Step 2: Fallback to Chinese (L1)
            session.current_step = NegotiationStep.EXPLAIN_CN
            explanation = await self._generate_explanation(target, "cn", content)
            return NegotiationResponse(
                audio_text=f"In Chinese context: {explanation}",
                display_text=explanation,
                next_step=NegotiationStep.EXPLAIN_CN
            )
            
        elif session.current_step == NegotiationStep.EXPLAIN_CN:
            # Step 3: Verify with new example (Migration)
            return await self._transition_to_verify(session)
            
        elif session.current_step == NegotiationStep.VERIFY:
            # Failed verification -> Loop back to L1 or Detailed breakdown?
            # For MVP, let's try a different explanation or just encourage move on.
            return NegotiationResponse(
                audio_text="Let's try one more example.",
                next_step=NegotiationStep.VERIFY
                # Ideally generate a SECOND verification example
            )
            
        return NegotiationResponse(audio_text="Error in loop", next_step=session.current_step)

    async def _transition_to_verify(self, session: NegotiationSessionState) -> NegotiationResponse:
        content = self._get_current_content(session)
        session.current_step = NegotiationStep.VERIFY
        new_example = await self._generate_verification(content.target_content)
        return NegotiationResponse(
            audio_text=f"Let's try this: {new_example}",
            display_text=new_example,
            next_step=NegotiationStep.VERIFY
        )

    def _finalize_loop(self, session: NegotiationSessionState) -> NegotiationResponse:
        # Reset or signal completion
        # Ideally, we log proficiency here.
        # "User mastered X after Y steps"
        if session.session_id in self._sessions:
            del self._sessions[session.session_id]
            
        return NegotiationResponse(
            audio_text="Great, moving on.",
            next_step=NegotiationStep.ORIGINAL, # Reset
            should_listen=False # Don't wait for Huh, just play next story chunk
        )

    async def _generate_explanation(self, text: str, lang: str, context_data: Optional[NegotiationContext] = None) -> str:
        # Construct context string
        context_str = ""
        if context_data:
            if context_data.part_of_speech:
                context_str += f" The word acts as a {context_data.part_of_speech}."
            if context_data.definition:
                context_str += f" The specific meaning is: '{context_data.definition}'."
            if context_data.translation_hint and lang == "cn":
                 context_str += f" (Reference translation: {context_data.translation_hint})"

        # Call LLM
        prompt = f"Explain the following text in simple English (CEFR A2 level): '{text}'."
        prompt += " Output plain text only, optimized for Text-to-Speech. Do NOT use markdown, asterisks, or special formatting."
        if context_str:
            prompt += f"\nContext:{context_str}"

        if lang == "cn":
            prompt = f"Translate and explain the nuance of this text in Chinese: '{text}'."
            prompt += " Output plain text only. Do NOT use markdown or asterisks."
            if context_str:
                prompt += f"\nContext:{context_str}"
            
        messages = [{"role": "user", "content": prompt}]
        response = await llm_service.chat_complete(messages)
        return response.strip()

    async def _generate_verification(self, text: str) -> str:
        prompt = f"Create a NEW, simple example sentence using the key vocabulary or grammar from: '{text}'. ensure it is i+1 level."
        prompt += " Output plain text only. Do NOT use markdown."
        messages = [{"role": "user", "content": prompt}]
        response = await llm_service.chat_complete(messages)
        return response.strip()

negotiation_service = NegotiationService()
