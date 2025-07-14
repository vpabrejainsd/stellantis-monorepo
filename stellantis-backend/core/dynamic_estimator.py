import sqlite3
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')

def get_dynamic_task_estimate(task_id, engineer_id, conn):
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT AVG(Time_Taken_minutes) 
        FROM job_history 
        WHERE Engineer_Id = ? AND Task_ID = ?
    """, (engineer_id, task_id))
    
    result = cursor.fetchone()
    engineer_avg_time = result[0] if result and result[0] is not None else None
    
    cursor.execute("SELECT Estimated_Standard_Time FROM job_card WHERE Task_Id = ?", (task_id,))
    task_def_result = cursor.fetchone()
    standard_estimate = task_def_result[0] if task_def_result else 60 # Default to 60 if not found

    cursor.execute("SELECT Years_of_Experience FROM engineer_profiles WHERE engineer_id = ?", (engineer_id,))
    eng_profile_result = cursor.fetchone()
    experience_level = eng_profile_result[0] if eng_profile_result else 'Junior' # Default to Junior

    final_estimate = 0
    if engineer_avg_time is None:
        # If no history, rely 100% on the standard estimate
        print(f"  - Task {task_id} (Eng: {engineer_id}, Level: {experience_level}): No history. Using standard time.")
        final_estimate = standard_estimate
    else:
        # Apply weights based on experience level
        if experience_level == 'Master':
            weight = 0.7
        elif experience_level == 'Senior':
            weight = 0.5
        else: # Junior
            weight = 0.3
        
        final_estimate = (engineer_avg_time * weight) + (standard_estimate * (1 - weight))
        print(f"  - Task {task_id} (Eng: {engineer_id}, Level: {experience_level}): Blending personal avg ({engineer_avg_time:.0f}) and standard time ({standard_estimate}) with {weight*100:.0f}% weight.")

    return True, round(final_estimate)

def get_dynamic_job_estimate(job_id):
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
            SELECT Task_ID, Engineer_Id
            FROM job_card 
            WHERE Job_ID = ? AND Status = 'Assigned'
        """, (job_id,))
        
        assigned_tasks = cursor.fetchall()

        if not assigned_tasks:
            return False, "No assigned tasks found for this Job_ID, or the job is not yet fully assigned."
        tasks_completed = []
        total_dynamic_estimate = 0

        for task in assigned_tasks:
            success, task_estimate = get_dynamic_task_estimate(task['Task_ID'], task['Engineer_Id'], conn)
            if success:
                total_dynamic_estimate += task_estimate
                tasks_completed.append({"task_id": task['Task_ID'], "engineer_id": task['Engineer_Id'], "estimate": task_estimate})
            else:
                return False, f"Could not calculate estimate for Task {task['Task_ID']}"
            
        return True, {
            "Job_ID": job_id,
            "Total_Estimate_Minutes": total_dynamic_estimate,
            "Tasks": tasks_completed,
            "Calculated_At": datetime.now().isoformat()
        }

    except sqlite3.Error as e:
        return False, f"Database error: {e}"
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    job_estimates = []
    conn = None
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. Get a unique list of all Job_IDs that are currently 'Assigned'
        cursor.execute("SELECT DISTINCT Job_ID FROM job_card WHERE Status = 'Assigned'")
        assigned_jobs = cursor.fetchall()
        
        if not assigned_jobs:
            print("No jobs with status 'Assigned' found to process.")
        else:
            # Convert list of tuples to a simple list of strings
            job_ids_to_process = [job[0] for job in assigned_jobs]

            # 2. Loop through each job and calculate its estimate
            for job_id in job_ids_to_process:
                # We can reuse the existing function for each job
                success, response = get_dynamic_job_estimate(job_id)
                
                if success:
                    # The dictionary is created with keys: 'job_id', 'time', 'status'
                    job_estimates.append({'job_id': job_id, 'time': response, 'status': 'Success'})
                else:
                    job_estimates.append({'job_id': job_id, 'time': 'N/A', 'status': response})

    except sqlite3.Error as e:
        print(f"A database connection error occurred: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if conn:
            conn.close()

    # 4. Display the final structured output
    # In a real application, this list of dictionaries would be converted to JSON
    # and sent to the frontend portal.
    '''print("\n\n" + "="*60)
    print("           Dynamic Job Estimate Report (For Testing)")
    print("="*60)
    
    if not job_estimates:
        print("No jobs were processed.")
    else:
        # Print table header
        print(f"{'Job ID':<15} | {'Estimated Time (mins)':<25} | {'Status'}")
        print("-" * 60)
        
        # Print each row
        for estimate in job_estimates:
                job_id = estimate.get('job_id', 'Unknown')
                time = estimate.get('time', 'N/A')
                status = estimate.get('status', 'Error')
            
                print(f"{job_id:<15} | {str(time):<25} | {status}")
            
    print("="*60)
    print("\nProcess complete.")'''

    import json
    print(json.dumps(job_estimates, indent=4))