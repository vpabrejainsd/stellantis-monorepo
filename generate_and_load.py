# In generate_and_load_history.py
import pandas as pd
import random
import sqlite3
from faker import Faker
from datetime import datetime, timedelta
import os
import numpy as np

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, 'data')
FLAT_FILE_EXCEL_PATH = os.path.join(DATA_DIR, 'generated_flat_job_history.xlsx')
MAPPING_Excel_PATH = os.path.join(DATA_DIR, 'Job_Task_Mapping.xlsx')
NUM_RECORDS = 250
ENGINEER_EXCEL_PATH = os.path.join(DATA_DIR, 'engineer_profiles.xlsx')

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
    # For custom service, we can pick a few random tasks
    'Custom Service': []
}

available_jobs = list(JOB_TO_TASKS_MAPPING.keys())

ENGINEERS_DATA = {
    'ENG001': {'name': 'John Doe', 'level': 'Senior'},
    'ENG002': {'name': 'Jane Smith', 'level': 'Master'},
    'ENG003': {'name': 'Peter Jones', 'level': 'Junior'},
    'ENG004': {'name': 'Mary Williams', 'level': 'Senior'},
    'ENG005': {'name': 'Alice Johnson', 'level': 'Junior'},
    'ENG006': {'name': 'Michael Brown', 'level': 'Senior'},
    'ENG007': {'name': 'Emily Davis', 'level': 'Master'},
    'ENG008': {'name': 'Robert Wilson', 'level': 'Junior'},
    'ENG009': {'name': 'Linda Martinez', 'level': 'Senior'},
    'ENG010': {'name': 'David Anderson', 'level': 'Master'},
    'ENG011': {'name': 'Susan Clark', 'level': 'Junior'},
    'ENG012': {'name': 'Daniel Lewis', 'level': 'Senior'},
    'ENG013': {'name': 'Patricia Hall', 'level': 'Master'},
    'ENG014': {'name': 'Christopher Allen', 'level': 'Junior'},
    'ENG015': {'name': 'Barbara Young', 'level': 'Senior'},
    'ENG016': {'name': 'Thomas Hernandez', 'level': 'Master'},
    'ENG017': {'name': 'Nancy King', 'level': 'Junior'},
    'ENG018': {'name': 'Steven Wright', 'level': 'Senior'}
}

CAR_MODELS = {
    'Toyota': ['Camry', 'Corolla', 'RAV4'],
    'Honda': ['Civic', 'Accord', 'CR-V'],
    'Ford': ['F-150', 'Focus', 'Mustang'],
    'BMW': ['3 Series', 'X5', 'M4'],
    'Mercedes': ['C-Class', 'E-Class', 'GLC'],
    'Audi': ['A4', 'Q5', 'A6'],
    'Nissan': ['Altima', 'Rogue', 'Maxima'],
    'Chevrolet': ['Silverado', 'Malibu', 'Equinox'],
    'Volkswagen': ['Golf', 'Passat', 'Tiguan'],
    'Hyundai': ['Elantra', 'Tucson', 'Sonata'],
    'Kia': ['Sportage', 'Sorento', 'Forte'],
    'Subaru': ['Outback', 'Forester', 'Impreza'],
    'Mazda': ['CX-5', 'Mazda3', 'CX-9'],
    'Lexus': ['RX', 'NX', 'ES'],
    'Jeep': ['Wrangler', 'Grand Cherokee', 'Cherokee'],
    'Chrysler': ['300', 'Pacifica', 'Voyager'],
    'Dodge': ['Challenger', 'Charger', 'Durango'],
    'Ram': ['1500', '2500', '3500'],
    'Fiat': ['500', '500X', '500L'],
    'Peugeot': ['308', '3008', '208'],
    'Citroën': ['C4', 'C5', 'C3'],
    'Opel': ['Corsa', 'Astra', 'Mokka'],
    'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale'],
    'Mitsubishi': ['Outlander', 'Eclipse', 'Pajero'],
    'Volvo': ['XC60', 'XC90', 'S60'],
    'Mini': ['Cooper', 'Countryman', 'Clubman'],
    'Genesis': ['G80', 'G70', 'GV80'],
    'Buick': ['Enclave', 'Envision', 'Encore'],
    'Acura': ['MDX', 'RDX', 'TLX'],
    'Infiniti': ['Q50', 'QX50', 'QX60'],
    'Lincoln': ['Navigator', 'Aviator', 'Corsair'],
    'Porsche': ['911', 'Cayenne', 'Macan'],
    'Land Rover': ['Range Rover', 'Discovery', 'Defender']
}

URGENCY_LEVELS = ['Normal', 'High', 'Low']

