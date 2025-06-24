import sqlite3
import os
from datetime import datetime

# --- Configuration & Data Dictionaries ---
# In a real application, this data might be loaded from a central config file or database
# For the POC, we define it here so this script can run independently for testing.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')

TASKS_DATA = {
    'T001': {'name': 'Oil Change', 'time': 25},
    'T002': {'name': 'Oil Filter Replacement', 'time': 15},
    'T003': {'name': 'Air Filter Check', 'time': 15},
    'T004': {'name': 'Fluid Levels Check', 'time': 30},
    'T005': {'name': 'Tyre Pressure Check', 'time': 15},
    'T006': {'name': 'Visual Inspection', 'time': 20},
    'T007': {'name': 'Brake Inspection', 'time': 30},
    'T008': {'name': 'Tyre Condition and Alignment Check', 'time': 30},
    'T009': {'name': 'Battery Check', 'time': 25},
    'T010': {'name': 'Exhaust System Inspection', 'time': 45},
    'T011': {'name': 'Steering and Suspension Check', 'time': 60},
    'T012': {'name': 'Lights and Wipers Check', 'time': 20},
    'T013': {'name': 'Fuel System Inspection', 'time': 65},
    'T014': {'name': 'Transmission Check', 'time': 120},
    'T015': {'name': 'Spark Plugs Replacement', 'time': 180},
    'T016': {'name': 'Timing Belt Inspection', 'time': 35},
    'T017': {'name': 'Wheel Alignment and Balancing', 'time': 30},
    'T018': {'name': 'Cabin Filter Replacement', 'time': 20},
    'T019': {'name': 'Comprehensive Diagnostic Check', 'time': 120},
    'T020': {'name': 'Underbody Inspection', 'time': 60}
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

def create_job_from_ui_input(job_name, vin, make, model, mileage, urgency, selected_tasks=None):
    """
    Accepts data from a UI/frontend and creates job card records in the database.
    Returns True on success, False on failure.
    """
    if job_name == 'Custom Service' and selected_tasks:
        tasks_to_perform = selected_tasks
    else:
        tasks_to_perform = JOB_TO_TASKS_MAPPING.get(job_name, [])

    if not tasks_to_perform:
        print(f"Error: No tasks found for job '{job_name}'.")
        return False, f"No tasks found for job '{job_name}'"
        
    records_to_insert = []
    for task_id in tasks_to_perform:
        task_info = TASKS_DATA.get(task_id)
        if not task_info:
            continue # Skip if task_id is invalid
            
        record = (
            job_name, task_id, task_info['name'], urgency, vin, make, model,
            mileage, task_info['time'], 'Pending', datetime.now().date()
        )
        records_to_insert.append(record)
        
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        sql = """
        INSERT INTO job_card (
            Job_Name, Task_ID, Task_Description, Urgency, VIN, Make, Model,
            Mileage, Estimated_Standard_Time, Status, Date_Created
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        cursor.executemany(sql, records_to_insert)
        conn.commit()
        
        print(f"Successfully inserted {len(records_to_insert)} tasks for Job '{job_name}' into job_card.")
        return True
    except sqlite3.Error as e:
        print(f"Database error in create_job_from_ui_input: {e}")
        return False, f"Database error: {e}"
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