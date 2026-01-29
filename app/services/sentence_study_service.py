"""
Sentence Study Service Layer

Business logic extracted from sentence_study.py router.
Contains LLM streaming, caching, and diagnosis utilities.
"""

import hashlib
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.orm import (
    ArticleOverviewCache,
    SentenceCollocationCache,
    SentenceLearningRecord,
    UserComprehensionProfile,
    WordProficiency,
)

from app.services.llm import llm_service

logger = logging.getLogger(__name__)


# =============================================================================
# In-Memory Caches
# =============================================================================

# Cache for simplified sentence results (key: hash(sentence|type|stage), value: text)
_simplify_cache: Dict[str, str] = {}

# Cache for word/phrase explanations (key: hash(word+sentence+style), value: explanation text)
_explain_cache: Dict[str, str] = {}

# Cache for article overviews (key: title hash, value: overview dict)
_overview_cache: Dict[str, Dict] = {}

# Cache for collocation detection (key: sentence hash, value: collocations list)
_collocation_cache: Dict[str, List[dict]] = {}


# =============================================================================
# LLM Prompt Templates
# =============================================================================

SIMPLIFY_PROMPTS = {
    # Stage 1: Vocabulary Simplification
    "stage1": """Rewrite this sentence using simpler vocabulary (COCA 0-2000 most common words).
Keep the sentence structure exactly the same, only replace difficult words with simpler synonyms.

Original: "{sentence}"

Return ONLY the simplified sentence, no explanation.""",
    # Stage 2: Grammar Simplification
    "stage2": """Break this sentence into shorter, simpler sentences (Subject-Verb-Object).
Keep the meaning but remove complex clauses. Use simple connecting words if needed.

Original: "{sentence}"

Return ONLY the simplified structure (2-3 short sentences), no explanation.""",
    # Stage 3: English Breakdown (Context & Meaning)
    "stage3": """The learner has seen the simplified vocabulary and grammar but still finds it unclear.
Provide a clear ENGLISH explanation of the meaning in this specific context.

Sentence: "{sentence}"

Context:
{context}

Respond in this format:
1. **Meaning**: [Simple English explanation of what it means]
2. **Key Point**: [The main message or nuance]
3. **Breakdown**: [Briefly explain 1-2 difficult phrases if any]

Keep it encouraging and simple.""",
    # Stage 4: Chinese Deep Dive
    "stage4": """学习者经过前面的英文解释仍然不理解。请用中文提供深度解析。
    
句子："{sentence}"

上下文：
{context}

请提供：
1. **中文翻译**：准确顺畅的翻译
2. **结构分析**：拆解句子成分
3. **难点精讲**：重点讲解单词或语法难点
4. **语境提示**：为什么这里用这个表达

用中文回答，条理清晰。""",
}


EXPLAIN_PROMPTS = {
    "default_word": """Define "{text}" clearly (dictionary style).
 
 {context}
 
 Respond in this EXACT format (each section on its own line):
 
 📖 MEANING:
 [Clear, concise dictionary definition. If the word has multiple meanings, choose the one matching the context. Do NOT start with "In this context".]
 
 💡 EXAMPLES:
 - [Example sentence 1 (Do NOT use the context sentences provided above)]
 - [Example sentence 2 (Do NOT use the context sentences provided above)]""",
    "default_phrase": """Use the Collins COBUILD style to define the phrase "{text}".
 
 {context}
 
 Respond in this EXACT format (each section on its own line):
 
 📖 MEANING:
 [COBUILD style full-sentence definition using simple vocabulary. e.g., "If you give up, you stop trying..."]
 
 💡 EXAMPLES:
 - [Example sentence 1 (Do NOT use the context sentences provided above)]
 - [Example sentence 2 (Do NOT use the context sentences provided above)]""",
    "simple": """Explain the {item_type} "{text}" in the context of the sentence below.
Explanation must be in SIMPLE ENGLISH, suitable for a beginner learner.
Use simple vocabulary and short sentences.

Context:
{context}

Target: "{text}"

Give only the explanation, no preamble.""",
    # Brief style - Stage 1 for Review Queue (very concise, 1 sentence)
    "brief": """Give a very brief (1 sentence) explanation of "{text}" in this context:

Context:
{context}

Target: "{text}"

Respond in simple English, one sentence only.""",
    # Detailed style - Stage 3 for Review Queue (Chinese deep explanation)
    "detailed": """请详细讲解句子中"{text}"这个{item_type}的含义和用法。
 结合以下上下文进行全方位的中文讲解：
 
 上下文：
 {context}
 
 讲解要求：
 1. 解释在当前语境下的确切含义
 2. 分析语法结构或搭配用法
 3. 给出一个类似用法的例句 (不要使用上面的原句)
 4. 为什么这个表达对中国学习者可能困难
 
 目标词汇："{text}"
 
 直接给出讲解内容，不要有多余的开场白。""",
    "chinese_deep": """请详细讲解句子中"{text}"这个{item_type}的含义和用法。
结合以下上下文进行全方位的中文讲解：

上下文：
{context}

讲解要求：
1. 解释在当前语境下的确切含义
2. 分析语法结构或搭配用法
3. 如果有引申义或特殊语气，请指出
4. 使用中文回答，讲解要深入浅出

目标词汇："{text}"

直接给出讲解内容，不要有多余的开场白。""",
}


