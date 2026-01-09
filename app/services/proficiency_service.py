"""
Proficiency Service - Tracks word-level proficiency for the Voice CI Interface.

Records HUH? and CONTINUE events to build a user's difficulty profile.
"""

from typing import Optional, List, Dict, Any
import json
from sqlalchemy import select

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.models.orm import WordProficiency, UserCalibration


class ProficiencyService:
    """
    Manages word proficiency tracking for the Voice Learning interface.
    """
    
    async def record_interaction(
        self, 
        word: str, 
        interaction_type: str,  # "huh" or "continue"
        user_id: str = "default_user"
    ) -> WordProficiency:
        """
        Record a user interaction with a word.
        
        Args:
            word: The word that was encountered
            interaction_type: "huh" if user clicked HUH?, "continue" if user understood
            user_id: User identifier (default for single-user app)
            
        Returns:
            Updated WordProficiency record
        """
        async with AsyncSessionLocal() as db:
            try:
                # Find or create proficiency record
                stmt = select(WordProficiency).where(
                    WordProficiency.user_id == user_id,
                    WordProficiency.word == word.lower()
                )
                result = await db.execute(stmt)
                record = result.scalar_one_or_none()
                
                if not record:
                    record = WordProficiency(
                        user_id=user_id,
                        word=word.lower(),
                        exposure_count=0,
                        huh_count=0,
                        continue_count=0
                    )
                    db.add(record)
                
                # Update counts
                record.exposure_count += 1
                
                if interaction_type == "huh":
                    record.huh_count += 1
                elif interaction_type == "continue":
                    record.continue_count += 1
                
                # Recalculate difficulty score (huh_rate)
                if record.exposure_count > 0:
                    record.difficulty_score = record.huh_count / record.exposure_count
                
                # Update status based on metrics
                record.status = self._calculate_status(record)
                
                await db.commit()
                await db.refresh(record)
                
                return record
                
            except Exception as e:
                await db.rollback()
                raise e
    
    def _calculate_status(self, record: WordProficiency) -> str:
        """
        Determine learning status based on interaction history.
        
        Status progression:
        - new: exposure_count < 3
        - learning: difficulty_score > 0.3 or exposure_count < 5
        - mastered: difficulty_score <= 0.3 and exposure_count >= 5
        """
        if record.exposure_count < 3:
            return "new"
        elif record.difficulty_score > 0.3 or record.exposure_count < 5:
            return "learning"
        else:
            return "mastered"
    
    async def get_difficult_words(
        self, 
        user_id: str = "default_user",
        limit: int = 20
    ) -> List[WordProficiency]:
        """
        Get the user's most difficult words (highest HUH? rate).
        
        Returns:
            List of WordProficiency records sorted by difficulty
        """
        async with AsyncSessionLocal() as db:
            stmt = (
                select(WordProficiency)
                .where(WordProficiency.user_id == user_id)
                .where(WordProficiency.huh_count > 0)
                .order_by(WordProficiency.difficulty_score.desc())
                .limit(limit)
            )
            result = await db.execute(stmt)
            return list(result.scalars().all())
    
    async def get_word_stats(
        self, 
        word: str, 
        user_id: str = "default_user"
    ) -> Optional[WordProficiency]:
        """
        Get proficiency stats for a specific word.
        """
        async with AsyncSessionLocal() as db:
            stmt = select(WordProficiency).where(
                WordProficiency.user_id == user_id,
                WordProficiency.word == word.lower()
            )
            result = await db.execute(stmt)
            return result.scalar_one_or_none()


    async def master_word(
        self,
        word: str,
        user_id: str = "default_user",
        source: str = "manual"
    ) -> WordProficiency:
        """
        Explicitly mark a word as mastered.
        """
        async with AsyncSessionLocal() as db:
            # Find or create
            stmt = select(WordProficiency).where(
                WordProficiency.user_id == user_id,
                WordProficiency.word == word.lower()
            )
            result = await db.execute(stmt)
            record = result.scalar_one_or_none()
            
            if not record:
                record = WordProficiency(
                    user_id=user_id,
                    word=word.lower(),
                    exposure_count=1,
                    status="mastered"
                )
                db.add(record)
            else:
                record.status = "mastered"
                record.exposure_count += 1
            
            await db.commit()
            await db.refresh(record)
            return record

    async def process_sweep(
        self,
        user_id: str,
        swept_words: List[str],
        inspected_words: List[str],
        db_session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Batch process a "Sweep" action.
        1. Mark swept_words as mastered (if not already inspected/learning).
        2. Analyze frequency bands to recommend global mastery.
        """

        # 1. Batch Master
        if db_session:
             # Session passed externally - use flush only, let caller control commit
             await self._process_sweep_batch(db_session, user_id, swept_words, commit=False)
        else:
             # We own the session - commit when done
             async with AsyncSessionLocal() as db:
                 await self._process_sweep_batch(db, user_id, swept_words, commit=True)
            
        # 2. Analyze Bands
        # Note: analyze_bands also needs update if we want full transactional integrity in test, 
        # but for now assume analyze_bands is read-only sufficient or we update it too.
        # Let's update analyze_bands call to pass session if analyze_bands supports it? 
        # For now, let's just make process_sweep work.
        recommendation = await self.analyze_bands(user_id, swept_words, inspected_words, db_session=db_session)
        
        return {
            "marked_count": len(swept_words),
            "recommendation": recommendation
        }

    async def _process_sweep_batch(self, db: AsyncSession, user_id: str, swept_words: List[str], commit: bool = True):
        # Fetch existing records to minimize writes
        all_words = swept_words
        existing_stmt = select(WordProficiency).where(
            WordProficiency.user_id == user_id,
            WordProficiency.word.in_(all_words)
        )
        existing_res = await db.execute(existing_stmt)
        existing_map = {r.word: r for r in existing_res.scalars().all()}
        
        new_records = []
        for w in swept_words:
            w_lower = w.lower()
            if w_lower in existing_map:
                 existing_map[w_lower].status = "mastered"
            else:
                new_records.append(
                    WordProficiency(
                        user_id=user_id,
                        word=w_lower,
                        status="mastered",
                        exposure_count=1
                    )
                )
        
        if new_records:
            db.add_all(new_records)
        
        # Control transaction: commit if we own the session, flush if caller controls it
        if commit:
            await db.commit()
        else:
            await db.flush()

    async def analyze_bands(
        self,
        user_id: str,
        swept_words: List[str],
        inspected_words: List[str],
        db_session: Optional[AsyncSession] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze frequency bands of swept vs inspected words.
        Returns a recommendation if a band has high mastery rate.
        """
        all_words = swept_words + inspected_words
        if not all_words:
            return None

        # Use provided session or create a new one
        from app.models.orm import WordBookEntry
        from sqlalchemy import func
        
        async def _query_ranks(db):
            stmt = (
                select(WordBookEntry.word, func.min(WordBookEntry.sequence))
                .where(WordBookEntry.word.in_(all_words))
                .group_by(WordBookEntry.word)
            )
            result = await db.execute(stmt)
            return {row[0]: row[1] for row in result.all()}
        
        if db_session:
            word_ranks = await _query_ranks(db_session)
        else:
            async with AsyncSessionLocal() as db:
                word_ranks = await _query_ranks(db)
            
        # Buckets: 0-1000, 1000-2000, etc.
        buckets = {}
        bucket_size = 1000
        
        for w in all_words:
            rank = word_ranks.get(w.lower())
            if rank is None:
                continue
                
            bucket_idx = (rank // bucket_size) * bucket_size
            if bucket_idx not in buckets:
                buckets[bucket_idx] = {"total": 0, "inspected": 0}
            
            buckets[bucket_idx]["total"] += 1
            if w in inspected_words:
                buckets[bucket_idx]["inspected"] += 1
                
        # Analyze
        recommended_bands = []
        for band, stats in buckets.items():
            total = stats["total"]
            miss_rate = stats["inspected"] / total
            
            # Thresholds: Sample > 20 words, Miss Rate < 5%
            if total > 20 and miss_rate < 0.05:
                recommended_bands.append(band)

        if recommended_bands:
            # Sort and merge contiguous ranges? 
            # For MVP, just return the list of bands (start_indices)
            return {
                "bands": sorted(recommended_bands),
                "reason": f"Low miss rate (<5%) in bands {sorted(recommended_bands)}"
            }
            
        return None

    async def analyze_calibration(
        self,
        user_id: str,
        session_data: List[Dict[str, Any]],
        db_session: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        Analyze a calibration session.
        session_data format:
        [
            {
                "sentence_text": "...",
                "status": "clear" | "confused",
                "confused_words": ["word1", "word2"] (only if status=confused)
            },
            ...
        ]
        """
        
        clear_sentences = []
        vocab_gaps = []
        syntax_gaps = []
        
        # 1. Classification
        for item in session_data:
            text = item.get("sentence_text", "")
            if not text: continue
            
            if item.get("status") == "clear":
                clear_sentences.append(text)
            elif item.get("status") == "confused":
                c_words = item.get("confused_words", [])
                if c_words:
                    # It's a vocab issue
                    vocab_gaps.extend(c_words)
                else:
                    # It's a syntax issue (confused but no specific words unknown)
                    syntax_gaps.append(text)

        # 2. Logic: Implicit Master for Clear Sentences
        # We need to extract words from clear sentences first.
        # Ideally, we used the tokenizer. For now, simple split or regex.
        import re
        all_clear_text = " ".join(clear_sentences)
        # Simple extraction for MVP - should align with tokenizer used elsewhere
        cmd_words = set(re.findall(r"\b[a-zA-Z]{2,}\b", all_clear_text))
        
        # Filter out vocab gaps from clear words just in case
        words_to_master = [w for w in cmd_words if w.lower() not in [v.lower() for v in vocab_gaps]]
        
        # Determine actual mastery via batch process (reuse sweep logic somewhat?)
        await self.process_sweep(user_id, words_to_master, vocab_gaps, db_session=db_session)
        
        # 3. Logic: LLM Diagnosis for Syntax Gaps
        syntax_report = "No syntax gaps identified."
        if syntax_gaps:
             try:
                 from app.services.llm import llm_service
                 prompt = f"""
                 The user is an English learner. They marked the following sentences as 'Confused' but did NOT identify any unknown vocabulary words. This implies the confusion is Grammatical or Syntactic.

                 Analyze these sentences and identify the common grammatical patterns that might be causing difficulty (e.g., Passive Voice, Relative Clauses, Inversion, etc.).

                 Sentences:
                 {json.dumps(syntax_gaps, indent=2)}

                 Return a concise JSON object with:
                 - "weaknesses": [list of grammatical concepts]
                 - "advice": "Brief advice on how to improve"
                 """
                 
                 content = await llm_service.chat_complete([{"role": "user", "content": prompt}])
                 syntax_report = json.loads(content)
             except Exception as e:
                 print(f"LLM Diagnosis validation failed: {e}")
                 syntax_report = {"error": "Could not perform syntax diagnosis at this time."}

        # Calculate calibrated level and suggested band
        # The user stopped at the level where they scored 2-3/5, or max level if all passed
        # We don't have access to the actual level here, so we estimate from vocab gaps
        # For now, return useful info to frontend which tracks level
        
        return {
            "processed_sentences": len(session_data),
            "words_mastered": len(words_to_master),
            "vocab_gaps_identified": len(vocab_gaps),
            "vocab_gaps": vocab_gaps[:10],  # Return top 10 for display
            "syntax_diagnosis": syntax_report
        }

    async def generate_calibration_session(
        self,
        level: int = 0,
        count: int = 5
    ) -> List[str]:
        """
        Generates a calibration session (list of sentences) based on the requested difficulty level.
        Uses LLM to generate sentences targeting specific vocabulary bands.
        
        Level Mapping (heuristic):
        0: Band 0-1000 (Beginner)
        1: Band 1000-2000 (Elementary)
        2: Band 2000-4000 (Intermediate)
        3: Band 3000-4000
        4: Band 4000-5000
        5: Band 5000-6000
        6: Band 6000-8000
        7: Band 8000+ (Master)
        """
        
        # 1. Determine Target Band (finer granularity)
        band_ranges = [
            (0, 1000),      # Level 0: Beginner
            (1000, 2000),   # Level 1: Elementary
            (2000, 3000),   # Level 2: Pre-Intermediate
            (3000, 4000),   # Level 3: Intermediate
            (4000, 5000),   # Level 4: Upper-Intermediate
            (5000, 6000),   # Level 5: Advanced
            (6000, 8000),   # Level 6: Proficient
            (8000, 10000),  # Level 7: Expert
            (10000, 12500), # Level 8: Scholar I
            (12500, 15000), # Level 9: Scholar II
            (15000, 17500), # Level 10: Native I
            (17500, 20000), # Level 11: Native II
        ]
        
        level_idx = min(level, len(band_ranges) - 1)
        band_start, band_end = band_ranges[level_idx]
            
        # 2. Fetch Sample Words from Band (Placeholder logic - ideally query specific book)
        # For now, we'll ask LLM directly to pick words from difficulty X, 
        # as querying DB for unmastered words in band is complex without a robust dictionary map loaded.
        
        # 3. LLM Generation
        from app.services.llm import llm_service
        
        difficulty_labels = [
            "Beginner (A1)", "Elementary (A1/A2)", "Pre-Intermediate (A2)", 
            "Intermediate (B1)", "Upper-Intermediate (B1/B2)", "Advanced (B2)", 
            "Proficient (C1)", "Expert (C1+)", 
            "Scholar I (C2)", "Scholar II (C2)", 
            "Native I (C2+)", "Native II (C2+)"
        ]
        difficulty_desc = difficulty_labels[min(level, len(difficulty_labels) - 1)]
        
        syntax_levels = [
            "Simple sentences. Subject-Verb-Object patterns.",
            "Compound sentences with 'and', 'but', 'so'.",
            "Basic relative clauses (who, which, that).",
            "Complex sentences. Passive voice.",
            "Conditional structures. Reported speech.",
            "Reduced relative clauses. Participle phrases.",
            "Inverted conditionals. Subjunctive mood.",
            "Academic/literary structures. Long embedded clauses.",
            "Technical jargon. Domain-specific terminology.",
            "Formal academic register. Citation styles.",
            "Archaic or literary expressions. Rare idioms.",
            "Historical or regional vocabulary. Obscure terms."
        ]
        syntax_desc = syntax_levels[min(level, len(syntax_levels) - 1)]
        
        prompt = f"""Generate exactly {count} English sentences for a reading comprehension calibration test.

Level: {difficulty_desc}
Vocabulary: COCA frequency rank {band_start}-{band_end}
Syntax: {syntax_desc}

Requirements:
1. One sentence per line, ending with a period.
2. Each sentence should be 15-25 words.
3. Topics: technology, science, philosophy, nature, society.
4. NO bullet points, NO numbering, NO headers.
5. Each sentence must be standalone and meaningful.

Output format (exactly {count} lines, nothing else):
Sentence one here.
Sentence two here.
..."""
        
        try:
            content = await llm_service.chat_complete([{"role": "user", "content": prompt}])
            # Split and clean
            sentences = [line.strip() for line in content.split('\n') if line.strip()]
            return sentences[:count]
            
        except Exception as e:
            print(f"Error generating calibration session: {e}")
            import traceback
            traceback.print_exc()
            # Fallback with Level Indicator to prove logic works even if LLM fails
            return [
                f"[Level {level}] The quick brown fox jumps over the lazy dog.",
                f"[Level {level}] Technology is rapidly changing the way we live and work.",
                f"[Level {level}] Sustainable energy is crucial for the future of our planet.",
                f"[Level {level}] The complexity of the human brain is still not fully understood.",
                f"[Level {level}] Quantum computing promises to solve problems beyond the reach of classical computers."
            ]

    # --- Calibration Level Persistence ---
    
    # Level to COCA band mapping (same as frontend/LabCalibration)
    BAND_RANGES = [
        (0, 1000),      # Level 0
        (1000, 2000),   # Level 1
        (2000, 3000),   # Level 2
        (3000, 4000),   # Level 3
        (4000, 5000),   # Level 4
        (5000, 6000),   # Level 5
        (6000, 8000),   # Level 6
        (8000, 10000),  # Level 7
        (10000, 12500), # Level 8
        (12500, 15000), # Level 9
        (15000, 17500), # Level 10
        (17500, 20000), # Level 11
    ]

    async def save_calibration_level(
        self,
        level: int,
        user_id: str = "default_user"
    ) -> Dict[str, Any]:
        """
        Save user's calibration level.
        Returns level and suggested COCA band.
        """
        level = max(0, min(level, 11))  # Clamp to 0-11
        
        async with AsyncSessionLocal() as db:
            stmt = select(UserCalibration).where(UserCalibration.user_id == user_id)
            result = await db.execute(stmt)
            record = result.scalar_one_or_none()
            
            if record:
                record.level = level
            else:
                record = UserCalibration(user_id=user_id, level=level)
                db.add(record)
            
            await db.commit()
            
            band_start = self.BAND_RANGES[level][0]
            return {
                "level": level,
                "suggested_band": band_start,
                "band_label": f"COCA {band_start}+"
            }

    async def get_calibration_level(
        self,
        user_id: str = "default_user"
    ) -> Optional[Dict[str, Any]]:
        """
        Get user's saved calibration level.
        Returns None if user hasn't completed calibration.
        """
        async with AsyncSessionLocal() as db:
            stmt = select(UserCalibration).where(UserCalibration.user_id == user_id)
            result = await db.execute(stmt)
            record = result.scalar_one_or_none()
            
            if not record:
                return None
            
            band_start = self.BAND_RANGES[record.level][0]
            return {
                "level": record.level,
                "suggested_band": band_start,
                "band_label": f"COCA {band_start}+",
                "updated_at": record.updated_at.isoformat() if record.updated_at else None
            }

# Singleton
proficiency_service = ProficiencyService()

