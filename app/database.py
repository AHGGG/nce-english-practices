import sqlite3
import json
from datetime import datetime

DB_NAME = "practice.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Session Table: Stores generated themes/vocab
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            vocab_json TEXT,  -- Stored as JSON string
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Stories Table: Cache generated stories
    c.execute('''
        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            target_tense TEXT NOT NULL,
            title TEXT,
            content TEXT,
            highlights_json TEXT,
            notes_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Attempts Table: Stores user results for all activities
    # activity_type: 'quiz', 'scenario', 'mission'
    c.execute('''
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_type TEXT NOT NULL, 
            topic TEXT,
            tense TEXT,
            input_data TEXT,  -- JSON: what was the question/prompt
            user_response TEXT, -- JSON: what did user say
            is_pass BOOLEAN,
            xp_earned INTEGER DEFAULT 0,
            duration_seconds INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Review Notes Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS review_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_sentence TEXT,
            better_sentence TEXT,
            note_type TEXT, 
            tags TEXT, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # SRS Schedule Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS srs_schedule (
            note_id INTEGER PRIMARY KEY,
            next_review_at TIMESTAMP,
            interval_days INTEGER DEFAULT 0,
            ease_factor REAL DEFAULT 2.5,
            repetitions INTEGER DEFAULT 0,
            FOREIGN KEY (note_id) REFERENCES review_notes(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# --- Logging Functions ---

def log_session(topic, vocab_data):
    try:
        conn = get_db_connection()
        conn.execute('INSERT INTO sessions (topic, vocab_json) VALUES (?, ?)', 
                     (topic, json.dumps(vocab_data)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error log_session: {e}")

def log_story(topic, tense, story_data):
    try:
        conn = get_db_connection()
        # Check if exists first (simple dedup)
        cur = conn.cursor()
        cur.execute('SELECT id FROM stories WHERE topic = ? AND target_tense = ?', (topic, tense))
        if cur.fetchone():
            conn.close()
            return # Already saved

        conn.execute('''
            INSERT INTO stories (topic, target_tense, title, content, highlights_json, notes_json) 
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            topic, 
            tense, 
            story_data.get('title'), 
            story_data.get('content'),
            json.dumps(story_data.get('highlights', [])),
            json.dumps(story_data.get('grammar_notes', []))
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error log_story: {e}")

def log_attempt(activity_type, topic, tense, input_data, user_response, is_pass, xp=10, duration_seconds=0):
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO attempts (activity_type, topic, tense, input_data, user_response, is_pass, xp_earned, duration_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            activity_type,
            topic,
            tense,
            json.dumps(input_data),
            json.dumps(user_response),
            is_pass,
            xp if is_pass else 1,
            duration_seconds
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error log_attempt: {e}")

def get_user_stats():
    try:
        conn = get_db_connection()
        stats = {}
        
        # Total XP
        cur = conn.execute('SELECT SUM(xp_earned) as total_xp FROM attempts')
        stats['total_xp'] = cur.fetchone()['total_xp'] or 0
        
        # Total Duration (Minutes)
        cur = conn.execute('SELECT SUM(duration_seconds) as total_sec FROM attempts')
        stats['total_minutes'] = round((cur.fetchone()['total_sec'] or 0) / 60)

        # Breakdown by Activity
        cur = conn.execute('''
            SELECT activity_type, COUNT(*) as count, SUM(is_pass) as passed 
            FROM attempts 
            GROUP BY activity_type
        ''')
        stats['activities'] = [dict(row) for row in cur.fetchall()]
        
        # Recent Activity (Last 5)
        cur = conn.execute('''
            SELECT activity_type, topic, tense, is_pass, duration_seconds, created_at 
            FROM attempts 
            ORDER BY created_at DESC 
            LIMIT 5
        ''')
        stats['recent'] = [dict(row) for row in cur.fetchall()]
        
        conn.close()
        return stats
    except Exception as e:
        print(f"DB Error get_stats: {e}")
        return {"total_xp": 0, "total_minutes": 0, "activities": [], "recent": []}

def add_review_note(original, better, note_type="grammar", tags=[]):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO review_notes (original_sentence, better_sentence, note_type, tags)
            VALUES (?, ?, ?, ?)
        ''', (original, better, note_type, json.dumps(tags)))
        note_id = cur.lastrowid
        
        # Init SRS Schedule
        # Start immediately or tomorrow? Let's say due immediately.
        cur.execute('''
            INSERT INTO srs_schedule (note_id, next_review_at)
            VALUES (?, ?)
        ''', (note_id, datetime.utcnow()))
        
        conn.commit()
        conn.close()
        return note_id
    except Exception as e:
        print(f"DB Error add_note: {e}")
        return None

def get_due_reviews(limit=10):
    try:
        conn = get_db_connection()
        cur = conn.execute('''
            SELECT n.*, s.interval_days, s.ease_factor, s.repetitions
            FROM review_notes n
            JOIN srs_schedule s ON n.id = s.note_id
            WHERE s.next_review_at <= ?
            ORDER BY s.next_review_at ASC
            LIMIT ?
        ''', (datetime.utcnow(), limit))
        return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f"DB Error get_due: {e}")
        return []

def update_srs_schedule(note_id, next_due, interval, ease, reps):
    try:
        conn = get_db_connection()
        conn.execute('''
            UPDATE srs_schedule 
            SET next_review_at = ?, interval_days = ?, ease_factor = ?, repetitions = ?
            WHERE note_id = ?
        ''', (next_due, interval, ease, reps, note_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB Error update_srs: {e}")