COLLOCATION_PROMPT = """Analyze this sentence and identify ALL common English collocations, phrasal verbs, and fixed expressions.

Sentence: "{sentence}"

Word list with indices:
{word_list}

Return a JSON array of detected collocations. For each, provide:
- "text": the exact collocation text
- "start_word_idx": starting word index
- "end_word_idx": ending word index (inclusive)

Examples of collocations to detect:
- Phrasal verbs: "sit down", "give up", "look forward to"
- Fixed expressions: "in terms of", "as a result", "take advantage of"
- Common combinations: "make a decision", "pay attention", "climate change"

Only include genuine multi-word expressions that act as a unit.
Return ONLY valid JSON array, no explanation."""


OVERVIEW_PROMPT = """Analyze this article and provide a brief overview to help a learner understand the context before studying it sentence by sentence.

Article Title: {title}
Total Sentences: {total_sentences}

Article Excerpt:
{excerpt}

Respond in this exact JSON format:
{{
  "summary_en": "2-3 sentence summary of what this article is about",
  "summary_zh": "中文翻译：2-3句话概括文章内容",
  "key_topics": ["topic1", "topic2", "topic3"],
  "difficulty_hint": "Brief note about vocabulary/grammar complexity"
}}

Return ONLY the JSON, no markdown formatting."""


IMAGE_DETECTION_PROMPT = """You are helping an English learner understand the word "{word}" in the following sentence.

Sentence: "{sentence}"

Full Context:
{context}

**Task 1: Determine Visual Suitability**
Decide if this word/phrase IN THIS SPECIFIC CONTEXT is suitable for visual illustration.
- SUITABLE: Physical objects, visible actions, describable scenes (e.g., "volcanic eruption", "sprinting athlete", "glossy surface").
- NOT SUITABLE: Abstract ideas, emotions, grammar words, very common words (e.g., "democracy", "however", "think", "book").

**Task 2: Generate Educational Image Prompt (if suitable)**
If suitable, create a detailed English prompt for an AI image generator. The goal is to help the learner UNDERSTAND the word's meaning in this context through visualization.
- Describe a scene that illustrates the MEANING of the word as used in this sentence.
- Be specific and visual. Use concrete details.
- Do NOT just draw the word literally; show its meaning in action or context.
- Max 60 words.

Return strictly valid JSON:
{{
  "reasoning": "your thinking trajectory here, one or two sentences",
  "suitable": true/false,
  "image_prompt": "An educational illustration showing..." (or null if not suitable)
}}"""

# =============================================================================
# Service Class
# =============================================================================


