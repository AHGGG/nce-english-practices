"""
Sentence Study Service Layer

Business logic extracted from sentence_study.py router.
Contains LLM streaming, caching, and diagnosis utilities.
"""
import hashlib
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.services.llm import llm_service
from app.models.orm import (
    SentenceLearningRecord, 
    SentenceCollocationCache, 
    ArticleOverviewCache,
    UserComprehensionProfile,
    WordProficiency
)

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
    "vocabulary_stage1": '''Rewrite this sentence using simpler vocabulary (COCA 0-3000 most common words), 
but keep the exact grammatical structure unchanged:
"{sentence}"

Return ONLY the simplified sentence, no explanation.''',

    "grammar_stage1": '''Break this sentence into 2-3 shorter, simpler sentences 
while keeping the same vocabulary words:
"{sentence}"

Return ONLY the simplified sentences, no explanation.''',

    "meaning_stage1": '''The learner knows the words and grammar, but doesn't understand what this sentence MEANS in context.

Sentence: "{sentence}"

Context:
{context}

Your job: Help them "get it". Provide:

1. **Paraphrase**: Restate the sentence in completely different words (same meaning, different expression)
2. **The Point**: What is the author trying to say? What's the takeaway?
3. **Hidden Info**: Explain any cultural references, implied assumptions, or "reading between the lines"

Keep it SHORT and CLEAR. Write like you're explaining to a smart friend who missed something obvious.''',

    "both_stage1": '''Explain this sentence in the simplest possible English (A1 level).
Context:
{context}

Return ONLY a simple explanation of the CURRENT sentence, no extra text.''',

    "stage2": '''The learner still doesn't understand this sentence after a simple explanation.
Please provide a MORE DETAILED explanation with:
1. Break down the key phrases/idioms
2. Explain the grammar structure
3. Give a similar example sentence

Context:
{context}

Keep explanations in simple English. Format:
📖 Key phrases: ...
🔧 Structure: ...
💡 Similar example: ...''',

    "stage3": '''学习者经过两次解释仍然不理解这个句子，请用中文提供深度解释：

句子："{sentence}"

上下文：
{context}

请提供：
1. 句子的完整中文翻译
2. 语法结构分析
3. 关键词组/搭配的解释
4. 为什么这个表达对中国学习者可能困难

用中文回答。'''
}


EXPLAIN_PROMPTS = {
    "default_word": '''Explain "{text}" in this context:

{context}

Respond in this EXACT format (each section on its own line):

📖 MEANING:
[2-3 sentence explanation of what it means here]

💡 EXAMPLES:
- [Example sentence 1]
- [Example sentence 2]''',

    "default_phrase": '''Explain the phrase "{text}" in this context:

{context}

Respond in this EXACT format (each section on its own line):

📖 MEANING:
[2-3 sentence explanation of what this phrase means here]

💡 EXAMPLES:
- [Example sentence 1]
- [Example sentence 2]''',

    "simple": '''Explain the {item_type} "{text}" in the context of the sentence below.
Explanation must be in SIMPLE ENGLISH, suitable for a beginner learner.
Use simple vocabulary and short sentences.

Context:
{context}

Target: "{text}"

Give only the explanation, no preamble.''',

    # Brief style - Stage 1 for Review Queue (very concise, 1 sentence)
    "brief": '''Give a very brief (1 sentence) explanation of "{text}" in this context:

Context:
{context}

Target: "{text}"

Respond in simple English, one sentence only.''',

    # Detailed style - Stage 3 for Review Queue (Chinese deep explanation)
    "detailed": '''请详细讲解句子中"{text}"这个{item_type}的含义和用法。
结合以下上下文进行全方位的中文讲解：

上下文：
{context}

讲解要求：
1. 解释在当前语境下的确切含义
2. 分析语法结构或搭配用法
3. 给出一个类似用法的例句
4. 为什么这个表达对中国学习者可能困难

目标词汇："{text}"

直接给出讲解内容，不要有多余的开场白。''',

    "chinese_deep": '''请详细讲解句子中"{text}"这个{item_type}的含义和用法。
结合以下上下文进行全方位的中文讲解：

上下文：
{context}

讲解要求：
1. 解释在当前语境下的确切含义
2. 分析语法结构或搭配用法
3. 如果有引申义或特殊语气，请指出
4. 使用中文回答，讲解要深入浅出

目标词汇："{text}"

直接给出讲解内容，不要有多余的开场白。'''
}


COLLOCATION_PROMPT = '''Analyze this sentence and identify ALL common English collocations, phrasal verbs, and fixed expressions.

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
Return ONLY valid JSON array, no explanation.'''


