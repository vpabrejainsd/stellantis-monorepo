import math
import os
import sqlite3

def safe_float(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def sanitize_jobs(jobs):
    """Remove NaN and inf values from job data to ensure JSON serialization."""
    for job in jobs:
        for key, value in job.items():
            # Handle float NaN or inf values
            if isinstance(value, float):
                if math.isnan(value) or math.isinf(value):
                    job[key] = 0  # or choose None / another sentinel
            # For string fields, optionally handle known "NaN" strings
            elif isinstance(value, str) and value.lower() == 'nan':
                job[key] = "null"
    return jobs

def create_user_in_db(clerk_user_id, first_name, last_name, email):
    # Use absolute path for SQLite database
    db_path = os.path.join(os.path.dirname(__file__), 'workshop.db')
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO users (clerk_user_id, first_name, last_name, email, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        ''', (clerk_user_id, first_name, last_name, email))
        
        conn.commit()
        print(f"User {clerk_user_id} added to database")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        conn.close()