import sqlite3
import pandas as pd
from generate_and_load import get_level_from_experience
from recommender import recommend_engineers_memory_cf

DB_PATH = "database/workshop.db"

def get_connection():
    return sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)


def fetch_all_jobs():
    with get_connection() as conn:
        return pd.read_sql("SELECT * FROM job_card", conn)


def fetch_unassigned_jobs():
    with get_connection() as conn:
        return pd.read_sql("SELECT * FROM job_card_table WHERE Assigned_Engineer_ID IS NULL", conn)

# def update_task_assignment(task_id, assigned_engineer_id):
#     """
#     Updates the Assigned_Engineer_Id for a specific Task_ID.
#     Also updates the Status to 'Assigned'.
#     """
#     with get_connection() as conn:
#         cursor = conn.cursor()
#         cursor.execute("""
#             UPDATE job_card
#             SET Engineer_Id = ?, Status = 'Assigned'
#             WHERE Task_ID = ?
#         """, (assigned_engineer_id, task_id))
#         conn.commit()
# In job_manager.py, replace the old function with this one

def update_task_assignment(task_id, assigned_engineer_id, score):
    """
    Updates the engineer details for a specific Task_ID in the job_card table.

    This function will:
    1. Fetch the engineer's name and years of experience from the engineer_profiles table.
    2. Use the experience to derive the engineer's level (Junior, Senior, Master).
    3. Update the job_card row for the given Task_ID with the Engineer_Id,
       Engineer_Name, derived Engineer_Level, and set the Status to 'Assigned'.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # --- Step 1: Fetch the engineer's name and experience ---
        engineer_name = None
        derived_engineer_level = None # This will hold the calculated level
        
        try:
            cursor.execute("""
                SELECT Engineer_Name, Years_of_Experience 
                FROM engineer_profiles 
                WHERE Engineer_ID = ?
            """, (assigned_engineer_id,))
            
            row = cursor.fetchone()
            
            if row:
                engineer_name = row[0]
                years_of_experience = row[1]
                
                # --- Step 2: Derive the level using our new helper function ---
                derived_engineer_level = get_level_from_experience(years_of_experience)
            else:
                print(f"Warning: Engineer ID {assigned_engineer_id} not found in profiles. Proceeding without name/level.")

        except sqlite3.Error as e:
            print(f"Error fetching engineer details for {assigned_engineer_id}: {e}")
            # The function will proceed with None for name/level if the fetch fails

        # --- Step 3: Update the job_card table with all the information ---
        try:
            cursor.execute("""
                UPDATE job_card 
                SET 
                    Engineer_Id = ?, 
                    Engineer_Name = ?, 
                    Engineer_Level = ?, 
                    Suitability_Score = ?,
                    Status = 'Assigned' 
                WHERE Task_ID = ?
            """, (assigned_engineer_id, engineer_name, derived_engineer_level, score, task_id))
            
            conn.commit()
            print(f"Successfully assigned Engineer {assigned_engineer_id} ({engineer_name}, Level: {derived_engineer_level}) to Task {task_id}.")
            
        except sqlite3.Error as e:
            print(f"Error updating job_card for Task {task_id}: {e}")
            conn.rollback() # Roll back changes if the update fails

# def update_job_assignment(job_card_id, engineer_id):
#     with get_connection() as conn:
#         conn.execute("""
#             UPDATE job_card_table 
#             SET Assigned_Engineer_ID = ?, Status = 'Assigned' 
#             WHERE Job_Card_ID = ?
#         """, (engineer_id, job_card_id))
#         conn.commit()
#         print(f"Assigned Engineer {engineer_id} to Job {job_card_id}")


def fetch_available_engineers():
    with get_connection() as conn:
        return pd.read_sql("SELECT * FROM engineer_profiles WHERE Availability = 'Yes'", conn)


def check_availability(engineer_id):
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT Availability FROM engineer_profiles WHERE Engineer_ID = ?", (engineer_id,))
        row = cursor.fetchone()
        return row and row[0] == 'Yes'


def mark_engineer_unavailable(engineer_id):
    with get_connection() as conn:
        conn.execute(
            "UPDATE engineer_profiles SET Availability = 'No' WHERE Engineer_ID = ?", (engineer_id,))
        conn.commit()
        print(f"Engineer {engineer_id} marked as unavailable")


def mark_engineer_available(conn, engineer_id):
    """
    Marks an engineer as available using the provided database connection.
    Does NOT open its own connection.
    """
    # The 'conn' object is passed in from the calling route
    conn.execute(
        "UPDATE engineer_profiles SET Availability = 'Yes' WHERE Engineer_ID = ?", (engineer_id,)
    )
    # The commit will be handled by the calling function, ensuring it's part of the same transaction.
    print(f"Engineer {engineer_id} availability status updated.")

def get_task_ids_for_job(job_card_id): # Renamed for clarity: plural 'ids'
    """
    Retrieves all Task_IDs for a given Job_Card_ID.
    Returns a list of Task_IDs.
    """
    with get_connection() as conn: # Using 'with' is good practice for connection management
        cursor = conn.execute(
            "SELECT Task_Id FROM job_card WHERE Job_Id = ?", (job_card_id,)) # Ensure table name is 'job_card'
        # Fetch all rows, and extract just the Task_ID from each row
        task_ids = [row[0] for row in cursor.fetchall()] 
        return task_ids


def get_task_id_for_job(job_card_id):
    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT Task_ID FROM job_card_table WHERE Job_Card_ID = ?", (job_card_id,))
        row = cursor.fetchone()
        return row[0] if row else None


def assign_engineers_to_pending_jobs():
    jobs = fetch_unassigned_jobs()

    for _, row in jobs.iterrows():
        job_id = row["Job_Card_ID"]
        task_id = row["Task_ID"]

        print(f"\nAssigning job: {job_id} with task: {task_id}")

        recommendations, reason = recommend_engineers_memory_cf(task_id, top_n=5)

        if isinstance(recommendations, str):
            print(f"{recommendations}")
            continue

        assigned_engineer = None

        for eng_id, score in recommendations:
            if check_availability(eng_id):
                assigned_engineer = eng_id
                break

        if assigned_engineer:
            update_task_assignment(job_id, assigned_engineer)
            mark_engineer_unavailable(assigned_engineer)
        else:
            print(f"[No available engineer for job {job_id}]")


def complete_job(job_card_id, outcome_score):
    with get_connection() as conn:
        conn.execute(
            "UPDATE job_card SET Status = 'Completed', Outcome_Score = ? WHERE Job_Card_ID = ?",
            (outcome_score, job_card_id)
        )
        conn.commit()

        eng_id = conn.execute(
            "SELECT Assigned_Engineer_ID FROM job_card WHERE Job_Card_ID = ?", (job_card_id,)
        ).fetchone()
        
        if eng_id and eng_id[0]:
            mark_engineer_available(eng_id[0])
        print(f"Job {job_card_id} marked completed with score {outcome_score}")
