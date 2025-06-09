import sqlite3
import os

# Define the path for the database.
# It will be created in the 'database' folder, relative to this script's parent directory.
DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
DATABASE_NAME = os.path.join(DATABASE_DIR, 'workshop.db')

def create_connection(db_file):
    """ Create a database connection to a SQLite database """
    # Ensure the database directory exists
    os.makedirs(os.path.dirname(db_file), exist_ok=True)
    
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        print(f"SQLite version: {sqlite3.sqlite_version}")
        print(f"Successfully connected to database at {db_file}")
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def create_table(conn, create_table_sql):
    """ Create a table from the create_table_sql statement
    :param conn: Connection object
    :param create_table_sql: a CREATE TABLE statement
    :return:
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
        conn.commit() # Commit changes after creating each table
    except sqlite3.Error as e:
        print(f"Error creating table: {e}")

def setup_database():
    """Main function to create database and tables"""
    
    # SQL statements for creating tables
    sql_create_cars_table = """
    CREATE TABLE IF NOT EXISTS cars (
        car_id TEXT PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        vin TEXT UNIQUE NOT NULL
    );
    """

    sql_create_engineers_table = """
    CREATE TABLE IF NOT EXISTS engineers (
        engineer_id TEXT PRIMARY KEY,
        availability_status TEXT CHECK(availability_status IN ('Yes', 'No')) DEFAULT 'Yes',
        overall_past_job_score REAL 
    );
    """

    sql_create_job_definitions_table = """
    CREATE TABLE IF NOT EXISTS job_definitions (
        job_def_id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name TEXT UNIQUE NOT NULL,
        standard_estimated_time_minutes INTEGER
    );
    """

    sql_create_sub_job_mapping_table = """
    CREATE TABLE IF NOT EXISTS sub_job_mapping (
        mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
        main_job_def_id INTEGER NOT NULL,
        sub_job_def_id INTEGER NOT NULL,
        sub_job_order INTEGER,
        FOREIGN KEY (main_job_def_id) REFERENCES job_definitions (job_def_id) ON DELETE CASCADE,
        FOREIGN KEY (sub_job_def_id) REFERENCES job_definitions (job_def_id) ON DELETE CASCADE
    );
    """

    sql_create_vehicle_jobs_table = """
    CREATE TABLE IF NOT EXISTS vehicle_jobs (
        vehicle_job_id INTEGER PRIMARY KEY AUTOINCREMENT,
        car_id TEXT NOT NULL,
        job_def_id INTEGER NOT NULL,
        parent_vehicle_job_id INTEGER, 
        status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled')),
        assigned_engineer_id TEXT,
        custom_estimated_time_minutes INTEGER,
        job_outcome_score INTEGER CHECK(job_outcome_score BETWEEN 1 AND 5),
        actual_time_taken_minutes INTEGER,
        FOREIGN KEY (car_id) REFERENCES cars (car_id) ON DELETE CASCADE,
        FOREIGN KEY (job_def_id) REFERENCES job_definitions (job_def_id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_engineer_id) REFERENCES engineers (engineer_id) ON DELETE SET NULL,
        FOREIGN KEY (parent_vehicle_job_id) REFERENCES vehicle_jobs (vehicle_job_id) ON DELETE CASCADE 
    );
    """
    # Note: ON DELETE CASCADE means if a referenced record (e.g., a car) is deleted, 
    # related records (e.g., its jobs) are also deleted.
    # ON DELETE SET NULL means if an engineer is deleted, the job assignment becomes NULL.

    sql_create_engineer_past_performance_table = """
    CREATE TABLE IF NOT EXISTS engineer_past_performance (
        performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        engineer_id TEXT NOT NULL,
        job_description_text TEXT NOT NULL, 
        vehicle_make TEXT,
        vehicle_model TEXT,
        outcome_score INTEGER NOT NULL CHECK(outcome_score BETWEEN 1 AND 5),
        time_taken_minutes INTEGER,
        FOREIGN KEY (engineer_id) REFERENCES engineers (engineer_id) ON DELETE CASCADE
    );
    """

    # Create database connection
    conn = create_connection(DATABASE_NAME)

    # Create tables
    if conn is not None:
        print("Creating tables...")
        create_table(conn, sql_create_cars_table)
        create_table(conn, sql_create_engineers_table)
        create_table(conn, sql_create_job_definitions_table)
        create_table(conn, sql_create_sub_job_mapping_table)
        create_table(conn, sql_create_vehicle_jobs_table)
        create_table(conn, sql_create_engineer_past_performance_table)
        
        conn.close()
        print("Database setup complete. Tables created (if they didn't exist).")
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    setup_database()