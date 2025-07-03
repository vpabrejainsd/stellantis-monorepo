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
FLAT_FILE_EXCEL_PATH = os.path.join(DATA_DIR, 'generated_flat_job_test.xlsx')
MAPPING_Excel_PATH = os.path.join(DATA_DIR, 'Job_Task_Mapping.xlsx')
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')
ENGINEER_EXCEL_PATH = os.path.join(DATA_DIR, 'engineer_profiles.xlsx')
NUM_RECORDS = 250

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

COLUMN_MAPPING = {
    # Standard Name : [Possible Variation 1, Possible Variation 2, etc.]
    'Engineer_Id': ['Assigned_Engineer_Id', 'engineer_id', 'Engineer ID', 'Engineer Id'],
    'Time_Taken_minutes': ['Time_Taken_minutes', 'Time Taken minutes', 'Time Taken (minutes)'],
    'Outcome_Score': ['Outcome_Score', 'Outcome Score'],
    'Job_Name': ['Job_Name', 'Job Name'],
    'Task_to_be_done': ['Task_to_be_done', 'Task to be done', 'Task Description', 'Task']
}

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

def standardize_columns(df, mapping):
    """Renames DataFrame columns based on a mapping of possible names."""
    rename_dict = {}
    df_columns = [col.strip() for col in df.columns] # Remove leading/trailing spaces
    for standard_name, possible_names in mapping.items():
        for possible_name in possible_names:
            if possible_name in df_columns:
                rename_dict[possible_name] = standard_name
                break # Move to the next standard name once a match is found
    df.rename(columns=rename_dict, inplace=True)
    return df
def get_level_from_experience(years):
    """
    Derives an engineer's level ('Junior', 'Senior', 'Master')
    based on their years of experience.
    """
    if years is None:
        # Handle cases where experience might not be set for an engineer
        return None
    
    # Using 'elif' ensures that the conditions are mutually exclusive
    if years <= 7:
        return "Junior"
    elif years <= 15: # This condition is only checked if years > 7
        return "Senior"
    else: # This handles any experience greater than 15
        return "Master"

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
    print("Calculating credible Overall_Performance_Score...")
    score_columns = [col for col in engineer_df.columns if col.endswith('_Score') and 'Overall_Performance_Score' not in col]
    
    engineer_df['Quality_Score'] = engineer_df[score_columns].mean(axis=1)
    engineer_df['Normalized_Customer_Rating'] = ((engineer_df['Customer_Rating'] - 1) / 4) * 100
    
    global_avg_time = engineer_df['Avg_Job_Completion_Time'].mean()
    speed_factor = global_avg_time / engineer_df['Avg_Job_Completion_Time']
    
    engineer_df['Timeliness_Score'] = np.clip(speed_factor * 75, 0, 100)
    
    weights = {'quality': 0.75, 'customer': 0.05, 'timeliness': 0.20}
    final_score = (engineer_df['Quality_Score'] * weights['quality'] + engineer_df['Normalized_Customer_Rating'] * weights['customer'] + engineer_df['Timeliness_Score'] * weights['timeliness'])
    
    engineer_df['Overall_Performance_Score'] = np.clip(final_score.round().astype(int), 0, 100)
    
    columns_to_drop = ['Quality_Score', 'Normalized_Customer_Rating', 'Timeliness_Score']
    
    engineer_df.drop(columns=columns_to_drop, inplace=True, errors='ignore')
    return engineer_df

