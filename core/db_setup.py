# In core/db_setup.py
import sqlite3
import os

DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
DATABASE_NAME = os.path.join(DATABASE_DIR, 'workshop.db')

def create_connection(db_file):
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    conn = None
    try:
        conn = sqlite3.connect(db_file)
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def create_table(conn, create_table_sql):
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
        conn.commit()
    except sqlite3.Error as e:
        print(f"Error creating table: {e}")

def setup_database():
    # --- This is the new, centralized job_history table schema ---
    sql_create_job_history_table = """
    CREATE TABLE IF NOT EXISTS job_history (
        Job_Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Job_Name TEXT,
        Task_Id TEXT NOT NULL,
        Task_Description TEXT,
        Status TEXT,
        Date_Completed DATE,
        Urgency TEXT,
        Make TEXT,
        Model TEXT,
        Mileage INTEGER,
        VIN TEXT,
        Assigned_Engineer_Id TEXT,
        Engineer_Name TEXT,
        Engineer_Level TEXT,
        Time_Started DATETIME,
        Time_Ended DATETIME,
        Time_Taken_minutes INTEGER,
        Estimated_Standard_Time INTEGER,
        Outcome_Score INTEGER
    );
    """

    sql_create_job_definitions_table = """
    CREATE TABLE IF NOT EXISTS job_definitions (
        Parent_job_id TEXT PRIMARY KEY,
        Job_name TEXT UNIQUE NOT NULL
    );
    """

    # --- Defines individual, assignable tasks (e.g., "Oil Change") ---
    sql_create_task_definitions_table = """
    CREATE TABLE IF NOT EXISTS task_definitions (
        Task_id TEXT PRIMARY KEY,
        Task_Description TEXT UNIQUE NOT NULL,
        Estimated_time_minutes INTEGER
    );
    """

    # --- Maps which tasks belong to which job and in what order ---
    sql_create_job_task_mapping_table = """
    CREATE TABLE IF NOT EXISTS job_task_mapping (
        mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
        Parent_job_id TEXT NOT NULL,
        Task_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        FOREIGN KEY (Parent_job_id) REFERENCES job_definitions (job_id),
        FOREIGN KEY (Task_id) REFERENCES task_definitions (task_id)
    );
    """
    sql_create_engineer_profiles_table = """
    CREATE TABLE IF NOT EXISTS engineer_profiles (
        Engineer_id TEXT PRIMARY KEY,
        Engineer_name TEXT,
        Availability TEXT,
        Year_of_Experience INTEGER,
        Avg_Job_Completion_Time INTEGER,
        Specialization TEXT,
        Certifications TEXT,
        Customer_Rating INTEGER,
        Overall_Performance_Score INTEGER,
        Overall_Basic_Service_Score INTEGER,
        Overall_Intermediate_Service_Score INTEGER,
        Overall_Full_Service_Score INTEGER,
        Oil_Change_Score INTEGER,
        Oil_Filter_Replacement INTEGER,
        Air_Filter_Check_Score INTEGER,
        Fluid_Levels_Check_Score INTEGER,
        Tyre_Pressure_Check_Score INTEGER,
        Visual_Inspection_Score INTEGER,
        Brake_Inspection_Score INTEGER,
        Tyre_Condition_and_Alignment_Check_Score INTEGER,
        Battery_Check_Score INTEGER,
        Exhaust_System_Inspection_Score INTEGER,
        Steering_and_Suspension_Check_Score INTEGER,
        Lights_and_Wipers_Check_Score INTEGER,
        Transmission_Check_Score INTEGER,
        Spark_Plugs_Replacement_Score INTEGER,
        Fuel_System_Inspection_Score INTEGER,
        Timing_Belt_Inspection_Score INTEGER,
        Comprehensive_Diagnostic_Check_Score INTEGER,
        Underbody_Inspection_Score INTEGER,
        Cabin_Filter_Replacement_Score INTEGER

    );
    """

    conn = create_connection(DATABASE_NAME)

    if conn is not None:
        print("Creating tables...")
        create_table(conn, sql_create_job_history_table)
        create_table(conn, sql_create_job_definitions_table)
        create_table(conn, sql_create_task_definitions_table)
        create_table(conn, sql_create_job_task_mapping_table)
        create_table(conn, sql_create_engineer_profiles_table)
        conn.close()
        print("Database setup complete.")
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    setup_database()