import sqlite3
import os
from datetime import datetime

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # garage_ai_assigner directory
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Allows accessing columns by name
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def complete_job_and_record_outcome(vehicle_job_id, outcome_score, actual_time_minutes):
    """
    Marks a job as completed, records its outcome, updates engineer availability,
    and adds the job to engineer_past_performance for future learning.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Fetch details of the assigned job
        cursor.execute("""
            SELECT vj.assigned_engineer_id, vj.car_id, jd.job_name, c.make, c.model
            FROM vehicle_jobs vj
            JOIN job_definitions jd ON vj.job_def_id = jd.job_def_id
            JOIN cars c ON vj.car_id = c.car_id
            WHERE vj.vehicle_job_id = ? AND vj.status = 'Assigned'
        """, (vehicle_job_id,))
        job_data = cursor.fetchone()

        if not job_data:
            print(f"No 'Assigned' job found with ID {vehicle_job_id}, or job data is incomplete.")
            conn.close()
            return False

        assigned_engineer_id = job_data['assigned_engineer_id']
        job_description_text = job_data['job_name'] # Consistent with how it's used elsewhere
        vehicle_make = job_data['make']
        vehicle_model = job_data['model']

        # 2. Update vehicle_jobs table
        print(f"Updating vehicle_job ID {vehicle_job_id} to 'Completed'...")
        cursor.execute("""
            UPDATE vehicle_jobs
            SET status = 'Completed',
                job_outcome_score = ?,
                actual_time_taken_minutes = ?
            WHERE vehicle_job_id = ?
        """, (outcome_score, actual_time_minutes, vehicle_job_id))

        # 3. Update engineer's availability
        if assigned_engineer_id:
            print(f"Setting Engineer {assigned_engineer_id} availability to 'Yes'...")
            cursor.execute("""
                UPDATE engineers
                SET availability_status = 'Yes'
                WHERE engineer_id = ?
            """, (assigned_engineer_id,))
        
        # 4. Add to engineer_past_performance table for continuous learning
        print(f"Adding completed job to engineer_past_performance for Engineer {assigned_engineer_id}...")
        cursor.execute("""
            INSERT INTO engineer_past_performance 
            (engineer_id, job_description_text, vehicle_make, vehicle_model, outcome_score, time_taken_minutes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (assigned_engineer_id, job_description_text, vehicle_make, vehicle_model, 
              outcome_score, actual_time_minutes))
        
        conn.commit()
        print(f"Job {vehicle_job_id} successfully marked as 'Completed' and outcome recorded.")
        print(f"Engineer {assigned_engineer_id}'s performance on '{job_description_text}' added to history.")
        return True

    except sqlite3.Error as e:
        conn.rollback()
        print(f"Database error during job completion: {e}")
        return False
    except Exception as e:
        conn.rollback()
        print(f"An unexpected error occurred: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # Example Usage:
    # First, find an 'Assigned' job to complete.
    # You might need to run job_assigner.py first to get some jobs assigned.
    conn_main = get_db_connection()
    if conn_main:
        cursor_main = conn_main.cursor()
        cursor_main.execute("SELECT vehicle_job_id FROM vehicle_jobs WHERE status = 'Assigned' LIMIT 1")
        assigned_job_row = cursor_main.fetchone()
        conn_main.close()

        if assigned_job_row:
            job_id_to_complete = assigned_job_row['vehicle_job_id']
            print(f"\n--- Simulating completion for Vehicle Job ID: {job_id_to_complete} ---")
            
            # Simulate input for outcome (in a real app, this would come from user input)
            try:
                sim_outcome = int(input(f"Enter outcome score (1-5) for job {job_id_to_complete}: "))
                if not 1 <= sim_outcome <= 5:
                    raise ValueError("Outcome score must be between 1 and 5.")
                
                sim_time = int(input(f"Enter actual time taken (minutes) for job {job_id_to_complete}: "))
                if sim_time < 0:
                    raise ValueError("Time taken cannot be negative.")

                complete_job_and_record_outcome(job_id_to_complete, sim_outcome, sim_time)

            except ValueError as ve:
                print(f"Invalid input: {ve}")
            except Exception as e:
                print(f"An error occurred during input: {e}")
        else:
            print("No 'Assigned' jobs found in the database to simulate completion for.")
            print("Please run 'job_assigner.py' to assign some jobs first.")