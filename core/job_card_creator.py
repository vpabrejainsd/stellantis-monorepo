import sqlite3
import os
from datetime import datetime

# --- Configuration & Data Dictionaries ---
# In a real application, this data might be loaded from a central config file or database
# For the POC, we define it here so this script can run independently for testing.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')

TASKS_DATA = {
    'T001': {'name': 'Oil Change', 'time': 35},
    'T002': {'name': 'Oil Filter Replacement', 'time': 45},
    'T003': {'name': 'Air Filter Check', 'time': 35},
    'T004': {'name': 'Fluid Levels Check', 'time': 65},
    'T005': {'name': 'Tyre Pressure Check', 'time': 35},
    'T006': {'name': 'Visual Inspection', 'time': 35},
    'T007': {'name': 'Brake Inspection', 'time': 55},
    'T008': {'name': 'Tyre Condition and Alignment Check', 'time': 70},
    'T009': {'name': 'Battery Check', 'time': 45},
    'T010': {'name': 'Exhaust System Inspection', 'time': 65},
    'T011': {'name': 'Steering and Suspension Check', 'time': 85},
    'T012': {'name': 'Lights and Wipers Check', 'time': 35},
    'T013': {'name': 'Fuel System Inspection', 'time': 120},
    'T014': {'name': 'Transmission Check', 'time': 150},
    'T015': {'name': 'Spark Plugs Replacement', 'time': 240},
    'T016': {'name': 'Timing Belt Inspection', 'time': 65},
    'T017': {'name': 'Wheel Alignment and Balancing', 'time': 75},
    'T018': {'name': 'Cabin Filter Replacement', 'time': 45},
    'T019': {'name': 'Comprehensive Diagnostic Check', 'time': 300},
    'T020': {'name': 'Underbody Inspection', 'time': 120}
}
BASIC_SERVICE_TASKS = ['T001', 'T002', 'T003', 'T004', 'T005', 'T006']
INTERMEDIATE_SERVICE_TASKS = BASIC_SERVICE_TASKS + ['T007', 'T008', 'T009', 'T010', 'T011', 'T012']
FULL_SERVICE_TASKS = INTERMEDIATE_SERVICE_TASKS + ['T013', 'T014', 'T015', 'T016', 'T017', 'T018', 'T019', 'T020']
JOB_TO_TASKS_MAPPING = {
    'Basic Service': BASIC_SERVICE_TASKS,
    'Intermediate Service': INTERMEDIATE_SERVICE_TASKS,
    'Full Service': FULL_SERVICE_TASKS,
    'Custom Service': []
}

def get_next_job_id_from_db():
    """
    Retrieves the maximum Job_Id currently in the database,
    increments it, and returns it. Handles empty table.
    """
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(SUBSTR(Job_Id, 4) AS INTEGER)) FROM job_card")
        max_id = cursor.fetchone()[0]
        
        # If no records exist, start from 1, otherwise increment max_id
        next_int_id = (max_id if max_id is not None else 0) + 1
        return f"JOB{next_int_id}"
    except sqlite3.Error as e:
        print(f"Error getting next Job_Id: {e}")
        # Fallback to a timestamp-based ID or raise an error
        return f"JOB{int(datetime.now().timestamp())}" 
    finally:
        if conn:
            conn.close()

def create_job_from_ui_input(job_name, vin, make, model, mileage, urgency, selected_tasks=None):
    """
    Accepts data from a UI/frontend and creates job card records in the database.
    Returns a tuple: (True, success_message) or (False, error_message).
    """
    if job_name == 'Custom Service' and selected_tasks:
        tasks_to_perform = selected_tasks
        print(tasks_to_perform)
    else:
        tasks_to_perform = JOB_TO_TASKS_MAPPING.get(job_name, [])

    if not tasks_to_perform:
        print(f"Error: No tasks found for job '{job_name}'.")
        return False, f"No tasks found for job '{job_name}'"
        
    records_to_insert = []
    
    # --- Generate the JOB ID here, once for all tasks in this job ---
    job_id_with_prefix = get_next_job_id_from_db() 
    
    for task_id in tasks_to_perform:
        print(task_id)
        task_info = TASKS_DATA.get(task_id)
        print(task_info)
        if not task_info:
            continue
            
        record = (
            # Use the newly generated JOB ID
            job_id_with_prefix, 
            job_name, task_id, task_info['name'], urgency, vin, make, model,
            mileage, task_info['time'], 'Pending', datetime.now()
        )
        records_to_insert.append(record)
        
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # --- Your SQL remains the same, assuming Job_Id is TEXT ---
        sql = """
        INSERT INTO job_card (
            Job_Id, Job_Name, Task_Id, Task_Description, Urgency, VIN, Make, Model,
            Mileage, Estimated_Standard_Time, Status, Date_Created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        cursor.executemany(sql, records_to_insert)
        conn.commit()
        
        success_message = f"Successfully inserted {len(records_to_insert)} tasks for Job '{job_name}' with Job_Id '{job_id_with_prefix}'."
        print(success_message)
        return True, success_message, job_id_with_prefix
    except sqlite3.Error as e:
        error_message = f"Database error: {e}"
        print(error_message)
        return False, error_message
    finally:
        if conn:
            conn.close()
    


if __name__ == '__main__':
    # This simulates the data coming from the UI form
    print("--- Simulating UI Input for a 'Basic Service' Job ---")
    
    # The UI collects this data from the manager
    ui_job_name = "Basic Service"
    ui_vin = "UI-TEST-VIN-123"
    ui_make = "Honda"
    ui_model = "Civic"
    ui_mileage = 150000
    ui_urgency = "High"
    
    # The UI code calls your function
    success = create_job_from_ui_input(
        job_name=ui_job_name,
        vin=ui_vin,
        make=ui_make,
        model=ui_model,
        mileage=ui_mileage,
        urgency=ui_urgency
    )