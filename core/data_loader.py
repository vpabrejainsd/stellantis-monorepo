import pandas as pd
import sqlite3
import os

# Database path (assuming db_setup.py created it in ../database/workshop.db)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # This is garage_ai_assigner directory
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')

# Data files paths (assuming they are in ../data/)
DATA_DIR = os.path.join(BASE_DIR, 'data')
INCOMING_VEHICLES_FILE = os.path.join(DATA_DIR, 'incoming_vehicles.xlsx')
PAST_JOB_DATA_FILE = os.path.join(DATA_DIR, 'past_job_data.xlsx')
JOB_SUBJOB_MAPPING_FILE = os.path.join(DATA_DIR, 'job_subjob_mapping.csv')

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Allows accessing columns by name
    conn.execute("PRAGMA foreign_keys = ON;") # Enforce foreign key constraints
    return conn

def populate_job_definitions(conn):
    """
    Populates the job_definitions table from all available job sources.
    This function tries to be intelligent about handling job names and their estimated times.
    """
    print("Populating job_definitions table...")
    cursor = conn.cursor()
    
    all_jobs = {} # To store job_name: estimated_time

    # 1. Read from incoming_vehicles.xlsx
    if os.path.exists(INCOMING_VEHICLES_FILE):
        df_incoming = pd.read_excel(INCOMING_VEHICLES_FILE)
        for i in range(1, 4): # Assuming up to Job3_Desc
            job_desc_col = f'Job{i}_Desc'
            job_time_col = f'Job{i}_EstTime'
            if job_desc_col in df_incoming.columns:
                for _, row in df_incoming.iterrows():
                    job_name = row[job_desc_col]
                    est_time = row[job_time_col]
                    if pd.notna(job_name):
                        job_name = str(job_name).strip()
                        if job_name not in all_jobs and pd.notna(est_time):
                            all_jobs[job_name] = int(est_time)
                        elif job_name not in all_jobs: # Job exists but no time, give default
                            all_jobs[job_name] = None # Or a default like 60

    # 2. Read from past_job_data.xlsx
    if os.path.exists(PAST_JOB_DATA_FILE):
        df_past_jobs = pd.read_excel(PAST_JOB_DATA_FILE)
        for job_name in df_past_jobs['Job_Description'].unique():
            if pd.notna(job_name):
                job_name = str(job_name).strip()
                if job_name not in all_jobs:
                    all_jobs[job_name] = None # No estimate time from past data, or use a default

    # 3. Read from job_subjob_mapping.csv
    if os.path.exists(JOB_SUBJOB_MAPPING_FILE):
        df_mapping = pd.read_csv(JOB_SUBJOB_MAPPING_FILE)
        for job_name in pd.concat([df_mapping['MainJobName'], df_mapping['SubJobName']]).unique():
            if pd.notna(job_name):
                job_name = str(job_name).strip()
                if job_name not in all_jobs:
                    all_jobs[job_name] = None # No estimate time from mapping, or use a default
    
    # Insert into job_definitions table
    for job_name, est_time in all_jobs.items():
        try:
            cursor.execute("""
                INSERT INTO job_definitions (job_name, standard_estimated_time_minutes)
                VALUES (?, ?)
            """, (job_name, est_time))
        except sqlite3.IntegrityError:
            # This job name might already exist if db_setup was run multiple times
            # or if a job name had an estimate and then appeared again without.
            # We can choose to update if est_time is now available.
            if est_time is not None:
                 cursor.execute("""
                    UPDATE job_definitions 
                    SET standard_estimated_time_minutes = ? 
                    WHERE job_name = ? AND standard_estimated_time_minutes IS NULL
                 """, (est_time, job_name))
            print(f"Job '{job_name}' likely already exists or update attempted.")
        except Exception as e:
            print(f"Error inserting job '{job_name}': {e}")
            
    conn.commit()
    print(f"Finished populating job_definitions. Total unique jobs: {len(all_jobs)}")


def populate_sub_job_mappings(conn):
    """Populates the sub_job_mapping table."""
    if not os.path.exists(JOB_SUBJOB_MAPPING_FILE):
        print(f"Sub job mapping file not found: {JOB_SUBJOB_MAPPING_FILE}")
        return
        
    print("Populating sub_job_mapping table...")
    df_mapping = pd.read_csv(JOB_SUBJOB_MAPPING_FILE)
    cursor = conn.cursor()

    for _, row in df_mapping.iterrows():
        try:
            main_job_name = str(row['MainJobName']).strip()
            sub_job_name = str(row['SubJobName']).strip()
            order = int(row['SubJobOrder']) if pd.notna(row['SubJobOrder']) else None

            # Get main_job_def_id
            cursor.execute("SELECT job_def_id FROM job_definitions WHERE job_name = ?", (main_job_name,))
            main_job_row = cursor.fetchone()
            if not main_job_row:
                print(f"Warning: Main job '{main_job_name}' not found in job_definitions. Skipping mapping.")
                continue
            main_job_def_id = main_job_row['job_def_id']

            # Get sub_job_def_id
            cursor.execute("SELECT job_def_id FROM job_definitions WHERE job_name = ?", (sub_job_name,))
            sub_job_row = cursor.fetchone()
            if not sub_job_row:
                print(f"Warning: Sub job '{sub_job_name}' not found in job_definitions. Skipping mapping.")
                continue
            sub_job_def_id = sub_job_row['job_def_id']
            
            cursor.execute("""
                INSERT INTO sub_job_mapping (main_job_def_id, sub_job_def_id, sub_job_order)
                VALUES (?, ?, ?)
            """, (main_job_def_id, sub_job_def_id, order))
        except sqlite3.IntegrityError:
            print(f"Mapping for '{main_job_name}' -> '{sub_job_name}' might already exist.")
        except Exception as e:
            print(f"Error inserting sub job mapping for '{main_job_name}' -> '{sub_job_name}': {e}")
    conn.commit()
    print("Finished populating sub_job_mapping.")


