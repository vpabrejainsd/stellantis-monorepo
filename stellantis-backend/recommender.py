import pandas as pd
import numpy as np
import sqlite3
import re

# Load historical job data and build task-performance profiles
data_path = "data/generated_flat_job_history.xlsx"
df_jobs = pd.read_excel(data_path)
DB_PATH = "database/workshop.db"

# Compute per-job features
df_jobs['Job_Duration_Deviation'] = df_jobs['Time_Taken_minutes'] - df_jobs['Estimated_Standard_Time']
df_jobs['Engineer_Efficiency'] = df_jobs['Outcome_Score'] / df_jobs['Time_Taken_minutes']
urgency_map = {'Low': 1, 'Normal': 2, 'High': 3}
df_jobs['Urgency_Level'] = df_jobs['Urgency'].map(urgency_map)
df_jobs['Time_Pressure_Score'] = df_jobs['Urgency_Level'] * df_jobs['Job_Duration_Deviation']

# Aggregate by (Task_Id, Engineer_Id)
engineer_task_features = (
    df_jobs.groupby(['Task_Id', 'Engineer_ID'])
           .agg({
               'Outcome_Score': 'mean',
               'Engineer_Efficiency': 'mean',
               'Time_Pressure_Score': 'mean',
               'Urgency_Level': 'mean'
           })
           .reset_index()
)
feature_cols = ['Outcome_Score', 'Engineer_Efficiency', 'Time_Pressure_Score', 'Urgency_Level']
engineer_task_matrix = (
    engineer_task_features
      .set_index(['Task_Id', 'Engineer_ID'])[feature_cols]
)
task_profiles = engineer_task_matrix.groupby('Task_Id').mean()

def scale(value, min_val, max_val, invert=False):
    if value is None:
        return 0.0
    if max_val == min_val:
        return 0.0
    v = (value - min_val) / (max_val - min_val)
    return 1.0 - v if invert else v


