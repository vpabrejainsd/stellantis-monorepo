import pandas as pd
import os
import random

# Define the path to the 'data' directory
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

# Ensure the data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def generate_sample_data():
    """Generates and saves sample data files."""

    # --- 1. incoming_vehicles.xlsx ---
    cars_data = {
        'Car_Id': [f'CAR{i:03}' for i in range(1, 16)],
        'Make': ['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Chevrolet', 'Volkswagen', 'Hyundai', 'Kia', 'Subaru', 'Mazda', 'Lexus', 'Jeep'],
        'Model': ['Camry', 'Civic', 'F-150', '3 Series', 'C-Class', 'A4', 'Altima', 'Silverado', 'Golf', 'Elantra', 'Sportage', 'Outback', 'CX-5', 'RX', 'Wrangler'],
        'Year': [random.randint(2015, 2024) for _ in range(15)],
        'VIN': [f'VIN{random.randint(1000000000, 9999999999)}{chr(65+i%26)}{chr(65+(i*2)%26)}' for i in range(15)],
        'Job1_Desc': ['Oil Change', 'Full Service', 'Brake Inspection', 'Tyre Rotation', 'Engine Diagnostic', 
                      'Oil Change', 'Air Filter Replacement', 'Battery Test', 'Full Service', 'Coolant Flush',
                      'Brake Pad Replacement', 'Wheel Alignment', 'Oil Change', 'State Inspection', 'Suspension Check'],
        'Job1_EstTime': [30, 180, 60, 45, 90, 30, 20, 25, 180, 75, 120, 90, 30, 60, 70],
        'Job2_Desc': [None, 'Tyre Rotation', 'Wiper Blade Replacement', None, 'Air Filter Replacement',
                      'Brake Inspection', None, None, 'Spark Plug Check', None,
                      'Brake Fluid Change', None, 'Tyre Rotation', None, 'Oil Filter Change'],
        'Job2_EstTime': [None, 45, 15, None, 20, 60, None, None, 60, None, 40, None, 45, None, 15],
        'Job3_Desc': [None, 'Coolant Flush', None, None, None, None, None, None, 'Battery Test', None, None, None, None, None, None],
        'Job3_EstTime': [None, 75, None, None, None, None, None, None, 25, None, None, None, None, None, None]
    }
    incoming_vehicles_df = pd.DataFrame(cars_data)
    incoming_vehicles_path = os.path.join(DATA_DIR, 'incoming_vehicles.xlsx')
    incoming_vehicles_df.to_excel(incoming_vehicles_path, index=False)
    print(f"Generated '{incoming_vehicles_path}'")

    # --- 2. past_job_data.xlsx ---
    engineers = [f'ENG{i:03}' for i in range(1, 5)] # 4 Engineers
    job_types_past = ['Oil Change', 'Brake Inspection', 'Tyre Rotation', 'Engine Diagnostic', 'Air Filter Replacement', 
                      'Battery Test', 'Coolant Flush', 'Brake Pad Replacement', 'Spark Plug Replacement', 'Full Service',
                      'Wheel Alignment', 'Suspension Check', 'Wiper Blade Replacement', 'State Inspection', 'Oil Filter Change']
    
    past_jobs_list = []
    for i in range(100): # 100 past job records
        eng = random.choice(engineers)
        job_desc = random.choice(job_types_past)
        car_make = random.choice(cars_data['Make'])
        car_model = random.choice(cars_data['Model']) # Simplified, not necessarily matching make
        outcome = random.randint(1, 5)
        
        # Approximate time based on job type
        if 'Oil Change' in job_desc or 'Filter' in job_desc or 'Wiper' in job_desc : time_taken = random.randint(20, 45)
        elif 'Brake Inspection' in job_desc or 'Tyre Rotation' in job_desc or 'Battery Test' in job_desc: time_taken = random.randint(30, 70)
        elif 'Diagnostic' in job_desc or 'Alignment' in job_desc or 'Suspension' in job_desc : time_taken = random.randint(60, 120)
        elif 'Full Service' in job_desc or 'Pad Replacement' in job_desc or 'Coolant' in job_desc or 'Spark Plug' in job_desc: time_taken = random.randint(90, 200)
        else: time_taken = random.randint(30, 180)

        past_jobs_list.append({
            'Engineer_Id': eng,
            'Job_Description': job_desc,
            'Vehicle_Make': car_make,
            'Vehicle_Model': car_model,
            'Outcome': outcome,
            'Time_Taken': time_taken
        })
    past_job_data_df = pd.DataFrame(past_jobs_list)
    past_job_data_path = os.path.join(DATA_DIR, 'past_job_data.xlsx')
    past_job_data_df.to_excel(past_job_data_path, index=False)
    print(f"Generated '{past_job_data_path}'")

    # --- 3. job_subjob_mapping.csv ---
    sub_job_data = {
        'MainJobName': ['Full Service', 'Full Service', 'Full Service', 'Full Service', 
                        'Brake System Check', 'Brake System Check',
                        'Engine Tune-Up', 'Engine Tune-Up'],
        'SubJobName': ['Oil Change', 'Air Filter Replacement', 'Spark Plug Check', 'Tyre Rotation',
                       'Brake Pad Inspection', 'Brake Fluid Check',
                       'Spark Plug Replacement', 'Ignition Coil Check'],
        'SubJobOrder': [1, 2, 3, 4, 
                        1, 2,
                        1, 2]
    }
    job_subjob_mapping_df = pd.DataFrame(sub_job_data)
    job_subjob_mapping_path = os.path.join(DATA_DIR, 'job_subjob_mapping.csv')
    job_subjob_mapping_df.to_csv(job_subjob_mapping_path, index=False)
    print(f"Generated '{job_subjob_mapping_path}'")

if __name__ == '__main__':
    generate_sample_data()
    print("Sample data generation complete. Files are in the 'data' directory.")