# --- MODIFIED FUNCTION TO GENERATE AND CALCULATE ENGINEER PROFILES ---
def generate_and_save_engineer_profiles():
    """Generates engineer profiles using data from the generated history file."""
    print("\n--- Generating Engineer Profiles Based on Job History ---")
    
    try:
        df_history = pd.read_excel(FLAT_FILE_EXCEL_PATH)
        print(f"Successfully loaded job history from: {FLAT_FILE_EXCEL_PATH}")
    except FileNotFoundError:
        print(f"Error: Job history file not found at {FLAT_FILE_EXCEL_PATH}. Cannot generate engineer profiles.")
        return

    df_history = standardize_columns(df_history, COLUMN_MAPPING)

    engineer_records = []
    
    for eid, e_info in ENGINEERS_DATA.items():
        level = e_info['level']; tenure = get_tenure_from_level(level)
        specializations = list(CAR_MODELS.keys()); specializations.append('All Makes')
        certs = {'Junior': ['Basic Automotive Certification'],
                 'Senior': ['ASE Certification', 'Brake Specialist','Hybrid/Electric Vehicle'],
                 'Master': ['Master Technician', 'Advanced Diagnostics','I-CAR Gold']}
        record = {'Engineer_ID': eid, 
                  'Engineer_Name': e_info['name'], 
                  'Availability': "Yes",
                  'Years_of_Experience': tenure, 
                  'Specialization': random.choice(specializations),
                  'Certifications': ', '.join(random.sample(certs[level], k=min(len(certs[level]), 2)))}
        engineer_records.append(record)
    engineer_df = pd.DataFrame(engineer_records)

    print("Calculating real metrics from history data...")
    # The groupby operations now use the GUARANTEED standard column names
    engineer_stats = df_history.groupby('Engineer_Id').agg(
        Avg_Job_Completion_Time=('Time_Taken_minutes', 'mean'),
        Customer_Rating=('Outcome_Score', 'mean')
    ).reset_index()

    job_scores = df_history.groupby(['Engineer_Id', 'Job_Name'])['Outcome_Score'].mean().unstack()
    job_scores = ((job_scores - 1) / 4) * 100
    job_scores.columns = [f"Overall_{col.replace(' ', '_')}_Score" for col in job_scores.columns]

    task_scores = df_history.groupby(['Engineer_Id', 'Task_Description'])['Outcome_Score'].mean().unstack()
    task_scores = ((task_scores - 1) / 4) * 100
    task_scores.columns = [f"{col.replace(' ', '_').replace('(', '').replace(')', '').replace(',', '')}_Score" for col in task_scores.columns]
    
    print("Merging all calculated scores into engineer profiles...")
    engineer_df = pd.merge(engineer_df, engineer_stats, left_on='Engineer_ID', right_on='Engineer_Id', how='left')
    engineer_df.drop(columns=['Engineer_Id'], inplace=True, errors='ignore') # Clean up after merge
    engineer_df = pd.merge(engineer_df, job_scores, left_on='Engineer_ID', right_index=True, how='left')
    engineer_df = pd.merge(engineer_df, task_scores, left_on='Engineer_ID', right_index=True, how='left')
    
    score_cols_to_fill = [col for col in engineer_df.columns if '_Score' in col]
    engineer_df[score_cols_to_fill] = engineer_df[score_cols_to_fill].fillna(75.0)
    engineer_df['Avg_Job_Completion_Time'].fillna(engineer_df['Avg_Job_Completion_Time'].mean(), inplace=True)
    engineer_df['Customer_Rating'].fillna(3.0, inplace=True)

    engineer_df_final = calculate_overall_performance(engineer_df)
    engineer_df_final.to_excel(ENGINEER_EXCEL_PATH, index=False)
    print(f"Successfully created data-driven Engineer Profiles Excel file: {ENGINEER_EXCEL_PATH}")
    return engineer_df_final

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

def populate_database(df_history, engineer_df_final, db_path):
    print("\n--- Populating Database ---")
    try:
        conn = sqlite3.connect(db_path)
        # Populate job history
        df_history.to_sql('job_history', conn, if_exists='replace', index=False)
        print(f"Successfully inserted {len(df_history)} records into 'job_history' table.")
        # Populate engineer profiles
        engineer_df_final.to_sql('engineer_profiles', conn, if_exists='replace', index=False)
        print(f"Successfully inserted {len(engineer_df_final)} records into 'engineer_profiles' table.")
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn: conn.close()

if __name__ == '__main__':
    # Ensure the /data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    
    try:
        print(f"--- Loading Job History from Excel file: {FLAT_FILE_EXCEL_PATH} ---")
        df_history = pd.read_excel(FLAT_FILE_EXCEL_PATH)
        df_engineers_final = pd.read_excel(ENGINEER_EXCEL_PATH)
        print(f"Generating {NUM_RECORDS} unique jobs, each with multiple random tasks...")
        flat_data_df = generate_flat_data(NUM_RECORDS)

        # Convert datetime columns to a readable string format for Excel
        flat_data_df['Time_Started'] = flat_data_df['Time_Started'].dt.strftime('%Y-%m-%d %H:%M:%S')
        flat_data_df['Time_Ended'] = flat_data_df['Time_Ended'].dt.strftime('%Y-%m-%d %H:%M:%S')

        # Save the final, single DataFrame to an Excel file
        flat_data_df.to_excel(FLAT_FILE_EXCEL_PATH, index=False)
        
        print(f"\nSuccessfully created the flat job history Excel file at: {FLAT_FILE_EXCEL_PATH}")
        print(f"Generated a total of {len(flat_data_df)} task rows from {NUM_RECORDS} jobs.")

        df_engineers_final = generate_and_save_engineer_profiles()

        # Populate both tables in the database
        populate_database(df_history, df_engineers_final, DB_PATH)

    except FileNotFoundError:
        print(f"ERROR: The history file was not found at '{FLAT_FILE_EXCEL_PATH}'.")
        print("Please make sure your data file is placed in the 'data' directory.")
    except Exception as e:
        print(f"An error occurred: {e}")

    print("\nProcess complete.")