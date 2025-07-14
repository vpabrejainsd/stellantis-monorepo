# import pandas as pd
# import numpy as np
# import sqlite3
# from sklearn.metrics.pairwise import cosine_similarity


# job_data_path = "data/generated_flat_job_history.xlsx"
# df_jobs = pd.read_excel(job_data_path)

# # --- Feature engineering ---
# df_jobs['Job_Duration_Deviation'] = df_jobs['Time_Taken_minutes'] - df_jobs['Estimated_Standard_Time']
# df_jobs['Engineer_Efficiency'] = df_jobs['Outcome_Score'] / df_jobs['Time_Taken_minutes']

# urgency_map = {'Low': 1, 'Normal': 2, 'High': 3}
# df_jobs['Urgency_Level'] = df_jobs['Urgency'].map(urgency_map)
# df_jobs['Time_Pressure_Score'] = df_jobs['Urgency_Level'] * df_jobs['Job_Duration_Deviation']


# engineer_task_features = df_jobs.groupby(['Engineer_Id', 'Task_Id']).agg({
#     'Outcome_Score': 'mean',
#     'Engineer_Efficiency': 'mean',
#     'Time_Pressure_Score': 'mean',
#     'Urgency_Level': 'mean'
# }).reset_index()

# feature_cols = ['Outcome_Score', 'Engineer_Efficiency', 'Time_Pressure_Score', 'Urgency_Level']
# engineer_task_matrix = engineer_task_features.set_index(['Task_Id', 'Engineer_Id'])[feature_cols]
# task_profiles = engineer_task_matrix.groupby('Task_Id').mean()

# DB_PATH = "database/workshop.db"
# def get_available_engineers_from_db():
#     """Fetch available engineer IDs from the database."""
#     conn = sqlite3.connect(DB_PATH)
#     cursor = conn.execute("SELECT Engineer_Id FROM engineer_profiles WHERE Availability = 'Yes'")
#     available_engs = {row[0] for row in cursor.fetchall()}
#     conn.close()
#     return available_engs

# def get_top_similar_tasks(task_id, top_k=3):
#     """Return top-k most similar task IDs to the given task ID."""
#     if task_id not in task_profiles.index:
#         return [], []

#     task_vector = task_profiles.loc[task_id].values.reshape(1, -1)
#     similarities = cosine_similarity(task_vector, task_profiles)[0]

#     similar_task_df = pd.DataFrame({
#         'task_id': task_profiles.index,
#         'similarity': similarities
#     })

#     similar_task_df = similar_task_df[similar_task_df['task_id'] != task_id]
#     similar_task_df = similar_task_df.sort_values(by='similarity', ascending=False).head(top_k)

#     return similar_task_df['task_id'].tolist(), similar_task_df['similarity'].round(2).tolist()

# def recommend_engineers_memory_cf(task_id, top_n=5):

#     if task_id not in task_profiles.index:
#         print(f"Task '{task_id}' not found in profiles.")
#         return f"Task '{task_id}' not found in profiles."

#     task_vector = task_profiles.loc[task_id].values.reshape(1, -1)

#     try:
#         engineers_for_task = engineer_task_matrix.loc[task_id]
#     except KeyError:
#         print(f"No engineers found for task '{task_id}'.")
#         return f"No engineers found for task '{task_id}'."

#     engineer_vectors = engineers_for_task.values
#     engineer_ids = engineers_for_task.index.tolist()

#     similarities = cosine_similarity(engineer_vectors, task_vector).flatten()
#     top_indices = np.argsort(similarities)[::-1]


#     full_recommendations = [(engineer_ids[i], round(similarities[i], 4)) for i in top_indices[:top_n]]


#     available_engineers = get_available_engineers_from_db()


#     filtered_recommendations = [
#         (eng_id, sim_score) for eng_id, sim_score in full_recommendations
#         if eng_id in available_engineers
#     ]

#     similar_tasks, similar_scores = get_top_similar_tasks(task_id, top_k=3)

#     if filtered_recommendations:
#         eng_list = ', '.join([str(eng) for eng, _ in filtered_recommendations])
#         task_list = ', '.join(similar_tasks)
#         score_list = ', '.join(map(str, similar_scores))
#         reason = (
#             f"Engineers {eng_list} are recommended because they performed well on tasks similar to {task_id} "
#             f"— such as {task_list} — with similarity scores of {score_list}."
#         )
#         print(filtered_recommendations)
#         return filtered_recommendations, reason
#     else:
#         return [], f"No available engineers found for task {task_id}."
import pandas as pd
import numpy as np
import sqlite3

# Load historical job data and build task-performance profiles
data_path = "data/generated_flat_job_history.xlsx"
df_jobs = pd.read_excel(data_path)
DB_PATH = "database/workshop.db"

