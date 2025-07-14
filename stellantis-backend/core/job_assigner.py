import sqlite3
import os
import pandas as pd
import joblib # For loading the model
import random

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # garage_ai_assigner directory
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')

# Model path (should match where predictive_model.py saved it)
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_FILE_PATH = os.path.join(MODEL_DIR, 'job_success_model.joblib')


def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Allows accessing columns by name
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def load_model():
    """Loads the trained model pipeline from disk."""
    if os.path.exists(MODEL_FILE_PATH):
        try:
            model_pipeline = joblib.load(MODEL_FILE_PATH)
            print(f"Model pipeline loaded successfully from {MODEL_FILE_PATH}")
            return model_pipeline
        except Exception as e:
            print(f"Error loading model: {e}")
            return None
    else:
        print(f"Model file not found at {MODEL_FILE_PATH}. Train the model first using predictive_model.py.")
        return None

def get_pending_job_details(conn, vehicle_job_id):
    """Fetches details for a specific pending job."""
    cursor = conn.cursor()
    query = """
    SELECT
        vj.vehicle_job_id,
        vj.car_id,
        jd.job_name AS job_description_text, -- Using job_name as the consistent job identifier
        jd.standard_estimated_time_minutes AS job_estimated_time,
        c.make AS vehicle_make,
        c.model AS vehicle_model -- Added for completeness, though not in initial model features
    FROM
        vehicle_jobs vj
    JOIN
        job_definitions jd ON vj.job_def_id = jd.job_def_id
    JOIN
        cars c ON vj.car_id = c.car_id
    WHERE
        vj.vehicle_job_id = ? AND vj.status = 'Pending';
    """
    cursor.execute(query, (vehicle_job_id,))
    job_details = cursor.fetchone()
    if job_details:
        print(f"Found pending job: ID {job_details['vehicle_job_id']}, Desc: {job_details['job_description_text']}")
    else:
        print(f"No pending job found with ID {vehicle_job_id} or it's not in 'Pending' status.")
    return job_details

def get_available_engineers(conn):
    """Fetches engineers who are currently available."""
    cursor = conn.cursor()
    cursor.execute("SELECT engineer_id, overall_past_job_score FROM engineers WHERE availability_status = 'Yes'")
    engineers = cursor.fetchall()
    print(f"Found {len(engineers)} available engineers.")
    return engineers

def get_engineer_specific_job_history(conn, engineer_id, job_description_text):
    """
    Fetches an engineer's average score and experience count for a specific job type.
    """
    cursor = conn.cursor()
    query = """
    SELECT 
        AVG(outcome_score) as eng_job_specific_avg_score,
        COUNT(performance_id) as eng_job_specific_exp_count
    FROM 
        engineer_past_performance
    WHERE 
        engineer_id = ? AND job_description_text = ?; 
        -- Assuming job_description_text in past_performance matches job_definitions.job_name
    """
    cursor.execute(query, (engineer_id, job_description_text))
    history = cursor.fetchone()
    
    avg_score = history['eng_job_specific_avg_score'] if history and history['eng_job_specific_avg_score'] is not None else None
    exp_count = history['eng_job_specific_exp_count'] if history and history['eng_job_specific_exp_count'] is not None else 0
    
    return avg_score, exp_count