def get_tenure_from_level(level):
    """Calculates tenure in months based on experience level as per business rules."""
    if level == "Junior":
        return random.randint(1,7)  # 1 year to 7 years
    elif level == "Senior":
        return random.randint(7, 15)  # 7 to 15 years
    elif level == "Master":
        return random.randint(15, 40)  # 15 to 40 years
    else:
        return random.randint(1, 60) # Fallback
def calculate_overall_performance(engineer_df):
    """
    Calculates a credible Overall_Performance_Score using a weighted average.
    """
    print("Calculating credible Overall_Performance_Score...")
    
    # --- Step 1: Calculate and Normalize Components ---
    score_columns = [col for col in engineer_df.columns if col.endswith('_Score') and col != 'Overall_Performance_Score']
    engineer_df['Quality_Score'] = engineer_df[score_columns].mean(axis=1)
    engineer_df['Normalized_Customer_Rating'] = ((engineer_df['Customer_Rating'] - 1) / 4) * 100
    
    global_avg_time = engineer_df['Avg_Job_Completion_Time'].mean()
    speed_factor = global_avg_time / engineer_df['Avg_Job_Completion_Time']
    engineer_df['Timeliness_Score'] = np.clip(speed_factor * 75, 0, 100)
    
    # --- Step 2: Define Weights ---
    weights = {'quality': 0.60, 'customer': 0.25, 'timeliness': 0.15}

    # --- Step 3: Calculate the Final Weighted Score ---
    final_score = (
        engineer_df['Quality_Score'] * weights['quality'] +
        engineer_df['Normalized_Customer_Rating'] * weights['customer'] +
        engineer_df['Timeliness_Score'] * weights['timeliness']
    )
    
    engineer_df['Overall_Performance_Score'] = final_score.round().astype(int)
    
    # Drop the intermediate calculation columns for a cleaner final output
    engineer_df.drop(columns=['Quality_Score', 'Normalized_Customer_Rating', 'Timeliness_Score'], inplace=True)

    return engineer_df

# --- MODIFIED FUNCTION TO GENERATE AND CALCULATE ENGINEER PROFILES ---
def generate_and_save_engineer_profiles(df_history):
    """Generates raw profiles, calculates the final performance score, and saves to Excel."""
    print("Generating engineer profiles...")
    
    engineer_avg_times = {}
    if not df_history.empty:
        engineer_avg_times = df_history.groupby('Assigned_Engineer_Id')['Time_Taken_minutes'].mean().to_dict()
    
    engineer_records = []
    for eid, e_info in ENGINEERS_DATA.items():
        level = e_info['level']
        tenure = get_tenure_from_level(level)
        base_score = random.randint(70, 100)
        
        specializations = list(CAR_MODELS.keys())
        specializations.append('All Makes')
        
        certs = {
            'Junior': ['Basic Automotive Certification'],
            'Senior': ['ASE Certification', 'Brake Specialist','Hybrid/Electric Vehicle'],
            'Master': ['Master Technician', 'Advanced Diagnostics','I-CAR Gold']
        }
        
        record = {
            'engineer_id': eid, 
            'engineer_name': e_info['name'], 
            'Availability': "Yes",
            'Year_of_Experience': tenure,
            'Avg_Job_Completion_Time': int(engineer_avg_times.get(eid, random.randint(60, 120))),
            'Specialization': random.choice(specializations),
            'Certifications': ', '.join(random.sample(certs[level], k=min(len(certs[level]), 2))),
            'Customer_Rating': random.randint(1, 5), 
            'Overall_Performance_Score': base_score,
            'Overall_Basic_Service_Score': random.randint(base_score-10, base_score),
            'Overall_Intermediate_Service_Score': random.randint(base_score-15, base_score),
            'Overall_Full_Service_Score': random.randint(base_score-20, base_score),
            'Oil_Change_Score': random.randint(75, 100), 'Oil_Filter_Replacement': random.randint(75, 100),
            'Air_Filter_Check_Score': random.randint(75, 100), 'Fluid_Levels_Check_Score': random.randint(75, 100),
            'Tyre_Pressure_Check_Score': random.randint(75, 100),
            'Visual_Inspection_(brakes, tires, suspension)_Score': random.randint(base_score-10, base_score),
            'Brake_Inspection(pads, discs, calipers)_Score': random.randint(base_score-10, base_score),
            'Tyre_Condition_and_Alignment_Check_Score': random.randint(base_score-10, base_score),
            'Battery_Check_Score': random.randint(85, 100), 
            'Exhaust_System_Inspection_Score': random.randint(base_score-10, base_score),
            'Steering_and_Suspension_Check_Score': random.randint(base_score-15, base_score),
            'Lights_and_Wipers_Check_Score': random.randint(85, 100), 
            'Transmission_Check_Score': random.randint(base_score-15, base_score),
            'Spark_Plugs_Replacement_Score': random.randint(base_score-10, base_score),
            'Fuel_System_Inspection_Score': random.randint(base_score-15, base_score),
            'Timing_Belt_Inspection_Score': random.randint(base_score-20, base_score),
            'Comprehensive_Diagnostic_Check_Score': random.randint(base_score-20, base_score),
            'Underbody_Inspection_Score': random.randint(base_score-10, base_score),
            'Cabin_Filter_Replacement_Score': random.randint(85, 100)
        }
        engineer_records.append(record)
    
    # Convert to DataFrame and then calculate the final score
    engineer_df = pd.DataFrame(engineer_records)
    
    return engineer_df
