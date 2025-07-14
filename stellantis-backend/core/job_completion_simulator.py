import sqlite3
import os
from datetime import datetime
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')

def complete_and_archive_task(job_card_id, outcome_score):
    print(f"\n--- Completing and Archiving Task for Job Card ID: {job_card_id} ---")
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM job_card WHERE job_card_id = ? AND status = 'Assigned'", (job_card_id,))
        task_data = cursor.fetchone()
        
        if not task_data:
            return False, f"No 'Assigned' task found with Job Card ID {job_card_id}."
        
        assigned_engineer_id = task_data['Assigned_Engineer_Id']


        if assigned_engineer_id:
            cursor.execute("SELECT engineer_name, experience_level FROM engineer_profiles WHERE engineer_id = ?", (assigned_engineer_id,))
            engineer_data = cursor.fetchone()
            if engineer_data:
                engineer_name = engineer_data['engineer_name']
                if engineer_data['Years_of_Experience']<=8:
                    engineer_level = 'Junior'
                elif engineer_data['Years_of_Experience']<=15 and engineer_data['Years_of_Experience']>=8:
                    engineer_level = 'Senior'
                else:
                    engineer_level = 'Master'
        time_started = datetime.fromisoformat(task_data['Time_Started'])
        time_ended = datetime.now()
        time_taken_minutes = round((time_ended - time_started).total_seconds() / 60)
        date_completed = time_ended.date()


        history_record = {
            'Job_ID': f"JOB-ARCH-{task_data['job_card_id']}", # Create a unique history Job ID
            'Job_Name': task_data['Job_Name'],
            'Task_Id': task_data['Task_ID'],
            'Task_Description': task_data['Task_Description'],
            'Status': 'Completed',
            'Date_Completed': date_completed,
            'Urgency': task_data['Urgency'],
            'VIN': task_data['VIN'],
            'Make': task_data['Make'],
            'Model': task_data['Model'],
            'Mileage': task_data['Mileage'],
            'Engineer_Id': task_data['Assigned_Engineer_Id'],
            'Engineer_Name': engineer_name,
            'Engineer_Level': engineer_level,
            'Time_Started': time_started,
            'Time_Ended': time_ended,
            'Time_Taken_minutes': time_taken_minutes,
            'Estimated_Standard_Time': task_data['Estimated_Standard_Time'],
            'Outcome_Score': outcome_score,
            'Date_Completed': date_completed,
        }
        
        history_df = pd.DataFrame([history_record])


        history_df.to_sql('job_history', conn, if_exists='append', index=False)
        print(f"Task {job_card_id} successfully archived to job_history.")


        cursor.execute("DELETE FROM job_card WHERE job_card_id = ?", (job_card_id,))
        conn.commit()
        print(f"Task {job_card_id} removed from live job_card table.")

        return True, f"Task {job_card_id} successfully completed and archived."

    except sqlite3.Error as e:
        if conn: conn.rollback()
        return False, f"Database error: {e}"
    finally:
        if conn: conn.close()


if __name__ == '__main__':
    # This simulates the UI finding an "Assigned" task and the manager completing it
    # You would need to run job_creator and have the assignment model run first
    # to have a task with 'Assigned' status.
    print("This script is now a backend module. To test, you need a task with 'Assigned' status in the job_card table.")
    # Example call:
    # success, message = complete_and_archive_task(job_card_id=1, outcome_score=5)
    # print(message)