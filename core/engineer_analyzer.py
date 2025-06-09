import sqlite3
import os
import pandas as pd

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # garage_ai_assigner directory
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Allows accessing columns by name
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def calculate_and_update_engineer_scores():
    """
    Calculates the average past job score for each engineer and updates
    the 'overall_past_job_score' in the 'engineers' table.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Calculating and updating engineer overall past job scores...")

    try:
        # Fetch all past performance data
        cursor.execute("SELECT engineer_id, outcome_score FROM engineer_past_performance")
        past_performances = cursor.fetchall()

        if not past_performances:
            print("No past performance data found to calculate scores.")
            return

        # Use Pandas for easy grouping and averaging
        df_performance = pd.DataFrame(past_performances, columns=['engineer_id', 'outcome_score'])
        
        # Ensure outcome_score is numeric
        df_performance['outcome_score'] = pd.to_numeric(df_performance['outcome_score'], errors='coerce')
        
        # Calculate average score per engineer
        # The .groupby().mean() will calculate the average of 'outcome_score' for each 'engineer_id'
        engineer_scores = df_performance.groupby('engineer_id')['outcome_score'].mean().reset_index()
        engineer_scores.rename(columns={'outcome_score': 'avg_score'}, inplace=True)

        # Update the engineers table
        updated_count = 0
        for _, row in engineer_scores.iterrows():
            engineer_id = row['engineer_id']
            avg_score = row['avg_score']
            
            # Ensure engineer exists in the engineers table (should have been populated by data_loader)
            cursor.execute("SELECT 1 FROM engineers WHERE engineer_id = ?", (engineer_id,))
            if cursor.fetchone():
                cursor.execute("""
                    UPDATE engineers
                    SET overall_past_job_score = ?
                    WHERE engineer_id = ?
                """, (avg_score, engineer_id))
                updated_count += 1
            else:
                print(f"Warning: Engineer ID {engineer_id} found in performance data but not in engineers table. Skipping score update for this engineer.")
        
        conn.commit()
        print(f"Successfully updated overall_past_job_score for {updated_count} engineers.")

    except sqlite3.Error as e:
        print(f"Database error during score calculation/update: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    if not os.path.exists(DATABASE_NAME):
        print(f"Database file {DATABASE_NAME} not found. Please run db_setup.py and data_loader.py first.")
    else:
        # Make sure engineers and their past performance data are loaded first
        print("Ensuring engineers and past performance data are loaded before calculating scores...")
        print("(This script assumes data_loader.py has been run successfully.)")
        calculate_and_update_engineer_scores()