def calculate_single_engineer_suitability_score(task_id: str, engineer_id: str) -> float:
    """
    Calculates an absolute suitability score for a single engineer-task pair,
    using static features and dynamically selected task-specific score(s) 
    matching regex ending with 'score', enhancing scoring beyond core features.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Fetch engineer profile including all columns ending with 'score' (case-insensitive)
    cursor.execute(f"PRAGMA table_info(engineer_profiles)")
    columns = [row[1] for row in cursor.fetchall()]
    score_columns = [col for col in columns if re.search(r'Score$', col, re.I)]
    # Prepare SELECT statement for core + dynamic score columns
    select_cols = ['Years_of_Experience', 'Customer_Rating', 'Avg_Job_Completion_Time', 'Overall_Performance_Score'] + score_columns
    select_cols_str = ", ".join(select_cols)
    
    cursor.execute(
        f"SELECT {select_cols_str} FROM engineer_profiles WHERE Engineer_ID = ?", (engineer_id,)
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"Engineer {engineer_id} not found.")

    # Map results to column names
    feature_dict = dict(zip(select_cols, row))

    # Fetch average outcome score for this engineer+task from job_history
    cursor.execute("""
        SELECT AVG(Outcome_Score) FROM job_history 
        WHERE Task_Id = ? AND Engineer_Id = ? AND Outcome_Score IS NOT NULL
    """, (task_id, engineer_id))
    avg_outcome = cursor.fetchone()[0]

    conn.close()

    # Domain min/max for base features (customize as needed)
    MIN_EXP, MAX_EXP = 0, 40
    MIN_RATING, MAX_RATING = 1.0, 5.0
    MIN_TIME, MAX_TIME = 10, 120  # lower is better
    MIN_PERF, MAX_PERF = 0, 100
    MIN_OUTCOME, MAX_OUTCOME = 1, 5
    MIN_TASK_SPECIFIC, MAX_TASK_SPECIFIC = 0, 100

    # Scale core features
    scaled_exp = scale(feature_dict.get('Years_of_Experience'), MIN_EXP, MAX_EXP)
    scaled_rating = scale(feature_dict.get('Customer_Rating'), MIN_RATING, MAX_RATING)
    scaled_time = scale(feature_dict.get('Avg_Job_Completion_Time'), MIN_TIME, MAX_TIME, invert=True)
    scaled_perf = scale(feature_dict.get('Overall_Performance_Score'), MIN_PERF, MAX_PERF)
    scaled_outcome = scale(avg_outcome, MIN_OUTCOME, MAX_OUTCOME)

    # Find best-matching task-specific score column based on task_id text (case-insensitive)
    # Heuristic: look for column containing task_id words; if none, take max among all scores
    task_id_lower = task_id.lower()
    matched_scores = []
    for col in score_columns:
        # Simple substring match ignoring underscores/spaces, could refine to regex or fuzzy match
        col_clean = col.replace('_', '').replace(' ', '').lower()
        if any(word in col_clean for word in task_id_lower.split()):
            val = feature_dict.get(col)
            if val is not None:
                matched_scores.append(val)
    if matched_scores:
        task_specific_score = max(matched_scores)
    else:
        # fallback max of all available scores columns
        all_scores = [feature_dict.get(col) for col in score_columns if feature_dict.get(col) is not None]
        task_specific_score = max(all_scores) if all_scores else 0

    scaled_task_specific = scale(task_specific_score, MIN_TASK_SPECIFIC, MAX_TASK_SPECIFIC)

    # Weights for all features (tune as appropriate)
    weights = {
        'exp': 0.15,
        'rating': 0.2,
        'time': 0.1,
        'perf': 0.1,
        'outcome': 0.2,
        'task_specific': 0.3,
    }

    score = (
        weights['exp'] * scaled_exp +
        weights['rating'] * scaled_rating +
        weights['time'] * scaled_time +
        weights['perf'] * scaled_perf +
        weights['outcome'] * scaled_outcome +
        weights['task_specific'] * scaled_task_specific
    )

    final_score = round(score * 100, 2)
    return final_score

# Database path and helper to fetch availability
def get_available_engineers_from_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT Engineer_ID FROM engineer_profiles WHERE Availability='Yes'"
    )
    available = {r[0] for r in cursor.fetchall()}
    conn.close()
    return available

def safe_zscore(series):
    std = series.std(ddof=0)
    if std == 0:
        return pd.Series(0, index=series.index)  # all zeros if no variance
    else:
        return (series - series.mean()) / std

def recommend_engineers_memory_cf(task_id, top_n=5):
    """
    Recommend top-n engineers for a task using learned weights:
      w_exp·z(E) + w_cust·z(R) + w_perf·z(P) - w_time·z(T) + w_spec·δ
    Returns (list of (Engineer_Id, Score), reason) or ([], error).
    """
    if task_id not in task_profiles.index:
        return [], f"Task '{task_id}' not found in profiles."

    try:
        perf_series = engineer_task_matrix.loc[task_id, 'Outcome_Score']
    except KeyError:
        return [], f"No engineers found for task '{task_id}'."
    perf_series = perf_series.rename('P')

    available = get_available_engineers_from_db()
    available_perf_series = perf_series[perf_series.index.isin(available)]

    if len(available_perf_series) == 1:
        # Exactly one engineer is available, score individually
        last_engineer_id = available_perf_series.index[0]
        last_score = calculate_single_engineer_suitability_score(task_id, last_engineer_id)
        reason = f"Fallback: Only one engineer ({last_engineer_id}) available, scored individually."
        return (last_engineer_id, last_score), reason

    if available_perf_series.empty:
        # No available engineers, return failure
        return (), f"No available engineers found for task {task_id}."

    placeholders = ",".join("?" for _ in available_perf_series)
    sql = f"SELECT Engineer_ID, Years_of_Experience, Customer_Rating, Avg_Job_Completion_Time, Specialization FROM engineer_profiles WHERE Engineer_ID IN ({placeholders})"
    conn = sqlite3.connect(DB_PATH)
    df_static = pd.read_sql(sql, conn, params=list(available_perf_series.index))
    conn.close()
    df_static = df_static.set_index('Engineer_ID').loc[available_perf_series.index]

    df_static['z_E'] = safe_zscore(df_static['Years_of_Experience'])
    df_static['z_R'] = safe_zscore(df_static['Customer_Rating'])
    df_static['z_T'] = safe_zscore(df_static['Avg_Job_Completion_Time'])
    zP = safe_zscore(available_perf_series)
    df_static['z_P'] = zP
    df_static['delta'] = (df_static['Specialization'].str.strip().str.lower() == task_id.strip().lower()).astype(int)

    w_exp, w_cust, w_perf, w_time, w_spec = 0.0415, 0.0170, 0.9314, 0.0102, 0.0
    raw = (
        w_exp * df_static['z_E'] +
        w_cust * df_static['z_R'] +
        w_perf * df_static['z_P'] -
        w_time * df_static['z_T'] +
        w_spec * df_static['delta']
    )
    sig = 1 / (1 + np.exp(-raw))
    df_static['Score'] = (sig * 100).round(2)

    top_df = df_static['Score'].nlargest(top_n).reset_index()
    if len(top_df) < top_n:
        top_df = df_static['Score'].nlargest(len(top_df)).reset_index()
    top = top_df.loc[0]
    recommendations = (top['Engineer_ID'], top['Score'])

    eng_list = ', '.join(top_df['Engineer_ID'].tolist())
    score_list = ', '.join(map(str, top_df['Score'].tolist()))
    reason = f"Engineers {eng_list} recommended for task {task_id} with scores {score_list}."

    return recommendations, reason


