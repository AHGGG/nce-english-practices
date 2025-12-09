from datetime import datetime, timedelta
from app.database import update_srs_schedule, get_db_connection

def process_review_result(note_id: int, quality: int):
    """
    Implements SuperMemo-2 Algorithm.
    quality: 0-5
    """
    # 1. Fetch current state
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM srs_schedule WHERE note_id = ?', (note_id,)).fetchone()
    conn.close()
    
    if not row:
        return # Should not happen
    
    prev_interval = row['interval_days']
    prev_ease = row['ease_factor']
    prev_reps = row['repetitions']
    
    new_interval = 0
    new_ease = prev_ease
    new_reps = prev_reps
    
    if quality >= 3:
        if prev_reps == 0:
            new_interval = 1
        elif prev_reps == 1:
            new_interval = 6
        else:
            new_interval = int(prev_interval * prev_ease)
        
        new_reps += 1
        
        # Update Ease Factor
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ease = prev_ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if new_ease < 1.3:
            new_ease = 1.3
            
    else:
        new_reps = 0
        new_interval = 1
        # Ease factor doesn't change on failure in standard SM-2, 
        # or sometimes it decreases. Let's keep it same for simplicity or decrease?
        # SM-2 says "EF unchanged" usually, but resetting reps handles it.
        
    next_due = datetime.utcnow() + timedelta(days=new_interval)
    
    update_srs_schedule(note_id, next_due, new_interval, new_ease, new_reps)
    
    return {
        "next_due": next_due.isoformat(),
        "interval_days": new_interval
    }