def populate_cars_and_vehicle_jobs(conn):
    """Populates cars and vehicle_jobs tables from incoming_vehicles.xlsx."""
    if not os.path.exists(INCOMING_VEHICLES_FILE):
        print(f"Incoming vehicles file not found: {INCOMING_VEHICLES_FILE}")
        return

    print("Populating cars and vehicle_jobs tables...")
    df_incoming = pd.read_excel(INCOMING_VEHICLES_FILE)
    cursor = conn.cursor()

    for _, row in df_incoming.iterrows():
        try:
            # Insert into cars table
            cursor.execute("""
                INSERT INTO cars (car_id, make, model, year, vin)
                VALUES (?, ?, ?, ?, ?)
            """, (str(row['Car_Id']), str(row['Make']), str(row['Model']), int(row['Year']), str(row['VIN'])))
            
            # Insert jobs into vehicle_jobs table
            for i in range(1, 4): # Job1, Job2, Job3
                job_desc_col = f'Job{i}_Desc'
                job_time_col = f'Job{i}_EstTime'
                if job_desc_col in df_incoming.columns and pd.notna(row[job_desc_col]):
                    job_name = str(row[job_desc_col]).strip()
                    est_time = int(row[job_time_col]) if pd.notna(row[job_time_col]) else None
                    
                    # Get job_def_id
                    cursor.execute("SELECT job_def_id FROM job_definitions WHERE job_name = ?", (job_name,))
                    job_def_row = cursor.fetchone()
                    if not job_def_row:
                        print(f"Warning: Job definition '{job_name}' not found. Skipping this vehicle job for car {row['Car_Id']}.")
                        continue
                    job_def_id = job_def_row['job_def_id']

                    cursor.execute("""
                        INSERT INTO vehicle_jobs (car_id, job_def_id, custom_estimated_time_minutes, status)
                        VALUES (?, ?, ?, 'Pending')
                    """, (str(row['Car_Id']), job_def_id, est_time))
        except sqlite3.IntegrityError as e:
            print(f"Skipping car or job for {row.get('Car_Id', 'Unknown Car_Id')} due to IntegrityError (likely duplicate): {e}")
        except Exception as e:
            print(f"Error processing car {row.get('Car_Id', 'Unknown Car_Id')}: {e}")
    conn.commit()
    print("Finished populating cars and vehicle_jobs.")


def populate_engineers_and_past_performance(conn):
    """Populates engineers and engineer_past_performance tables."""
    if not os.path.exists(PAST_JOB_DATA_FILE):
        print(f"Past job data file not found: {PAST_JOB_DATA_FILE}")
        return

    print("Populating engineers and engineer_past_performance tables...")
    df_past = pd.read_excel(PAST_JOB_DATA_FILE)
    cursor = conn.cursor()

    # Populate engineers table
    for engineer_id in df_past['Engineer_Id'].unique():
        try:
            cursor.execute("""
                INSERT INTO engineers (engineer_id, availability_status) 
                VALUES (?, 'Yes')
            """, (str(engineer_id),)) # Default availability to 'Yes'
        except sqlite3.IntegrityError:
            print(f"Engineer '{engineer_id}' likely already exists.")
        except Exception as e:
            print(f"Error inserting engineer '{engineer_id}': {e}")
    
    # Populate engineer_past_performance table
    for _, row in df_past.iterrows():
        try:
            # Ensure the job_description_text refers to a job in job_definitions
            # This step was handled by populate_job_definitions, so we assume jobs exist.
            # If not, this insert might fail if strict foreign keys were on job_description_text (they are not)
            # or one might choose to link to job_def_id here if job names are clean enough.
            # For now, storing raw text as per schema.

            cursor.execute("""
                INSERT INTO engineer_past_performance 
                (engineer_id, job_description_text, vehicle_make, vehicle_model, outcome_score, time_taken_minutes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (str(row['Engineer_Id']), str(row['Job_Description']), str(row['Vehicle_Make']), 
                  str(row['Vehicle_Model']), int(row['Outcome']), int(row['Time_Taken'])))
        except Exception as e:
            print(f"Error inserting past performance for engineer {row['Engineer_Id']} on job '{row['Job_Description']}': {e}")
    conn.commit()
    print("Finished populating engineers and engineer_past_performance.")


def main_loader():
    """Main function to load all data into the database."""
    
    # First, ensure db_setup.py has run and workshop.db exists with tables
    # For simplicity, this script assumes tables are empty or handles duplicates gracefully.
    # In a production system, you might clear tables or have more sophisticated ETL.

    conn = get_db_connection()
    if conn is None:
        print("Could not connect to the database. Exiting.")
        return

    try:
        # Order is important due to foreign key constraints
        populate_job_definitions(conn)
        populate_sub_job_mappings(conn) # Depends on job_definitions
        populate_cars_and_vehicle_jobs(conn) # Depends on job_definitions and cars
        populate_engineers_and_past_performance(conn) # Depends on engineers
    finally:
        conn.close()
        print("Data loading process finished.")

if __name__ == '__main__':
    # It's good practice to confirm that the database file and tables exist.
    # You would have run core/db_setup.py first.
    if not os.path.exists(DATABASE_NAME):
        print(f"Database file {DATABASE_NAME} not found. Please run db_setup.py first.")
    else:
        main_loader()