# --- Main Generation Logic ---

def generate_flat_data(num_jobs):
    """
    Generates a single, denormalized DataFrame where each row is a task,
    but car and job info is repeated.
    """
    fake = Faker()
    all_records = []

    task_id_list = list(TASKS_DATA.keys())
    

    
    for i in range(num_jobs):
        # 1. Create a unique high-level job for a single car
        job_id = f"JOB{1001 + i}" # Unique auto-incrementing Job ID
        job_name = random.choice(available_jobs)
        urgency = random.choice(URGENCY_LEVELS)
        car_make = random.choice(list(CAR_MODELS.keys()))
        car_model = random.choice(CAR_MODELS[car_make])
        car_vin = fake.vin()
        car_mileage = random.randint(10000, 200000)

        tasks_to_perform = JOB_TO_TASKS_MAPPING[job_name]

        if job_name == 'Custom Service':
            tasks_to_perform = random.sample(list(TASKS_DATA.keys()), k=random.randint(2, 5))

        base_job_completion_time = datetime.now() - timedelta(days=random.randint(1, 365))

        for task_id in tasks_to_perform:
            task_name = TASKS_DATA[task_id]['name']

            engineer_id = random.choice(list(ENGINEERS_DATA.keys()))
            engineer_info = ENGINEERS_DATA[engineer_id]

            estimated_time = TASKS_DATA[task_id]['time'] # Placeholder for estimated time per task

            if urgency == 'High':
                date_completed = base_job_completion_time.date()
                time_variation_minutes = random.randint(-5, 30)
            else:
                day_variation = timedelta(days=random.randint(0, 2))
                date_completed = (base_job_completion_time + day_variation).date()
                time_variation_minutes = random.randint(-5, 60)

            time_taken = estimated_time + time_variation_minutes
            outcome_score = random.randint(3, 5) # Default good outcome score
            if urgency == 'High' and time_variation_minutes > 18:
                outcome_score = random.randint(1, 2) # Penalize score heavily
            # If any job takes more than 50 minutes over, it's also a poor outcome
            elif time_variation_minutes > 50:
                outcome_score = random.randint(2, 3)

            time_ended = datetime(
                date_completed.year, date_completed.month, date_completed.day,
                hour=random.randint(8, 20), minute=random.randint(0, 59)
            )    

            time_started = time_ended - timedelta(minutes=time_taken)
            

            

            # Assemble the full record for this one task
            # Car and Job info is repeated for each task row
            record = {
                'Job_ID': job_id,
                'Job_Name': job_name,
                'Task_Id': task_id,
                'Task_Description': task_name,
                'Status': 'Completed',
                'Date_Completed': date_completed,
                'Urgency': urgency,
                'VIN': car_vin,
                'Make': car_make,
                'Model': car_model,
                'Mileage': car_mileage,
                'Assigned_Engineer_Id': engineer_id,
                'Engineer_Name': engineer_info['name'],
                'Engineer_Level': engineer_info['level'],
                #'Task_Sequence': task_sequence,
                'Time_Started': time_started,
                'Time_Ended': time_ended,
                'Time_Taken_minutes': time_taken,
                'Estimated_Standard_Time': estimated_time,
                'Outcome_Score': outcome_score,
                
            }
            all_records.append(record)

    return pd.DataFrame(all_records)


if __name__ == '__main__':
    # Ensure the /data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    try:
        print(f"Generating {NUM_RECORDS} unique jobs, each with multiple random tasks...")
        flat_data_df = generate_flat_data(NUM_RECORDS)

        # Convert datetime columns to a readable string format for Excel
        flat_data_df['Time_Started'] = flat_data_df['Time_Started'].dt.strftime('%Y-%m-%d %H:%M:%S')
        flat_data_df['Time_Ended'] = flat_data_df['Time_Ended'].dt.strftime('%Y-%m-%d %H:%M:%S')

        # Save the final, single DataFrame to an Excel file
        flat_data_df.to_excel(FLAT_FILE_EXCEL_PATH, index=False)
        
        print(f"\nSuccessfully created the flat job history Excel file at: {FLAT_FILE_EXCEL_PATH}")
        print(f"Generated a total of {len(flat_data_df)} task rows from {NUM_RECORDS} jobs.")

    except Exception as e:
        print(f"An error occurred: {e}")

    print("\nProcess complete.")