OVERVIEW_PROMPT = '''Analyze this article and provide a brief overview to help a learner understand the context before studying it sentence by sentence.

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

Return ONLY the JSON, no markdown formatting.'''


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
    
    def get_simplify_cache_key(self, sentence: str, simplify_type: str, stage: int) -> str:
        return hashlib.md5(f"{sentence}|{simplify_type}|{stage}".encode()).hexdigest()
    
    def get_explain_cache_key(self, text: str, sentence: str, style: str) -> str:
        return hashlib.md5(f"{text}|{sentence}|{style}".encode()).hexdigest()
    
    def get_overview_cache_key(self, title: str) -> str:
        return hashlib.md5(title.encode()).hexdigest()
    
    def get_collocation_cache_key(self, sentence: str) -> str:
        return hashlib.md5(sentence.encode()).hexdigest()
    
    # -------------------------------------------------------------------------
    # Simplify Streaming
    # -------------------------------------------------------------------------
    
    async def stream_simplification(
        self,
        sentence: str,
        simplify_type: str,
        stage: int,
        prev_sentence: Optional[str] = None,
        next_sentence: Optional[str] = None
    ):
        """
        Stream LLM simplification with caching support.
        Yields SSE-formatted chunks.
        """
        stage = max(1, min(3, stage))  # Clamp to 1-3
        cache_key = self.get_simplify_cache_key(sentence, simplify_type, stage)
        
        # Check cache
        if cache_key in _simplify_cache:
            yield json.dumps({'type': 'chunk', 'content': _simplify_cache[cache_key]})
            yield json.dumps({'type': 'done', 'stage': stage, 'has_next_stage': stage < 3, 'cached': True})
            return
        
        # Build context
        context_parts = []
        if prev_sentence:
            context_parts.append(f'Previous sentence: "{prev_sentence}"')
        context_parts.append(f'Current sentence: "{sentence}"')
        if next_sentence:
            context_parts.append(f'Next sentence: "{next_sentence}"')
        context = "\n".join(context_parts)
        
        # Select prompt
        if stage == 1:
            if simplify_type == "vocabulary":
                prompt = SIMPLIFY_PROMPTS["vocabulary_stage1"].format(sentence=sentence)
            elif simplify_type == "grammar":
                prompt = SIMPLIFY_PROMPTS["grammar_stage1"].format(sentence=sentence)
            elif simplify_type == "meaning":
                prompt = SIMPLIFY_PROMPTS["meaning_stage1"].format(sentence=sentence, context=context)
            else:
                prompt = SIMPLIFY_PROMPTS["both_stage1"].format(context=context)
        elif stage == 2:
            prompt = SIMPLIFY_PROMPTS["stage2"].format(context=context)
        else:
            prompt = SIMPLIFY_PROMPTS["stage3"].format(sentence=sentence, context=context)
        
        # Stream from LLM
        full_text = ""
        try:
            # Determine max tokens based on stage
            if stage == 3:
                max_gen_tokens = 1500
            elif stage == 2:
                max_gen_tokens = 800
            else:
                max_gen_tokens = 300

            stream = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_gen_tokens,
                temperature=0.3,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_text += content
                    yield json.dumps({'type': 'chunk', 'content': content})
            
            # Cache result
            _simplify_cache[cache_key] = full_text
            yield json.dumps({'type': 'done', 'stage': stage, 'has_next_stage': stage < 3})
            
        except Exception as e:
            logger.error(f"Simplify stream error: {e}")
            yield json.dumps({'type': 'error', 'message': str(e)})
    
    # -------------------------------------------------------------------------
    # Word Explanation Streaming
    # -------------------------------------------------------------------------
    
    async def stream_word_explanation(
        self,
        text: str,
        sentence: str,
        style: str = "default",
        prev_sentence: Optional[str] = None,
        next_sentence: Optional[str] = None
    ):
        """
        Stream LLM explanation of a word/phrase with caching.
        Yields raw text chunks (not JSON).
        """
        cache_key = self.get_explain_cache_key(text, sentence, style)
        
        # Check cache
        if cache_key in _explain_cache:
            cached = _explain_cache[cache_key]
            for line in cached.split('\n'):
                yield line
                yield "\n"
            return
        
        # Build context
        context_parts = []
        if prev_sentence:
            context_parts.append(f'Previous: "{prev_sentence}"')
        context_parts.append(f'Current: "{sentence}"')
        if next_sentence:
            context_parts.append(f'Next: "{next_sentence}"')
        context = "\n".join(context_parts)
        
        is_phrase = ' ' in text.strip()
        item_type = "短语" if is_phrase else "单词"
        item_type_en = "phrase" if is_phrase else "word"
        
        # Select prompt based on style
        if style == "brief":
            # Stage 1: Very concise, 1 sentence
            prompt = EXPLAIN_PROMPTS["brief"].format(text=text, context=context)
        elif style == "detailed":
            # Stage 3: Chinese deep explanation
            prompt = EXPLAIN_PROMPTS["detailed"].format(text=text, context=context, item_type=item_type)
        elif style == "simple":
            prompt = EXPLAIN_PROMPTS["simple"].format(text=text, context=context, item_type=item_type_en)
        elif style == "chinese_deep":
            prompt = EXPLAIN_PROMPTS["chinese_deep"].format(text=text, context=context, item_type=item_type)
        else:
            # Default style (Stage 2 in Review Queue, or standard word explanation)
            template = "default_phrase" if is_phrase else "default_word"
            prompt = EXPLAIN_PROMPTS[template].format(text=text, context=context)
        
        # Stream from LLM
        full_text = ""
        try:
            stream = await self.llm.async_client.chat.completions.create(
                model=self.llm.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3,
                stream=True
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_text += content
                    yield content
            
            # Cache result
            _explain_cache[cache_key] = full_text
            
        except Exception as e:
            logger.error(f"Explain stream error: {e}")
            yield f"[ERROR] {str(e)}"
    
    # -------------------------------------------------------------------------
    # SRS Interval Calculation
    # -------------------------------------------------------------------------
    
    def calculate_review_interval(self, review_count: int, gap_type: Optional[str] = None) -> timedelta:
        """
        Smart SRS interval based on review count and gap type.
        Collocations are harder to remember, use shorter intervals.
        """
        base_intervals = [1, 3, 7, 14, 30, 60]  # days
        
        if review_count >= len(base_intervals):
            interval_days = base_intervals[-1]
        else:
            interval_days = base_intervals[review_count]
        
        # Collocations need more practice
        if gap_type == "collocation":
            interval_days = max(1, int(interval_days * 0.7))
        
        return timedelta(days=interval_days)


# =============================================================================
# Singleton Instance
# =============================================================================

sentence_study_service = SentenceStudyService()
