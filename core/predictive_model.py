import sqlite3
import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib # For saving and loading the model

# Database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # garage_ai_assigner directory
DATABASE_NAME = os.path.join(BASE_DIR, 'database', 'workshop.db')
MODEL_DIR = os.path.join(BASE_DIR, 'models') # Directory to save trained models
os.makedirs(MODEL_DIR, exist_ok=True) # Ensure model directory exists
MODEL_FILE_PATH = os.path.join(MODEL_DIR, 'job_success_model.joblib')
PREPROCESSOR_FILE_PATH = os.path.join(MODEL_DIR, 'preprocessor.joblib')


def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row # Allows accessing columns by name
    return conn

def fetch_training_data():
    """
    Fetches data from the database to build a dataset for model training.
    Each row will represent a completed job from engineer_past_performance.
    """
    print("Fetching training data from database...")
    conn = get_db_connection()
    query = """
    SELECT
        ep.engineer_id,
        ep.job_description_text, -- This will be our primary job type identifier
        ep.vehicle_make,
        ep.vehicle_model,
        ep.outcome_score,         -- This will be used to create the target variable
        e.overall_past_job_score AS engineer_general_score, -- From engineers table
        jd.standard_estimated_time_minutes AS job_estimated_time -- From job_definitions
    FROM
        engineer_past_performance ep
    JOIN
        engineers e ON ep.engineer_id = e.engineer_id
    LEFT JOIN 
        job_definitions jd ON ep.job_description_text = jd.job_name; 
        -- We use job_description_text from past_performance as the job identifier
        -- It's assumed this text matches a job_name in job_definitions for estimate
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    if df.empty:
        print("No training data fetched. Check database and table contents.")
        return pd.DataFrame()

    print(f"Fetched {len(df)} records for training data construction.")
    return df

def engineer_job_specific_metrics(df_all_past_jobs):
    """
    Calculates engineer's average score and experience count for each specific job type
    based on their entire history present in df_all_past_jobs.
    """
    # Engineer's average score for a specific job type
    # Ensure outcome_score is numeric for calculations
    df_all_past_jobs['outcome_score_numeric'] = pd.to_numeric(df_all_past_jobs['outcome_score'], errors='coerce')

    # Calculate avg score for each engineer on each job_description_text
    specific_avg_scores = df_all_past_jobs.groupby(['engineer_id', 'job_description_text'])['outcome_score_numeric'].mean().reset_index()
    specific_avg_scores.rename(columns={'outcome_score_numeric': 'eng_job_specific_avg_score'}, inplace=True)

    # Engineer's experience count for a specific job type
    specific_exp_counts = df_all_past_jobs.groupby(['engineer_id', 'job_description_text']).size().reset_index(name='eng_job_specific_exp_count')
    
    # Merge these features back into the main DataFrame
    df_merged = pd.merge(df_all_past_jobs, specific_avg_scores, on=['engineer_id', 'job_description_text'], how='left')
    df_merged = pd.merge(df_merged, specific_exp_counts, on=['engineer_id', 'job_description_text'], how='left')
    
    # For a given row (a specific job instance), the specific experience count should ideally be
    # the count *before* this job. For simplicity in this POC, we're using the total count.
    # A more advanced approach would involve time-series based feature engineering.
    # If an engineer is doing a job type for the first time in the dataset, this specific avg_score might be NaN.
    # And experience count would be 1. We'll fill NaNs later.
    
    df_merged.drop(columns=['outcome_score_numeric'], inplace=True, errors='ignore')
    return df_merged

def preprocess_data(df):
    """
    Preprocesses the raw data: feature engineering, target creation, and cleaning.
    """
    if df.empty:
        return pd.DataFrame(), None, None # Return empty df, features, and target

    print("Preprocessing data...")

    # 1. Engineer job-specific metrics (calculated based on the whole dataset)
    df = engineer_job_specific_metrics(df.copy()) # Use .copy() to avoid SettingWithCopyWarning

    # 2. Create Target Variable: 'high_success' (binary)
    # outcome_score is 1-5. Let's say 4, 5 are high success (1), else 0.
    df['high_success'] = df['outcome_score'].apply(lambda x: 1 if x >= 4 else 0)

    # 3. Feature Selection & Handling Missing Values
    # Initial features:
    # Categorical: job_description_text, vehicle_make (can add vehicle_model later if desired)
    # Numerical: engineer_general_score, job_estimated_time, eng_job_specific_avg_score, eng_job_specific_exp_count
    
    # Fill NaNs for numerical features (e.g., with mean or a specific value like 0)
    # engineer_general_score should ideally not be NaN if engineer_analyzer.py ran.
    df['engineer_general_score'].fillna(df['engineer_general_score'].mean(), inplace=True)
    # job_estimated_time might be NaN if job_description_text from past_performance isn't in job_definitions, or has no estimate.
    df['job_estimated_time'].fillna(df['job_estimated_time'].median(), inplace=True) # Use median for time
    # For eng_job_specific_avg_score, NaN means no prior specific jobs or first time. Could fill with overall avg score or 0.
    df['eng_job_specific_avg_score'].fillna(df['engineer_general_score'], inplace=True) # Fill with general score
    # For eng_job_specific_exp_count, NaN (unlikely after groupby.size) can be 0. It will be 1 if it's their first time.
    df['eng_job_specific_exp_count'].fillna(0, inplace=True)


    # Define features (X) and target (y)
    # Note: 'engineer_id' is not used as a direct feature as its effect should be captured
    # by the engineered features like 'engineer_general_score', 'eng_job_specific_avg_score', etc.
    # 'outcome_score' and 'vehicle_model' are also dropped for this initial model.
    X = df.drop(columns=['engineer_id', 'outcome_score', 'high_success', 'vehicle_model'])
    y = df['high_success']
    
    print(f"Data shape before defining preprocessor: X - {X.shape}, y - {y.shape}")
    if X.empty:
        print("No data available after preprocessing steps.")
        return pd.DataFrame(), None, None

    # Identify categorical and numerical features for the preprocessor
    categorical_features = ['job_description_text', 'vehicle_make']
    # Ensure all categorical features are actually in X's columns
    categorical_features = [col for col in categorical_features if col in X.columns]

    numerical_features = ['engineer_general_score', 'job_estimated_time', 
                          'eng_job_specific_avg_score', 'eng_job_specific_exp_count']
    # Ensure all numerical features are actually in X's columns
    numerical_features = [col for col in numerical_features if col in X.columns]

    print(f"Identified Categorical Features: {categorical_features}")
    print(f"Identified Numerical Features: {numerical_features}")

    # Create a preprocessor object using ColumnTransformer
    # OneHotEncoder for categorical features: handle_unknown='ignore' will prevent errors if new categories appear in prediction
    # StandardScaler for numerical features: scales data to have mean 0 and variance 1
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features),
            ('num', StandardScaler(), numerical_features)
        ], 
        remainder='passthrough' # In case some columns are not specified, pass them through
    )
    
    # It's good practice to fit the preprocessor on training data only
    # and then transform both training and test data.
    # For now, we define it. It will be part of a pipeline.

    return X, y, preprocessor


def train_and_evaluate_model(X, y, preprocessor):
    """
    Trains a Logistic Regression model and evaluates it.
    Saves the trained model and preprocessor.
    """
    if X.empty or y.empty:
        print("Cannot train model: No data available.")
        return None, None

    print("Splitting data into train and test sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Training set size: {X_train.shape[0]}, Test set size: {X_test.shape[0]}")

    # Create a pipeline that includes preprocessing and the model
    # Pipeline helps manage steps: transform data then fit model
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(solver='liblinear', random_state=42, class_weight='balanced')) 
        # class_weight='balanced' can help if one class is much more frequent
    ])

    print("Training the model...")
    model_pipeline.fit(X_train, y_train)

    print("\nModel Evaluation:")
    # Predictions on the test set
    y_pred_test = model_pipeline.predict(X_test)
    y_pred_proba_test = model_pipeline.predict_proba(X_test)[:, 1] # Probability of class 1 (high_success)

    print("Test Set Accuracy:", accuracy_score(y_test, y_pred_test))
    print("\nTest Set Classification Report:\n", classification_report(y_test, y_pred_test))
    try:
        roc_auc = roc_auc_score(y_test, y_pred_proba_test)
        print("Test Set ROC AUC Score:", roc_auc)
    except ValueError as e:
        print(f"Could not calculate ROC AUC Score: {e}. This might happen if only one class is present in y_true.")


    # Save the trained model pipeline (which includes the preprocessor)
    try:
        joblib.dump(model_pipeline, MODEL_FILE_PATH)
        print(f"\nTrained model pipeline saved to: {MODEL_FILE_PATH}")
    except Exception as e:
        print(f"Error saving model: {e}")
        
    return model_pipeline


def load_model_and_preprocessor():
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
        print(f"Model file not found at {MODEL_FILE_PATH}. Train the model first.")
        return None

# Main execution block
# (Keep all the functions from before: get_db_connection, fetch_training_data, etc.)

def run_training_pipeline():
    """
    Executes the full model training and evaluation pipeline.
    This function can be called from other modules.
    """
    print("\n--- Starting AI Model Training Pipeline ---")
    # 1. Fetch data
    raw_data_df = fetch_training_data()

    if not raw_data_df.empty:
        # 2. Preprocess data
        X_features, y_target, data_preprocessor = preprocess_data(raw_data_df)

        if X_features is not None and not X_features.empty and y_target is not None and not y_target.empty:
            # 3. Train and evaluate model
            trained_model = train_and_evaluate_model(X_features, y_target, data_preprocessor)
            
            if trained_model:
                print("\n--- Model Training Pipeline Completed Successfully ---")
                return True
            else:
                print("\n--- Model Training Failed ---")
                return False
        else:
            print("Data preprocessing failed or returned no data. Model training aborted.")
            return False
    else:
        print("No data fetched. Model training aborted.")
        return False


# Main execution block
if __name__ == '__main__':
    # Running this script directly will now execute the training pipeline
    run_training_pipeline()