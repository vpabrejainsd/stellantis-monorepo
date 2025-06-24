# In core/data_loader.py
import pandas as pd
import sqlite3
import os

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')
# This is the Excel file you want to load
HISTORY_EXCEL_PATH = os.path.join(BASE_DIR, 'data/generated_flat_job_history.xlsx') 
ENGINEER_PROFILES_EXCEL_PATH = os.path.join(BASE_DIR, 'data/engineer_profiles.xlsx') 

def load_data_from_excel():
    """
    Reads the data from the source Excel files, ensures columns match the database schema,
    and populates the corresponding tables.
    """
    print("--- Starting Data Loading Process ---")
    
    try:
        # --- Load JOB HISTORY data ---
        print(f"Reading job history from: {HISTORY_EXCEL_PATH}")
        df_history = pd.read_excel(HISTORY_EXCEL_PATH)
        # Ensure datetime columns are handled correctly
        df_history['Time_Started'] = pd.to_datetime(df_history['Time_Started'])
        df_history['Time_Ended'] = pd.to_datetime(df_history['Time_Ended'])
        df_history['Date_Completed'] = pd.to_datetime(df_history['Date_Completed'])
        print(f"Loaded {len(df_history)} job history records.")

        # --- Load ENGINEER PROFILES data ---
        print(f"Reading engineer profiles from: {ENGINEER_PROFILES_EXCEL_PATH}")
        df_engineers = pd.read_excel(ENGINEER_PROFILES_EXCEL_PATH)
        print(f"Loaded {len(df_engineers)} engineer profiles.")

    except FileNotFoundError as e:
        print(f"FATAL ERROR: Could not find a source Excel file.")
        print(f"Details: {e}")
        return
    except Exception as e:
        print(f"FATAL ERROR during file reading: {e}")
        return

    # --- Connect to the database and load the data ---
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH)
        print("Successfully connected to the database.")

        # Populate the 'job_history' table
        # The 'if_exists='replace'' command will delete the old table and create a new one.
        # This is useful for testing. Change to 'append' if you want to add to existing data.
        df_history.to_sql('job_history', conn, if_exists='replace', index=False)
        print(f"Successfully populated the 'job_history' table with {len(df_history)} records.")

        # Populate the 'engineer_profiles' table
        df_engineers.to_sql('engineer_profiles', conn, if_exists='replace', index=False)
        print(f"Successfully populated the 'engineer_profiles' table with {len(df_engineers)} records.")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        print("Please ensure the column names in your Excel files exactly match the column names in your db_setup.py tables.")
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == '__main__':
    # Ensure your db_setup.py has been run first to create the tables.
    load_data_from_excel()
    print("\nData loading process complete.")