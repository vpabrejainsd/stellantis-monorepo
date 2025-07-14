import sqlite3
import os

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def display_system_status():
    """Queries and displays a general status of the system."""
    conn = get_db_connection()
    cursor = conn.cursor()
    print("\n" + "="*15 + " System Status " + "="*15)

    # Job status
    cursor.execute("SELECT status, COUNT(*) as count FROM vehicle_jobs GROUP BY status")
    job_counts = cursor.fetchall()
    print("\n--- Job Status ---")
    if job_counts:
        for row in job_counts:
            print(f"{row['status']}: {row['count']} jobs")
    else:
        print("No jobs found in the system.")

    # Engineer status
    cursor.execute("SELECT availability_status, COUNT(*) as count FROM engineers GROUP BY availability_status")
    engineer_counts = cursor.fetchall()
    print("\n--- Engineer Availability ---")
    if engineer_counts:
         for row in engineer_counts:
            status = 'Available' if row['availability_status'] == 'Yes' else 'Busy/Unavailable'
            print(f"{status}: {row['count']} engineers")
    else:
        print("No engineers found in the system.")
    
    print("\n" + "="*47)
    conn.close()

def show_pending_jobs():
    """Displays a list of pending jobs that can be assigned."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT vj.vehicle_job_id, c.make, c.model, jd.job_name 
        FROM vehicle_jobs vj
        JOIN cars c ON vj.car_id = c.car_id
        JOIN job_definitions jd ON vj.job_def_id = jd.job_def_id
        WHERE vj.status = 'Pending'
    """)
    jobs = cursor.fetchall()
    
    print("\n--- Pending Jobs ---")
    if jobs:
        print(f"{'Job ID':<10}{'Vehicle':<25}{'Job Description':<30}")
        print(f"{'-'*6:<10}{'-'*17:<25}{'-'*20:<30}")
        for job in jobs:
            vehicle_name = f"{job['make']} {job['model']}"
            print(f"{job['vehicle_job_id']:<10}{vehicle_name:<25}{job['job_name']:<30}")
        return True
    else:
        print("No pending jobs found.")
        return False
    conn.close()

def show_assigned_jobs():
    """Displays a list of assigned jobs that can be completed."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT vj.vehicle_job_id, vj.assigned_engineer_id, c.make, c.model, jd.job_name 
        FROM vehicle_jobs vj
        JOIN cars c ON vj.car_id = c.car_id
        JOIN job_definitions jd ON vj.job_def_id = jd.job_def_id
        WHERE vj.status = 'Assigned'
    """)
    jobs = cursor.fetchall()
    print("\n--- Assigned (In-Progress) Jobs ---")
    if jobs:
        print(f"{'Job ID':<10}{'Assigned To':<15}{'Vehicle':<25}{'Job Description':<30}")
        print(f"{'-'*6:<10}{'-'*11:<15}{'-'*17:<25}{'-'*20:<30}")
        for job in jobs:
            vehicle_name = f"{job['make']} {job['model']}"
            print(f"{job['vehicle_job_id']:<10}{job['assigned_engineer_id']:<15}{vehicle_name:<25}{job['job_name']:<30}")
        return True
    else:
        print("No assigned jobs found.")
        return False
    conn.close()