class SentenceStudyService:
    """
    Business logic for Sentence Study feature.
    Handles LLM streaming, caching, and gap diagnosis.
    """

    def __init__(self):
        self.llm = llm_service

    # -------------------------------------------------------------------------
    # Cache Management
    # -------------------------------------------------------------------------

    def get_simplify_cache_key(
        self, sentence: str, simplify_type: str, stage: int
    ) -> str:
        return hashlib.md5(f"{sentence}|{simplify_type}|{stage}".encode()).hexdigest()

    def get_explain_cache_key(self, text: str, sentence: str, style: str) -> str:
        return hashlib.md5(f"{text}|{sentence}|{style}".encode()).hexdigest()

    def get_overview_cache_key(self, title: str) -> str:
        return hashlib.md5(title.encode()).hexdigest()

    def get_collocation_cache_key(self, sentence: str) -> str:
        return hashlib.md5(sentence.encode()).hexdigest()

    def get_image_suitability_cache_key(self, word: str, sentence: str) -> str:
        return hashlib.md5(f"{word}|{sentence}|image_check".encode()).hexdigest()

    # -------------------------------------------------------------------------
    # Simplify Streaming
    # -------------------------------------------------------------------------

    async def stream_simplification(
        self,
        sentence: str,
        simplify_type: str,
        stage: int,
        prev_sentence: Optional[str] = None,
        next_sentence: Optional[str] = None,
    ):
        """
        Stream LLM simplification with caching support.
        Yields SSE-formatted chunks.
        """
        stage = max(1, min(4, stage))  # Clamp to 1-4
        cache_key = self.get_simplify_cache_key(sentence, simplify_type, stage)

        # Check cache
        if cache_key in _simplify_cache:
            yield json.dumps({"type": "chunk", "content": _simplify_cache[cache_key]})
            yield json.dumps(
                {
                    "type": "done",
                    "stage": stage,
                    "has_next_stage": stage < 4,
                    "cached": True,
                }
            )
            return

        # Build context
        context_parts = []
        if prev_sentence:
            context_parts.append(f'Previous sentence: "{prev_sentence}"')
        context_parts.append(f'Current sentence: "{sentence}"')
        if next_sentence:
            context_parts.append(f'Next sentence: "{next_sentence}"')
        context = "\n".join(context_parts)

        # Select prompt based on stage
        if stage == 1:
            prompt = SIMPLIFY_PROMPTS["stage1"].format(sentence=sentence)
        elif stage == 2:
            prompt = SIMPLIFY_PROMPTS["stage2"].format(sentence=sentence)
        elif stage == 3:
            prompt = SIMPLIFY_PROMPTS["stage3"].format(
                sentence=sentence, context=context
            )
        else:
            prompt = SIMPLIFY_PROMPTS["stage4"].format(
                sentence=sentence, context=context
            )

        # Stream from LLM
        full_text = ""
        try:
            # Determine max tokens based on stage
            if stage == 4:  # Chinese deep dive needs more tokens
                max_gen_tokens = 4000
            elif stage == 3:  # English analysis
                max_gen_tokens = 2000
            elif stage == 2:  # Grammar simplification
                max_gen_tokens = 500
            else:  # Stage 1: Vocabulary simplification
                max_gen_tokens = 300

            stream = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_gen_tokens,
                temperature=0.3,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_text += content
                    yield json.dumps({"type": "chunk", "content": content})

            # Cache result
            _simplify_cache[cache_key] = full_text
            yield json.dumps(
                {"type": "done", "stage": stage, "has_next_stage": stage < 4}
            )

        except Exception as e:
            logger.error(f"Simplify stream error: {e}")
            yield json.dumps({"type": "error", "message": str(e)})

    # -------------------------------------------------------------------------
    # Word Explanation Streaming
    # -------------------------------------------------------------------------

    async def stream_word_explanation(
        self,
        text: str,
        sentence: str,
        style: str = "default",
        prev_sentence: Optional[str] = None,
        next_sentence: Optional[str] = None,
    ):
        """
        Stream LLM explanation of a word/phrase with caching.
        Yields JSON chunks: {"type": "chunk", "content": ...} OR {"type": "image_check", ...}
        """
        import asyncio
        import json
        from app.config import settings

        # Start parallel image check ONLY if feature is enabled
        detect_task = None
        if settings.ENABLE_IMAGE_GENERATION:
            context_parts_img = []
            if prev_sentence:
                context_parts_img.append(prev_sentence)
            context_parts_img.append(sentence)
            if next_sentence:
                context_parts_img.append(next_sentence)
            full_context = " ".join(context_parts_img)

            detect_task = asyncio.create_task(
                self.detect_image_suitability(text, sentence, full_context)
            )

        cache_key = self.get_explain_cache_key(text, sentence, style)
        image_check_sent = False  # Track if we already sent image_check

        # Check cache
        if cache_key in _explain_cache:
            cached = _explain_cache[cache_key]
            # Yield cached content as chunks
            yield json.dumps({"type": "chunk", "content": cached})
        else:
            explanation = await self.explain_word_sync(
                text=text,
                sentence=sentence,
                style=style,
                prev_sentence=prev_sentence,
                next_sentence=next_sentence,
            )
            yield json.dumps({"type": "chunk", "content": explanation})

        # Parallel Task Result: Check if image check completed
        if detect_task and not image_check_sent:
            try:
                result = await detect_task
                if result and result.get("suitable"):
                    yield json.dumps(
                        {
                            "type": "image_check",
                            "suitable": True,
                            "image_prompt": result.get("image_prompt"),
                        }
                    )
            except Exception as e:
                logger.error(f"Image check task error: {e}")

    async def explain_word_sync(
        self,
        text: str,
        sentence: str,
        style: str = "default",
        prev_sentence: Optional[str] = None,
        next_sentence: Optional[str] = None,
    ) -> str:
        """
        Non-streaming version of word explanation for mobile/React Native.
        Returns complete explanation text.
        """
        import json

        cache_key = self.get_explain_cache_key(text, sentence, style)
        logger.info(f"[explain_word_sync] cache_key={cache_key}, text={text}")

        # Check cache first
        if cache_key in _explain_cache:
            logger.info(f"[explain_word_sync] Cache hit for {cache_key}")
            return _explain_cache[cache_key]

        logger.info(f"[explain_word_sync] Cache miss, calling LLM...")

        # Build context for explanation
        context_parts = []
        if prev_sentence:
            context_parts.append(f'Previous: "{prev_sentence}"')
        context_parts.append(f'Current: "{sentence}"')
        if next_sentence:
            context_parts.append(f'Next: "{next_sentence}"')
        context = "\n".join(context_parts)

        is_phrase = " " in text.strip()
        item_type = "短语" if is_phrase else "单词"
        item_type_en = "phrase" if is_phrase else "word"

        # Select prompt and max_tokens based on style
        max_gen_tokens = 1000

        if style == "brief":
            prompt = EXPLAIN_PROMPTS["brief"].format(text=text, context=context)
            max_gen_tokens = 300
        elif style == "detailed":
            prompt = EXPLAIN_PROMPTS["detailed"].format(
                text=text, context=context, item_type=item_type
            )
            max_gen_tokens = 2000
        elif style == "simple":
            prompt = EXPLAIN_PROMPTS["simple"].format(
                text=text, context=context, item_type=item_type_en
            )
            max_gen_tokens = 500
        elif style == "chinese_deep":
            prompt = EXPLAIN_PROMPTS["chinese_deep"].format(
                text=text, context=context, item_type=item_type
            )
            max_gen_tokens = 2000
        else:
            template = "default_phrase" if is_phrase else "default_word"
            prompt = EXPLAIN_PROMPTS[template].format(text=text, context=context)
            max_gen_tokens = 1000

        # Get full response from LLM (non-streaming)
        try:
            logger.info(
                f"[explain_word_sync] Creating LLM request, model={self.llm.model_name}"
            )

            response = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_gen_tokens,
                temperature=0.3,
                stream=False,
            )

            full_text = response.choices[0].message.content or ""
            logger.info(
                f"[explain_word_sync] LLM response received, length={len(full_text)}"
            )

            # Cache result
            _explain_cache[cache_key] = full_text

            return full_text

        except Exception as e:
            logger.error(f"Explain sync error: {e}")
            raise

    async def detect_image_suitability(
        self, word: str, sentence: str, context: str = ""
    ) -> dict:
        """Check if a word is suitable for image generation."""
        try:
            prompt = IMAGE_DETECTION_PROMPT.format(
                word=word, sentence=sentence, context=context
            )

            response = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,  # Increased for longer prompts
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            if not content:
                return {"suitable": False, "image_prompt": None}

            try:
                result = json.loads(content)
                # Log the result for debugging
                logger.info(
                    f"[Image Detection] word='{word}', reasoning={result.get('reasoning')}, suitable={result.get('suitable')}, prompt={result.get('image_prompt')[:80] if result.get('image_prompt') else 'N/A'}..."
                )
                return result
            except:
                logger.warning(
                    f"[Image Detection] Failed to parse JSON: {content[:200]}"
                )
                return {"suitable": False, "image_prompt": None}

        except Exception as e:
            logger.error(f"Image detection error: {e}")
            return {"suitable": False, "image_prompt": None}

    # -------------------------------------------------------------------------
    # SRS Interval Calculation
    # -------------------------------------------------------------------------

    # -------------------------------------------------------------------------
    # Overview Generation
    # -------------------------------------------------------------------------

    async def get_or_generate_overview(
        self, db: AsyncSession, title: str, full_text: str, total_sentences: int
    ) -> Dict[str, Any]:
        """
        Generate article overview with English summary and Chinese translation.
        Cache priority: in-memory -> DB -> LLM generation.
        """
        cache_key = self.get_overview_cache_key(title)

        # 1. Check in-memory cache (hot path)
        if cache_key in _overview_cache:
            return _overview_cache[cache_key]

        # 2. Check DB cache
        db_result = await db.execute(
            select(ArticleOverviewCache).where(
                ArticleOverviewCache.title_hash == cache_key
            )
        )
        db_cache = db_result.scalar_one_or_none()
        if db_cache:
            cached = {
                "summary_en": db_cache.summary_en,
                "summary_zh": db_cache.summary_zh,
                "key_topics": db_cache.key_topics,
                "difficulty_hint": db_cache.difficulty_hint,
            }
            _overview_cache[cache_key] = cached  # Warm in-memory cache
            return cached

        # 3. Generate via LLM (streaming)
        # Truncate to first ~500 words for efficiency
        words = full_text.split()
        text_excerpt = " ".join(words[:500]) + ("..." if len(words) > 500 else "")

        prompt = OVERVIEW_PROMPT.format(
            title=title, total_sentences=total_sentences, excerpt=text_excerpt
        )

        full_content = ""
        try:
            stream = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_content += text
                    # We are not streaming back to the router here directly in this method structure,
                    # but the router expects a generator if it wants to stream.
                    # However, to simplify, let's just await the full result for the service method
                    # OR we can change the design.
                    # The original router streamed the overview generation.
                    # For now, let's keep it simple: collect and return.
                    # If streaming is strictly required for UX, we might need a separate stream method.
                    # But typically overview is fast enough or we can live with a short wait.
                    # Wait, the router implementation `generate_overview` returns a StreamingResponse.
                    # If I move this to service, I should probably expose a generator.

            # Parse the accumulated content
            content = full_content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]

            try:
                data = json.loads(content)
                result = {
                    "summary_en": data.get("summary_en", "Unable to generate summary."),
                    "summary_zh": data.get("summary_zh", "无法生成摘要。"),
                    "key_topics": data.get("key_topics", []),
                    "difficulty_hint": data.get("difficulty_hint", ""),
                }
            except json.JSONDecodeError:
                result = {
                    "summary_en": "This article covers various topics. Study the sentences to learn more.",
                    "summary_zh": "本文涵盖多个主题。通过逐句学习了解更多。",
                    "key_topics": [],
                    "difficulty_hint": "Unable to analyze difficulty.",
                }

            # Cache in-memory
            _overview_cache[cache_key] = result

            # Persist to DB
            try:
                db.add(
                    ArticleOverviewCache(
                        title_hash=cache_key,
                        title=title,
                        summary_en=result["summary_en"],
                        summary_zh=result["summary_zh"],
                        key_topics=result["key_topics"],
                        difficulty_hint=result["difficulty_hint"],
                    )
                )
                await db.commit()
            except Exception:
                await db.rollback()  # Ignore duplicate key errors

            return result

        except Exception as e:
            logger.error(f"Overview generation error: {e}")
            raise e

    async def stream_overview_generation(
        self, db: AsyncSession, title: str, full_text: str, total_sentences: int
    ):
        """
        Streams overview generation chunks.
        Yields:
            - JSON string for cached result (immediate done)
            - OR JSON chunks for streaming generation
        """
        cache_key = self.get_overview_cache_key(title)

        # 1. Check caches
        result = None
        if cache_key in _overview_cache:
            result = _overview_cache[cache_key]
        else:
            db_result = await db.execute(
                select(ArticleOverviewCache).where(
                    ArticleOverviewCache.title_hash == cache_key
                )
            )
            db_cache = db_result.scalar_one_or_none()
            if db_cache:
                result = {
                    "summary_en": db_cache.summary_en,
                    "summary_zh": db_cache.summary_zh,
                    "key_topics": db_cache.key_topics,
                    "difficulty_hint": db_cache.difficulty_hint,
                }
                _overview_cache[cache_key] = result

        if result:
            yield json.dumps({"type": "done", "overview": result, "cached": True})
            return

        # 2. Generate
        words = full_text.split()
        text_excerpt = " ".join(words[:500]) + ("..." if len(words) > 500 else "")
        prompt = OVERVIEW_PROMPT.format(
            title=title, total_sentences=total_sentences, excerpt=text_excerpt
        )

        full_content = ""
        try:
            stream = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.3,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    full_content += text
                    yield json.dumps({"type": "chunk", "content": text})

            # Parse and Save
            content = full_content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]

            try:
                data = json.loads(content)
                final_result = {
                    "summary_en": data.get("summary_en", "Unable to generate summary."),
                    "summary_zh": data.get("summary_zh", "无法生成摘要。"),
                    "key_topics": data.get("key_topics", []),
                    "difficulty_hint": data.get("difficulty_hint", ""),
                }
            except json.JSONDecodeError:
                final_result = {
                    "summary_en": "This article covers various topics. Study the sentences to learn more.",
                    "summary_zh": "本文涵盖多个主题。通过逐句学习了解更多。",
                    "key_topics": [],
                    "difficulty_hint": "Unable to analyze difficulty.",
                }

            _overview_cache[cache_key] = final_result

            try:
                db.add(
                    ArticleOverviewCache(
                        title_hash=cache_key,
                        title=title,
                        summary_en=final_result["summary_en"],
                        summary_zh=final_result["summary_zh"],
                        key_topics=final_result["key_topics"],
                        difficulty_hint=final_result["difficulty_hint"],
                    )
                )
                await db.commit()
            except Exception:
                await db.rollback()

            yield json.dumps({"type": "done", "overview": final_result})

        except Exception as e:
            logger.error(f"Overview stream error: {e}")
            yield json.dumps({"type": "error", "message": str(e)})

    # -------------------------------------------------------------------------
    # Collocation Detection
    # -------------------------------------------------------------------------

    async def get_or_detect_collocations(
        self, db: AsyncSession, sentence: str
    ) -> List[Dict[str, Any]]:
        """
        Detect collocations with caching (Memory -> DB -> LLM).
        """
        cache_key = self.get_collocation_cache_key(sentence)

        # 1. Check in-memory
        if cache_key in _collocation_cache:
            return _collocation_cache[cache_key]

        # 2. Check DB
        db_result = await db.execute(
            select(SentenceCollocationCache).where(
                SentenceCollocationCache.sentence_hash == cache_key
            )
        )
        db_cache = db_result.scalar_one_or_none()
        if db_cache:
            _collocation_cache[cache_key] = db_cache.collocations
            return db_cache.collocations

        # 3. Generate
        words = sentence.split()
        word_list_str = "\n".join([f"{i}: {w}" for i, w in enumerate(words)])
        prompt = COLLOCATION_PROMPT.format(sentence=sentence, word_list=word_list_str)

        try:
            response = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.1,
            )
            content = response.choices[0].message.content.strip()

            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0]

            collocations = json.loads(content)

            # Validation
            valid_collocations = []
            for c in collocations:
                if all(k in c for k in ["text", "start_word_idx", "end_word_idx"]):
                    valid_collocations.append(c)

            # Cache
            _collocation_cache[cache_key] = valid_collocations

            try:
                db.add(
                    SentenceCollocationCache(
                        sentence_hash=cache_key,
                        sentence_preview=sentence[:100],
                        collocations=valid_collocations,
                    )
                )
                await db.commit()
            except Exception:
                await db.rollback()

            return valid_collocations

        except Exception as e:
            logger.error(f"Collocation detection error: {e}")
            return []

    # -------------------------------------------------------------------------
    # Diagnosis & Profiling
    # -------------------------------------------------------------------------

    async def analyze_user_history(
        self, db: AsyncSession, user_id: str
    ) -> Dict[str, Optional[str]]:
        """
        Analyze recent user history to find patterns in learning gaps.
        """
        try:
            result = await db.execute(
                select(SentenceLearningRecord)
                .where(
                    SentenceLearningRecord.user_id == user_id,
                    SentenceLearningRecord.initial_response == "unclear",
                )
                .order_by(SentenceLearningRecord.created_at.desc())
                .limit(20)
            )
            records = result.scalars().all()

            if not records:
                return {"common_gap": None}

            vocab_count = 0
            structure_count = 0

            for r in records:
                if r.diagnosed_gap_type == "vocabulary":
                    vocab_count += 1
                elif r.diagnosed_gap_type == "structure":
                    structure_count += 1

            total = len(records)
            if vocab_count / total > 0.6:
                return {"common_gap": "vocabulary"}
            elif structure_count / total > 0.4:
                return {"common_gap": "structure"}

            # Length correlation
            long_sentence_fail_count = sum(1 for r in records if r.word_count > 20)
            if long_sentence_fail_count / total > 0.5:
                return {"common_gap": "structure"}

            return {"common_gap": "mixed"}

        except Exception:
            return {"common_gap": None}

    async def perform_deep_diagnosis(
        self,
        db: AsyncSession,
        user_id: str,
        initial: str,
        choice: Optional[str],
        simplified: Optional[str],
        word_clicks: List[str],
        phrase_clicks: List[str],
        interactions: List[Dict],
        dwell_ms: int,
        word_count: int,
        max_simplify_stage: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive diagnosis logic.
        """
        gap_type = None
        confidence = 0.0
        patterns = []

        # 1. Base Diagnosis
        if initial == "clear":
            gap_type = None
            confidence = 1.0
        elif choice == "vocabulary":
            gap_type = "vocabulary"
            confidence = 0.9 if simplified == "got_it" else 0.7
        elif choice == "grammar":
            gap_type = "structure"
            confidence = 0.9 if simplified == "got_it" else 0.7
        elif choice == "meaning":
            gap_type = "meaning"
            confidence = 0.9 if simplified == "got_it" else 0.7
        elif choice == "collocation":
            gap_type = "collocation"
            confidence = 0.9
        elif choice == "both":
            gap_type = "fundamental"
            confidence = 0.7

        # 2. Implicit Signals
        if phrase_clicks:
            gap_type = "collocation"
            confidence = 0.85
            patterns.append("phrase_lookup")

        for event in interactions:
            target = event.get("text") or event.get("word")
            if target and isinstance(target, str) and " " in target.strip():
                if gap_type != "collocation":
                    gap_type = "collocation"
                    confidence = 0.8
                    patterns.append("multi_word_query")
                break

        if word_count > 0:
            ms_per_word = dwell_ms / word_count
            if ms_per_word > 800 and initial == "clear":
                confidence = 0.6
                patterns.append("slow_reading")

        deep_dive_count = sum(
            1 for e in interactions if e.get("style") in ["chinese_deep", "simple"]
        )
        if deep_dive_count > 0:
            if gap_type is None:
                gap_type = "vocabulary"
                confidence = 0.6
                patterns.append("deep_dive_needed")
            elif gap_type == "vocabulary":
                patterns.append("nuance_confusion")

        if max_simplify_stage is not None:
            if max_simplify_stage >= 3:
                patterns.append("chinese_dive_needed")
                confidence = min(1.0, confidence * 1.2)
            elif max_simplify_stage == 2:
                patterns.append("detailed_explanation_needed")
                confidence = min(1.0, confidence * 1.1)

        # 3. History
        if gap_type == "fundamental" or choice == "both":
            history = await self.analyze_user_history(db, user_id)
            if history["common_gap"]:
                patterns.append(f"history_{history['common_gap']}")
                if history["common_gap"] == "vocabulary":
                    gap_type = "fundamental (vocab-heavy)"
                elif history["common_gap"] == "structure":
                    gap_type = "fundamental (structure-heavy)"

        # 4. Length Bias
        if word_count > 25 and gap_type in [
            "fundamental",
            "fundamental (structure-heavy)",
        ]:
            patterns.append("long_sentence_struggle")
            gap_type = "structure"
            confidence = 0.8

        return {"gap_type": gap_type, "confidence": confidence, "patterns": patterns}

    async def update_user_profile_deep(
        self,
        db: AsyncSession,
        user_id: str,
        diagnosis: Dict[str, Any],
        word_clicks: List[str],
    ):
        """
        Updates profile with granular insights from the deep diagnosis.
        """
        result = await db.execute(
            select(UserComprehensionProfile).where(
                UserComprehensionProfile.user_id == user_id
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            profile = UserComprehensionProfile(user_id=user_id)
            db.add(profile)

        gap = diagnosis["gap_type"]
        patterns = diagnosis["patterns"]

        # 1. Update Scores
        if gap == "vocabulary" or gap == "collocation":
            current_vocab = float(profile.vocabulary_score or 0.0)
            profile.vocabulary_score = max(0.0, current_vocab - 0.1)
        elif gap == "structure":
            current_grammar = float(profile.grammar_score or 0.0)
            profile.grammar_score = max(0.0, current_grammar - 0.1)
        elif gap is None:
            current_overall = float(profile.overall_score or 0.0)
            profile.overall_score = current_overall + 0.01

        # 2. Update Weak Topics
        if word_clicks:
            current_weak_topics = (
                list(profile.weak_vocabulary_topics)
                if profile.weak_vocabulary_topics
                else []
            )
            for word in word_clicks:
                if word not in current_weak_topics:
                    current_weak_topics.append(word)
            profile.weak_vocabulary_topics = current_weak_topics[-50:]

            # Word Proficiency
            for word in word_clicks:
                wp_result = await db.execute(
                    select(WordProficiency).where(
                        WordProficiency.user_id == user_id, WordProficiency.word == word
                    )
                )
                wp = wp_result.scalar_one_or_none()
                if wp:
                    wp.exposure_count += 1
                    wp.huh_count += 1
                    wp.last_seen_at = func.now()
                    wp.difficulty_score = float(wp.huh_count) / max(
                        1, wp.exposure_count
                    )
                    if wp.difficulty_score > 0.3:
                        wp.status = "learning"
                else:
                    db.add(
                        WordProficiency(
                            user_id=user_id,
                            word=word,
                            exposure_count=1,
                            huh_count=1,
                            difficulty_score=1.0,
                            status="new",
                        )
                    )

        # 3. Update Common Gaps
        if patterns:
            current_gaps = (
                list(profile.common_grammar_gaps) if profile.common_grammar_gaps else []
            )
            for p in patterns:
                current_gaps.append(p)
            profile.common_grammar_gaps = current_gaps[-20:]

    # -------------------------------------------------------------------------
    # SRS Interval Calculation
    # -------------------------------------------------------------------------

    def calculate_review_interval(
        self, review_count: int, gap_type: Optional[str] = None
    ) -> timedelta:
        """
        Smart SRS interval based on review count and gap type.
        - Collocations: hardest to retain, shortest intervals
        - Meaning: medium difficulty (context understanding)
        - Vocabulary/Structure: default intervals
        """
        base_intervals = [
            1,
            3,
            7,
            14,
            30,
            60,
        ]  # days (default for vocabulary, structure, fundamental)

        if gap_type == "collocation":
            # Collocations are hardest to remember
            base_intervals = [1, 2, 4, 7, 14, 30]
        elif gap_type == "meaning":
            # Context/meaning gaps need slightly shorter intervals (harder than vocab)
            base_intervals = [1, 2, 5, 10, 21, 45]

        idx = min(review_count, len(base_intervals) - 1)
        return timedelta(days=base_intervals[idx])


# =============================================================================
# Singleton Instance
# =============================================================================

sentence_study_service = SentenceStudyService()
