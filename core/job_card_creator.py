import sqlite3
import os
from datetime import datetime
import random # We'll still use this for the "Custom Service" case

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

def create_new_job_card():
    """
    Simulates a manager creating a new job card by providing input.
    This function creates records in the 'job_card' table.
    """
    print("\n--- Creating a New Job Card ---")
    
    # --- 1. Gather Input from the Manager ---
    print("Available Job Types:", list(JOB_TO_TASKS_MAPPING.keys()))
    job_name = input("Enter the Job Name: ")
    if job_name not in JOB_TO_TASKS_MAPPING:
        print("Error: Invalid Job Name.")
        return

    print("\nEnter Vehicle Details:")
    vin = input("  VIN: ")
    make = input("  Make: ")
    model = input("  Model: ")
    try:
        mileage = int(input("  Mileage: "))
    except ValueError:
        print("Error: Mileage must be a number.")
        return
        
    urgency = input("Enter Urgency (Normal, High, Low): ")
    if urgency not in ['Normal', 'High', 'Low']:
        print("Error: Invalid Urgency level.")
        return
    tasks_to_perform = []
    
    # --- 2. Determine the list of tasks to be created ---
    if job_name == 'Custom Service':
        print("\n--- Available Tasks for Custom Service ---")
        
        # Create an ordered list of task IDs to map user input to
        available_task_ids = list(TASKS_DATA.keys())
        
        for i, task_id in enumerate(available_task_ids):
            print(f"  [{i+1}] {TASKS_DATA[task_id]['name']}")
        
        try:
            selection_str = input("\nEnter the numbers of the tasks you want to add, separated by commas (e.g., 1, 5, 9): ")
            # Convert string input like "1, 5, 9" to a list of indices [0, 4, 8]
            selected_indices = [int(s.strip()) - 1 for s in selection_str.split(',')]
            
            # Validate selections and build the final task list
            for index in selected_indices:
                if 0 <= index < len(available_task_ids):
                    tasks_to_perform.append(available_task_ids[index])
                else:
                    print(f"Warning: Task number {index + 1} is invalid and will be skipped.")
            
        except ValueError:
            print("Error: Invalid input. Please enter only numbers separated by commas.")
            return
    else:
        # This is the existing logic for predefined jobs like "Basic Service"
        tasks_to_perform = JOB_TO_TASKS_MAPPING.get(job_name, [])

    if not tasks_to_perform:
        print("No valid tasks were selected. Aborting job card creation.")
        return
    
    # --- 3. Create a record for each task in the database ---
    records_to_insert = []
    for task_id in tasks_to_perform:
        task_info = TASKS_DATA.get(task_id)
        if not task_info:
            print(f"Warning: Task ID {task_id} not found in TASKS_DATA. Skipping.")
            continue
            
        record = (
            job_name, task_id, task_info['name'], urgency, vin, make, model,
            mileage, task_info['time'], 'Pending', datetime.now().date()
        )
        records_to_insert.append(record)
        
    # --- 4. Connect to DB and insert records ---
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
        
        print(f"\nSuccessfully created {len(records_to_insert)} task(s) for Job '{job_name}' (VIN: {vin}).")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # This allows you to test this script directly
    create_new_job_card()