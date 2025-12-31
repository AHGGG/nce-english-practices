import asyncio
import uuid
import copy
from typing import List, AsyncGenerator
from fastapi.concurrency import run_in_threadpool

from app.services.aui_events import (
    AUIEvent, StreamStartEvent, StreamEndEvent, create_snapshot_event, 
    StateDeltaEvent, create_state_diff, create_activity_delta
)
from app.services.dictionary import dict_manager
from app.services.collins_parser import collins_parser
from app.services.ldoce_parser import ldoce_parser
from app.services.word_list_service import word_list_service

class VocabularyMixin:
    
    async def stream_vocabulary_cards(
        self,
        words: List[str],
        user_level: int = 1,
        delay_per_card: float = 0.5
    ) -> AsyncGenerator[AUIEvent, None]:
        """Stream vocabulary cards one by one using STATE_DELTA."""
        session_id = str(uuid.uuid4())
        message_id = f"vocab_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_vocabulary", "user_level": user_level}
        )
        
        # Determine component props
        if user_level <= 1:
            component = "FlashCardStack"
            props = {
                "words": [], 
                "show_translation": True, 
                "messageId": message_id,
                "current_index": 0 
            }
        else:
            component = "VocabGrid"
            props = {
                "words": [],
                "show_translation": False,
                "challenge_mode": True,
                "monolingual": user_level >= 3,
                "messageId": message_id
            }
        
        # 1. Send initial empty snapshot
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text="Loading vocabulary...",
            target_level=user_level
        )
        
        await asyncio.sleep(0.5)
        
        current_state = {
            "component": component,
            "props": copy.deepcopy(props),
            "intention": "show_vocabulary",
            "target_level": user_level
        }
        
        for i, word in enumerate(words):
            word_obj = {"word": word, "definition": f"Definition of {word}"}
            
            patch_op = {
                "op": "add",
                "path": "/props/words/-",
                "value": word_obj
            }
            
            yield StateDeltaEvent(delta=[patch_op])
            
            current_state["props"]["words"].append(word_obj)
            await asyncio.sleep(delay_per_card)
        
        yield StreamEndEvent(session_id=session_id)

    async def stream_vocabulary_flip(
        self,
        words: List[str],
        user_level: int = 1
    ) -> AsyncGenerator[AUIEvent, None]:
        """Demonstrate JSON Patch by flipping a card state."""
        session_id = str(uuid.uuid4())
        message_id = f"vocab_patch_{session_id}"
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_vocabulary", "user_level": user_level}
        )
        
        if user_level <= 1:
            component = "FlashCardStack"
            props = {
                "words": words, 
                "show_translation": True, 
                "messageId": message_id,
                "current_index": 0,
                "is_flipped": False 
            }
        else:
            component = "VocabGrid"
            props = {
                "words": words,
                "show_translation": False,
                "messageId": message_id,
                "expanded_indices": []
            }

        # Send Initial Snapshot
        yield create_snapshot_event(
            intention="show_vocabulary",
            ui={"component": component, "props": props},
            fallback_text="Vocabulary List",
            target_level=user_level
        )
        
        await asyncio.sleep(1.0)
        
        current_props = copy.deepcopy(props)
        
        for i in range(len(words)):
            new_props = copy.deepcopy(current_props)
            if component == "FlashCardStack":
                new_props["current_index"] = i
                new_props["is_flipped"] = True
            else:
                new_props["expanded_indices"] = current_props["expanded_indices"] + [i]
            
            old_doc = {
                "component": component,
                "props": current_props,
                "intention": "show_vocabulary",
                "target_level": user_level
            }
            
            new_doc = {
                "component": component,
                "props": new_props,
                "intention": "show_vocabulary",
                "target_level": user_level
            }
            
            yield create_state_diff(old_doc, new_doc)
            
            current_props = new_props
            await asyncio.sleep(1.0) 
            
        yield StreamEndEvent(session_id=session_id)

    async def stream_context_resources(
        self,
        word: str = None,
        user_level: int = 1,
        delay_per_context: float = 0.3,
        book_code: str = None
    ) -> AsyncGenerator[AUIEvent, None]:
        """Stream context resources for a word using Collins structured dictionary data."""
        session_id = str(uuid.uuid4())
        message_id = f"contexts_{session_id}"

        # 0. Fetch word from book if needed
        if not word and book_code:
            word = await word_list_service.get_next_word(book_code)
            if not word:
                yield StreamStartEvent(session_id=session_id, metadata={"intention": "show_contexts", "error": "book_empty"})
                yield create_snapshot_event(
                    intention="show_contexts",
                    ui={
                        "component": "MarkdownMessage",
                        "props": {"content": f"No more words available in book **{book_code}**."}
                    },
                    fallback_text="Book completed or empty.",
                    target_level=user_level
                )
                yield StreamEndEvent(session_id=session_id)
                return

        if not word:
             yield StreamStartEvent(session_id=session_id, metadata={"intention": "show_contexts", "error": "no_word"})
             yield create_snapshot_event(
                intention="show_contexts",
                ui={
                    "component": "MarkdownMessage",
                    "props": {"content": "No word specified."}
                },
                fallback_text="No word specified",
                target_level=user_level
            )
             yield StreamEndEvent(session_id=session_id)
             return
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "show_contexts", "word": word, "user_level": user_level}
        )
        
        # 1. Send initial empty snapshot with ContextList
        initial_props = {
            "word": word,
            "contexts": [],
            "entry": None,
            "progress": {"total": 0, "mastered": 0, "learning": 0, "unseen": 0},
            "show_progress": True,
            "compact": user_level <= 1,
            "messageId": message_id
        }
        
        yield create_snapshot_event(
            intention="show_contexts",
            ui={"component": "ContextList", "props": initial_props},
            fallback_text=f"Loading contexts for '{word}'...",
            target_level=user_level
        )
        
        await asyncio.sleep(0.3)
        
        # 2. Lookup word in Collins dictionary
        try:
            results = await run_in_threadpool(dict_manager.lookup, word)
            
            collins_html = None
            for result in results:
                if "collins" in result.get("dictionary", "").lower():
                    collins_html = result.get("definition", "")
                    break
            
            if not collins_html:
                yield create_state_diff(
                    {"component": "ContextList", "props": initial_props, "intention": "show_contexts", "target_level": user_level},
                    {"component": "ContextList", "props": {**initial_props, "error": "No Collins dictionary found"}, "intention": "show_contexts", "target_level": user_level}
                )
                yield StreamEndEvent(session_id=session_id)
                return
            
            parsed = collins_parser.parse(collins_html, word)
            
            if not parsed.found or not parsed.entry:
                yield create_state_diff(
                    {"component": "ContextList", "props": initial_props, "intention": "show_contexts", "target_level": user_level},
                    {"component": "ContextList", "props": {**initial_props, "error": f"Could not parse entry for '{word}'"}, "intention": "show_contexts", "target_level": user_level}
                )
                yield StreamEndEvent(session_id=session_id)
                return
            
        except Exception as e:
            yield create_state_diff(
                {"component": "ContextList", "props": initial_props, "intention": "show_contexts", "target_level": user_level},
                {"component": "ContextList", "props": {**initial_props, "error": f"Dictionary lookup failed: {str(e)}"}, "intention": "show_contexts", "target_level": user_level}
            )
            yield StreamEndEvent(session_id=session_id)
            return
        
        entry = parsed.entry
        
        # 4. Build entry metadata
        entry_data = {
            "headword": entry.headword,
            "pronunciation_uk": entry.pronunciation_uk,
            "pronunciation_us": entry.pronunciation_us,
            "audio_uk": entry.audio_uk.model_dump() if entry.audio_uk else None,
            "audio_us": entry.audio_us.model_dump() if entry.audio_us else None,
            "frequency": entry.frequency,
            "inflections": [inf.model_dump() for inf in entry.inflections],
            "phrasal_verbs": entry.phrasal_verbs
        }
        
        # 5. Collect all examples
        all_contexts = []
        context_id = 0
        
        for sense in entry.senses:
            for example in sense.examples:
                context_id += 1
                context_obj = {
                    "id": context_id,
                    "word": word,
                    "text_content": example.text,
                    "translation": example.translation,
                    "source": f"Collins - {sense.part_of_speech or 'definition'}",
                    "context_type": "dictionary_example",
                    "status": "unseen",
                    "grammar_pattern": example.grammar_pattern,
                    "definition": sense.definition,
                    "definition_cn": sense.definition_cn,
                    "sense_index": sense.index,
                    "synonyms": sense.synonyms
                }
                all_contexts.append(context_obj)
            
            for example in sense.note_examples:
                context_id += 1
                context_obj = {
                    "id": context_id,
                    "word": word,
                    "text_content": example.text,
                    "translation": example.translation,
                    "source": f"Collins - {sense.note or 'note'}",
                    "context_type": "dictionary_example",
                    "status": "unseen",
                    "grammar_pattern": example.grammar_pattern,
                    "definition": sense.definition,
                    "definition_cn": sense.definition_cn,
                    "sense_index": sense.index,
                    "synonyms": sense.synonyms
                }
                all_contexts.append(context_obj)
        
        if not all_contexts:
            empty_props = copy.deepcopy(initial_props)
            empty_props["entry"] = entry_data
            empty_props["message"] = f"No example sentences found for '{word}'"
            
            yield create_state_diff(
                {"component": "ContextList", "props": initial_props, "intention": "show_contexts", "target_level": user_level},
                {"component": "ContextList", "props": empty_props, "intention": "show_contexts", "target_level": user_level}
            )
            yield StreamEndEvent(session_id=session_id)
            return
        
        # 6. Stream contexts
        current_state = {
            "component": "ContextList",
            "props": {**initial_props, "entry": entry_data},
            "intention": "show_contexts",
            "target_level": user_level
        }
        
        # First update with entry data
        yield create_state_diff(
            {"component": "ContextList", "props": initial_props, "intention": "show_contexts", "target_level": user_level},
            current_state
        )
        
        await asyncio.sleep(0.2)
        
        for ctx in all_contexts:
            new_props = copy.deepcopy(current_state["props"])
            new_props["contexts"].append(ctx)
            new_props["progress"]["total"] = len(new_props["contexts"])
            new_props["progress"]["unseen"] = len(new_props["contexts"])
            
            new_state = {
                "component": "ContextList",
                "props": new_props,
                "intention": "show_contexts",
                "target_level": user_level
            }
            
            yield create_state_diff(current_state, new_state)
            
            current_state = new_state
            await asyncio.sleep(delay_per_context)
        
        yield StreamEndEvent(session_id=session_id)

    async def stream_ldoce_lookup(
        self,
        word: str,
        user_level: int = 1
    ) -> AsyncGenerator[AUIEvent, None]:
        """Stream LDOCE dictionary lookup results."""
        session_id = str(uuid.uuid4())
        
        yield StreamStartEvent(
            session_id=session_id,
            metadata={"intention": "ldoce_lookup", "word": word}
        )
        
        await asyncio.sleep(0.3)
        
        try:
            results = await run_in_threadpool(dict_manager.lookup, word)
        except Exception as e:
            yield create_snapshot_event(
                intention="dictionary_lookup",
                ui={
                    "component": "MarkdownMessage",
                    "props": {"content": f"❌ Dictionary lookup failed: {str(e)}"}
                },
                fallback_text=f"Lookup failed for {word}"
            )
            yield StreamEndEvent(session_id=session_id)
            return
        
        ldoce_html = None
        for result in results:
            dict_name = result.get("dictionary", "").upper()
            if "LDOCE" in dict_name or "LONGMAN" in dict_name:
                ldoce_html = result.get("definition", "")
                break
        
        if not ldoce_html:
            yield create_snapshot_event(
                intention="dictionary_lookup",
                ui={
                    "component": "MarkdownMessage",
                    "props": {"content": f"❌ Word **{word}** not found in LDOCE dictionary."}
                },
                fallback_text=f"Word {word} not found"
            )
            yield StreamEndEvent(session_id=session_id)
            return
        
        parsed = ldoce_parser.parse(ldoce_html, word)
        
        if not parsed.found or not parsed.entries:
            yield create_snapshot_event(
                intention="dictionary_lookup",
                ui={
                    "component": "MarkdownMessage",
                    "props": {"content": f"❌ Could not parse **{word}** from LDOCE."}
                },
                fallback_text=f"Parse error for {word}"
            )
            yield StreamEndEvent(session_id=session_id)
            return
        
        current_state = {
            "component": "DictionaryResults",
            "props": {
                "word": word,
                "source": "LDOCE",
                "entries": []
            }
        }
        
        yield create_snapshot_event(
            intention="dictionary_lookup",
            ui=current_state,
            fallback_text=f"Looking up {word}..."
        )
        await asyncio.sleep(0.3)
        
        for entry in parsed.entries:
            prev_state = copy.deepcopy(current_state)
            
            entry_data = {
                "headword": entry.headword,
                "homnum": entry.homnum,
                "pos": entry.part_of_speech,
                "pronunciation": entry.pronunciation,
                "senses": []
            }
            
            for sense in entry.senses[:3]:
                sense_data = {
                    "index": sense.index,
                    "definition": sense.definition,
                    "definition_cn": sense.definition_cn,
                    "grammar": sense.grammar,
                    "examples": [{"text": ex.text, "translation": ex.translation} for ex in sense.examples[:2]]
                }
                entry_data["senses"].append(sense_data)
            
            if entry.phrasal_verbs:
                entry_data["phrasal_verbs"] = [
                    {"phrase": pv.phrase, "definition": pv.definition, "definition_cn": pv.definition_cn} 
                    for pv in entry.phrasal_verbs[:2]
                ]
            
            if entry.etymology:
                entry_data["etymology"] = entry.etymology.model_dump()
            
            if entry.verb_table:
                entry_data["verb_table"] = {
                    "lemma": entry.verb_table.lemma,
                    "simple_forms": [f.model_dump() for f in entry.verb_table.simple_forms[:8]],
                    "continuous_forms": [f.model_dump() for f in entry.verb_table.continuous_forms[:4]]
                }
            
            if entry.thesaurus:
                entry_data["thesaurus"] = {
                    "topic": entry.thesaurus.topic,
                    "entries": [te.model_dump() for te in entry.thesaurus.entries[:10]],
                    "word_sets": entry.thesaurus.word_sets[:20]
                }
            
            if entry.collocations:
                entry_data["collocations"] = [
                    {
                        "pattern": col.pattern,
                        "part_of_speech": col.part_of_speech,
                        "examples": [{"text": ex.text, "translation": ex.translation} for ex in col.examples]
                    }
                    for col in entry.collocations[:10]
                ]
            
            if entry.extra_examples:
                entry_data["extra_examples"] = [ex.model_dump() for ex in entry.extra_examples[:10]]
            
            current_state["props"]["entries"].append(entry_data)
            
            yield create_state_diff(prev_state, current_state)
            
            await asyncio.sleep(0.5)
        
        yield StreamEndEvent(session_id=session_id)
