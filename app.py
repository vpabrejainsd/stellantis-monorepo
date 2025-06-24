from flask import Flask, request, jsonify
from job_manager import (
    get_connection,
    check_availability,
    update_job_assignment,
    mark_engineer_unavailable,
    get_task_id_for_job,
)
from recommender import recommend_engineers_memory_cf

app = Flask(__name__)

@app.route('/jobs/assign', methods=['POST'])
def assign_engineer_to_job():
    data = request.get_json()
    job_card_id = data.get('job_card_id')

    if not job_card_id:
        return jsonify({"error": "Missing job_card_id"}), 400

    task_id = get_task_id_for_job(job_card_id)
    if not task_id:
        return jsonify({"error": "Job_Card_ID not found"}), 404

    recommendations, reason = recommend_engineers_memory_cf(task_id, top_n=5)
    if isinstance(recommendations, str):
        return jsonify({"error": recommendations}), 400

    assigned_engineer = None
    for eng_id, score in recommendations:
        if check_availability(eng_id):
            assigned_engineer = eng_id
            break

    if not assigned_engineer:
        return jsonify({"error": "No available engineer found"}), 409

    update_job_assignment(job_card_id, assigned_engineer)
    mark_engineer_unavailable(assigned_engineer)

    return jsonify({
        "message": f"Engineer {assigned_engineer} assigned to job {job_card_id}",
        "recommendation_reason": reason
    }), 200


if __name__ == "__main__":
    app.run(debug=True)
