# In core/engineer_analyzer.py
import pandas as pd
import sqlite3
import os
import numpy as np

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'database/workshop.db')

def calculate_overall_performance(engineer_df):
    """Calculates a credible Overall_Performance_Score using a weighted average."""
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

def analyze_and_update_profiles():
    """
    Reads from the job_history table, calculates performance metrics,
    and updates the engineer_profiles table in the database.
    """
    print("--- Starting Engineer Performance Analysis ---")
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # 1. Read all necessary data from the database
        print("Reading data from database...")
        df_history = pd.read_sql_query("SELECT * FROM job_history WHERE Status = 'Completed'", conn)
        df_profiles = pd.read_sql_query("SELECT * FROM engineer_profiles", conn)

        if df_history.empty:
            print("Job history is empty. No new data to analyze.")
            return

        # 2. Calculate REAL metrics from the job history data
        print("Calculating performance metrics from history...")
        # General stats
        engineer_stats = df_history.groupby('Assigned_Engineer_Id').agg(
            Avg_Job_Completion_Time=('Time_Taken_minutes', 'mean'),
            Customer_Rating=('Outcome_Score', 'mean')
        ).reset_index()

        # Job-level scores
        job_scores = df_history.groupby(['Assigned_Engineer_Id', 'Job_Name'])['Outcome_Score'].mean().unstack()
        job_scores = ((job_scores - 1) / 4) * 100
        job_scores.columns = [f"Overall_{col.replace(' ', '_')}_Score" for col in job_scores.columns]
        
        # Task-level scores
        task_scores = df_history.groupby(['Assigned_Engineer_Id', 'Task_to_be_done'])['Outcome_Score'].mean().unstack()
        task_scores = ((task_scores - 1) / 4) * 100
        task_scores.columns = [f"{col.replace(' ', '_').replace('(', '').replace(')', '').replace(',', '')}_Score" for col in task_scores.columns]

        # 3. Merge calculated scores into the base profiles
        print("Merging calculated scores...")
        # Start with the original profiles
        updated_df = pd.merge(df_profiles[['Engineer_ID', 'Engineer_Name']], engineer_stats, left_on='Engineer_ID', right_on='Assigned_Engineer_Id', how='left')
        updated_df = pd.merge(updated_df, job_scores, left_on='Engineer_ID', right_on='Assigned_Engineer_Id', how='left')
        updated_df = pd.merge(updated_df, task_scores, left_on='Engineer_ID', right_on='Assigned_Engineer_Id', how='left')
        
        # Clean up and fill missing values
        updated_df.drop(columns=[col for col in updated_df.columns if 'Assigned_Engineer_Id' in str(col)], inplace=True)
        score_cols_to_fill = [col for col in updated_df.columns if '_Score' in col]
        updated_df[score_cols_to_fill] = updated_df[score_cols_to_fill].fillna(75.0)
        updated_df['Avg_Job_Completion_Time'].fillna(updated_df['Avg_Job_Completion_Time'].mean(), inplace=True)
        updated_df['Customer_Rating'].fillna(3.0, inplace=True)
        
        # 4. Calculate the final weighted performance score
        final_profiles_df = calculate_overall_performance(updated_df)
        
        # 5. Update the database table
        print("Updating engineer_profiles table in the database...")
        cursor = conn.cursor()
        for _, row in final_profiles_df.iterrows():
            # Prepare the SET part of the SQL query dynamically
            set_clause = ", ".join([f'"{col}" = ?' for col in final_profiles_df.columns if col != 'Engineer_ID'])
            values = [row[col] for col in final_profiles_df.columns if col != 'Engineer_ID']
            values.append(row['Engineer_ID']) # for the WHERE clause
            
            sql_update = f"UPDATE engineer_profiles SET {set_clause} WHERE Engineer_ID = ?"
            cursor.execute(sql_update, values)

        conn.commit()
        print(f"Successfully updated {len(final_profiles_df)} records in the engineer_profiles table.")

    except Exception as e:
        print(f"An error occurred during analysis: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    analyze_and_update_profiles()
    print("\nAnalysis process complete.")