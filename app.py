from flask import Flask, jsonify, request
from job_manager import (
    fetch_unassigned_jobs,
    assign_engineers_to_pending_jobs,
    complete_job,
    fetch_available_engineers,
    fetch_all_jobs
)

app = Flask(__name__)

@app.route('/')
def home():
    return "🚀 Backend is running!"

@app.route('/jobs', methods=['GET'])
def get_all_jobs():
    jobs = fetch_all_jobs()
    return jobs.to_json(orient='records')

@app.route('/jobs/unassigned', methods=['GET'])
def get_unassigned_jobs():
    jobs = fetch_unassigned_jobs()
    return jobs.to_json(orient='records')

@app.route('/jobs/assign', methods=['POST'])
def assign_jobs():
    assign_engineers_to_pending_jobs()
    return jsonify({"message": "Engineers assigned to pending jobs."})

@app.route('/engineers/available', methods=['GET'])
def get_available_engineers():
    engs = fetch_available_engineers()
    return engs.to_json(orient='records')

@app.route('/jobs/complete', methods=['POST'])
def complete():
    data = request.json
    job_id = data.get('job_card_id')
    score = data.get('outcome_score')

    if job_id is None or score is None:
        return jsonify({"error": "Missing job_card_id or outcome_score"}), 400

    complete_job(job_id, score)
    return jsonify({"message": f"Job {job_id} marked completed with score {score}."})

if __name__ == '__main__':
    app.run(debug=True)