# Compute per-job features
df_jobs['Job_Duration_Deviation'] = df_jobs['Time_Taken_minutes']-df_jobs['Estimated_Standard_Time']
df_jobs['Engineer_Efficiency'] = df_jobs['Outcome_Score']/df_jobs['Time_Taken_minutes']
urgency_map = {'Low':1, 'Normal':2, 'High':3}
df_jobs['Urgency_Level'] = df_jobs['Urgency'].map(urgency_map)
df_jobs['Time_Pressure_Score'] = df_jobs['Urgency_Level']*df_jobs['Job_Duration_Deviation']

# Aggregate by (Task_Id, Engineer_Id)
engineer_task_features = (
    df_jobs.groupby(['Task_Id','Engineer_ID'])
           .agg({
               'Outcome_Score':'mean',
               'Engineer_Efficiency':'mean',
               'Time_Pressure_Score':'mean',
               'Urgency_Level':'mean'
           })
           .reset_index()
)
feature_cols = ['Outcome_Score','Engineer_Efficiency','Time_Pressure_Score','Urgency_Level']
engineer_task_matrix = (
    engineer_task_features
      .set_index(['Task_Id','Engineer_ID'])[feature_cols]
)
task_profiles = engineer_task_matrix.groupby('Task_Id').mean()

# Database path and helper to fetch availability\ nDB_PATH = "database/workshop.db"
def get_available_engineers_from_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT Engineer_ID FROM engineer_profiles WHERE Availability='Yes'"
    )
    available = {r[0] for r in cursor.fetchall()}
    conn.close()
    return available


def recommend_engineers_memory_cf(task_id, top_n=5):
    """
    Recommend top-n engineers for a task using learned weights:
      w_exp·z(E) + w_cust·z(R) + w_perf·z(P) - w_time·z(T) + w_spec·δ
    Returns (list of (Engineer_Id, Score), reason) or ([], error).
    """
    # 1) Ensure the task exists
    if task_id not in task_profiles.index:
        return [], f"Task '{task_id}' not found in profiles."

    # 2) Extract each engineer's mean Outcome_Score for this task
    try:
        perf_series = engineer_task_matrix.loc[task_id,'Outcome_Score']
    except KeyError:
        return [], f"No engineers found for task '{task_id}'."
    perf_series = perf_series.rename('P')

    # 3) Filter to only available engineers
    available = get_available_engineers_from_db()
    perf_series = perf_series[perf_series.index.isin(available)]
    if perf_series.empty:
        return [], f"No available engineers found for task {task_id}."

    # 4) Load static features for these engineers
    placeholders = ",".join("?" for _ in perf_series)
    sql = f"SELECT Engineer_ID, Years_of_Experience, Customer_Rating, Avg_Job_Completion_Time, Specialization FROM engineer_profiles WHERE Engineer_ID IN ({placeholders})"
    conn = sqlite3.connect(DB_PATH)
    df_static = pd.read_sql(sql, conn, params=list(perf_series.index))
    conn.close()
    df_static = df_static.set_index('Engineer_ID').loc[perf_series.index]

    # 5) Compute z-scores
    df_static['z_E'] = (df_static['Years_of_Experience']-df_static['Years_of_Experience'].mean())/df_static['Years_of_Experience'].std(ddof=0)
    df_static['z_R'] = (df_static['Customer_Rating'] - df_static['Customer_Rating'].mean())/df_static['Customer_Rating'].std(ddof=0)
    df_static['z_T'] = (df_static['Avg_Job_Completion_Time'] - df_static['Avg_Job_Completion_Time'].mean())/df_static['Avg_Job_Completion_Time'].std(ddof=0)
    zP = (perf_series - perf_series.mean())/perf_series.std(ddof=0)
    df_static['z_P'] = zP
    df_static['delta'] = (df_static['Specialization'].str.strip().str.lower() == task_id.strip().lower()).astype(int)

    # 6) Apply learned weights
    w_exp, w_cust, w_perf, w_time, w_spec = 0.0415, 0.0170, 0.9314, 0.0102, 0.0
    raw = (
        w_exp*df_static['z_E']
        + w_cust*df_static['z_R']
        + w_perf*df_static['z_P']
        - w_time*df_static['z_T']
        + w_spec*df_static['delta']
    )

    # 7) Min-max scale to [0,100]
    rmin, rmax = raw.min(), raw.max()
    if rmax>rmin:
        scores = 100*(raw - rmin)/(rmax - rmin)
    else:
        scores = pd.Series(100.0,index=raw.index)
    sig = 1 / (1 + np.exp(-raw))
    df_static['Score'] = (sig * 100).round(2)
    #df_static['Score'] = scores.round(2)

    top_df = df_static['Score'].nlargest(2).reset_index()
    if len(top_df) < 2:
        top_df = df_static['Score'].nlargest(1).reset_index()
    top = top_df.loc[0]
    recommendations = (top['Engineer_ID'], top['Score'])  # Return tuple

    # 9) Build reason
    eng_list = ', '.join(top.index)
    score_list = ', '.join(map(str, top.tolist()))
    reason = f"Engineers {eng_list} recommended for task {task_id} with scores {score_list}."

    return recommendations, reason