def assign_job_to_engineer(target_vehicle_job_id):
    """
    Main logic to assign a target pending job to the best available engineer.
    """
    conn = get_db_connection()
    if conn is None: return

    model_pipeline = load_model()
    if model_pipeline is None: return

    job_to_assign = get_pending_job_details(conn, target_vehicle_job_id)
    if not job_to_assign:
        conn.close()
        return

    available_engineers = get_available_engineers(conn)
    if not available_engineers:
        print("No engineers are currently available.")
        conn.close()
        return

    engineer_predictions = []

    for engineer in available_engineers:
        engineer_id = engineer['engineer_id']
        engineer_general_score = engineer['overall_past_job_score']
        
        # Get engineer's specific history for this job type
        # job_to_assign['job_description_text'] should be the key used in training
        specific_avg_score, specific_exp_count = get_engineer_specific_job_history(
            conn, engineer_id, job_to_assign['job_description_text']
        )

        # Fill missing specific scores (e.g., if first time for this job type)
        # This logic should mirror what was done in preprocess_data in predictive_model.py
        if specific_avg_score is None:
            specific_avg_score = engineer_general_score  # Use general score if no specific history
            if specific_avg_score is None: specific_avg_score = 3.0 # Fallback if general also missing (avg score)
        if specific_exp_count is None: # Should be 0 from query if no records
            specific_exp_count = 0

        # Construct feature DataFrame for prediction (must match training structure)
        # The model pipeline's preprocessor expects a DataFrame.
        feature_data = {
            'job_description_text': [job_to_assign['job_description_text']],
            'vehicle_make': [job_to_assign['vehicle_make']], # Ensure this was used in training
            'engineer_general_score': [engineer_general_score if engineer_general_score is not None else 3.0],
            'job_estimated_time': [job_to_assign['job_estimated_time'] if job_to_assign['job_estimated_time'] is not None else 60],
            'eng_job_specific_avg_score': [specific_avg_score],
            'eng_job_specific_exp_count': [specific_exp_count]
            # Add other features if they were used in training, matching column names.
        }
        # Ensure all columns expected by the preprocessor are present.
        # The preprocessor in the pipeline will handle one-hot encoding, scaling etc.
        # Check your predictive_model.py for the exact feature set `X.columns` before preprocessor.
        
        # For this example, ensure feature_data keys match the original columns fed to ColumnTransformer
        # Original features used in ColumnTransformer (from predictive_model.py):
        # categorical_features = ['job_description_text', 'vehicle_make']
        # numerical_features = ['engineer_general_score', 'job_estimated_time', 
        #                       'eng_job_specific_avg_score', 'eng_job_specific_exp_count']
        # So the DataFrame should have these columns.
        
        sample_df = pd.DataFrame(feature_data)
        
        try:
            # Predict probability of "High Success" (class 1)
            probability_high_success = model_pipeline.predict_proba(sample_df)[:, 1][0]
            engineer_predictions.append({
                'engineer_id': engineer_id,
                'probability': probability_high_success
            })
            print(f"  Engineer {engineer_id}: Predicted Success Probability = {probability_high_success:.4f}")
        except Exception as e:
            print(f"  Error predicting for engineer {engineer_id}: {e}. Check feature consistency.")
            print(f"  Features provided: {feature_data}")


    if not engineer_predictions:
        print("Could not make predictions for any engineer.")
        conn.close()
        return

    # Sort engineers by probability in descending order
    engineer_predictions.sort(key=lambda x: x['probability'], reverse=True)

    best_engineer = None
    if engineer_predictions:
        top_candidate_score = engineer_predictions[0]['probability']
        # Find all candidates with scores "similar" to the top one (e.g., within 0.05)
        similar_top_candidates = [
            p for p in engineer_predictions if (top_candidate_score - p['probability']) < 0.05
        ]
        
        if similar_top_candidates:
            # Distribute: Randomly select one from the similar top candidates
            chosen_candidate = random.choice(similar_top_candidates)
            best_engineer_id = chosen_candidate['engineer_id']
            best_probability = chosen_candidate['probability']
            print(f"\nMultiple top candidates with similar scores. Randomly selected for distribution.")
            print(f"Assigned Engineer: {best_engineer_id} with probability {best_probability:.4f}")
        else: # Should not happen if engineer_predictions is not empty, but as a fallback:
            best_engineer_id = engineer_predictions[0]['engineer_id']
            best_probability = engineer_predictions[0]['probability']
            print(f"\nBest Engineer: {best_engineer_id} with probability {best_probability:.4f}")
            
        # Perform the assignment in the database
        cursor = conn.cursor()
        try:
            # Update vehicle_jobs table
            cursor.execute("""
                UPDATE vehicle_jobs
                SET assigned_engineer_id = ?, status = 'Assigned'
                WHERE vehicle_job_id = ?
            """, (best_engineer_id, target_vehicle_job_id))

            # Update engineers table (set availability)
            cursor.execute("""
                UPDATE engineers
                SET availability_status = 'No'
                WHERE engineer_id = ?
            """, (best_engineer_id,))
            
            conn.commit()
            print(f"Job ID {target_vehicle_job_id} successfully assigned to Engineer {best_engineer_id}.")
        except sqlite3.Error as e:
            conn.rollback() # Rollback changes if any error occurs during DB update
            print(f"Database error during assignment: {e}")
        finally:
            conn.close()
    else:
        print("No suitable engineer found or predictions failed.")
        conn.close()


if __name__ == '__main__':
    # Example: Try to assign a specific pending job
    # You'd typically get this ID from your system (e.g., the first pending job)
    
    # Let's find a sample pending vehicle_job_id from the database to test with
    conn_test = get_db_connection()
    if conn_test:
        test_cursor = conn_test.cursor()
        test_cursor.execute("SELECT vehicle_job_id FROM vehicle_jobs WHERE status = 'Pending' LIMIT 1")
        pending_job_row = test_cursor.fetchone()
        conn_test.close()

        if pending_job_row:
            sample_job_id_to_assign = pending_job_row['vehicle_job_id']
            print(f"\n--- Attempting to assign Vehicle Job ID: {sample_job_id_to_assign} ---")
            assign_job_to_engineer(sample_job_id_to_assign)
        else:
            print("No pending jobs found in the database to test assignment.")
    else:
        print("Could not connect to database to find a sample job.")