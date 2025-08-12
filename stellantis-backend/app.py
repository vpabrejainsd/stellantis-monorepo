from datetime import datetime
import sqlite3
import math

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import pandas as pd

import os
from svix.webhooks import Webhook, WebhookVerificationError

# Core business logic imports
from utils.helpers import safe_float, sanitize_jobs
from core.dynamic_estimator import get_dynamic_job_estimate, get_dynamic_task_estimate
from core.gemini_mapping import get_matching_services
from core.job_card_creator import create_job_from_ui_input
from recommender import recommend_engineers_memory_cf
from job_manager import (
    get_connection, 
    get_task_ids_for_job, 
    save_dynamic_estimated_time, 
    update_task_assignment,
    fetch_all_jobs,
    fetch_unassigned_jobs,
    fetch_available_engineers,
    mark_engineer_unavailable,
    mark_engineer_available,
)

# Flask app initialization
app = Flask(__name__)
CORS(app)

# Configuration
DB_PATH = "database/workshop.db"

# =============================================================================
# USER MANAGEMENT ROUTES
# =============================================================================

@app.route('/api/v1/webhooks/clerk', methods=['POST'])
def clerk_webhook():
    try:
        # Get the webhook payload and headers
        payload = request.get_data()
        headers = request.headers
        
        # Verify the webhook signature
        webhook_secret = os.environ.get('CLERK_WEBHOOK_SIGNING_SECRET')
        wh = Webhook(webhook_secret)
        
        # Verify and parse the webhook
        evt = wh.verify(payload, headers)
        
        # Handle different event types
        event_type = evt['type']
        
        if event_type == 'user.created':
            user_data = evt['data']
            user_id = user_data['id']
            
            # Extract user information
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            email = user_data['email_addresses'][0]['email_address'] if user_data['email_addresses'] else ''
            
            # Create user in your database
            create_user_in_db(user_id, first_name, last_name, email)
            
            print(f"User {user_id} created successfully in database")
        
        return jsonify({'status': 'success'}), 200
        
    except WebhookVerificationError:
        return jsonify({'error': 'Invalid webhook signature'}), 400
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
def create_user_in_db(clerk_user_id, first_name, last_name, email):
    # Use absolute path for SQLite database
    db_path = DB_PATH
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        SELECT Engineer_ID FROM engineer_profiles 
        WHERE Engineer_Name = ? OR Engineer_ID = ?
    ''', (f"{first_name} {last_name}", email))

        engineer_match = cursor.fetchone()
        engineer_id = engineer_match[0] if engineer_match else None
        
        cursor.execute('''
        INSERT INTO users (clerk_user_id, first_name, last_name, email, created_at, engineer_id, manager_id)
        VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
    ''', (clerk_user_id, first_name, last_name, email, engineer_id, 2))
        
        conn.commit()
        print(f"User {clerk_user_id} added to database")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        conn.close()

@app.route('/api/v1/users/<string:user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE clerk_user_id = ?', (user_id,))
            user = cursor.fetchone()
            if user:
                return jsonify(dict(user)), 200
            else:
                print("not found")
                return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        print(f"Error fetching user profile {user_id}: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

# =============================================================================
# ENGINEER MANAGEMENT ROUTES
# =============================================================================

@app.route('/api/v1/engineers', methods=['GET'])
def get_all_engineers():
    """Fetches all engineer profiles from the database and returns them as JSON."""
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM engineer_profiles')
            rows = cursor.fetchall()
            engineers = [dict(row) for row in rows]
            
        return jsonify(engineers), 200
    except Exception as e:
        print(f"Error fetching engineers: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/api/v1/engineers/<string:engineer_id>', methods=['GET'])
def get_engineer_profile(engineer_id):
    """Fetches the profile data for a single engineer."""
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM engineer_profiles WHERE Engineer_ID = ?', (engineer_id,))
            engineer = cursor.fetchone()
            
            if engineer:
                return jsonify(dict(engineer)), 200
            else:
                return jsonify({'error': 'Engineer not found'}), 404
    except Exception as e:
        print(f"Error fetching engineer profile {engineer_id}: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/api/v1/engineers/<string:engineer_id>/details', methods=['GET'])
def get_engineer_details(engineer_id):
    """
    Fetches all details for a specific engineer, including their full profile
    and a complete list of all their tasks (ongoing and historical).
    """
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Check if engineer exists
            cursor.execute('SELECT 1 FROM engineer_profiles WHERE Engineer_ID = ?', (engineer_id,))
            if not cursor.fetchone():
                return jsonify({'error': 'Engineer not found'}), 404

            # Unified query for all tasks (active and historical)
            sql = """
                WITH all_tasks AS (
                    -- Active jobs from job_card
                    SELECT 
                        Job_Id, Task_Id, Task_Description, Status, Estimated_Standard_Time, 
                        Time_Started, 'ongoing' as source, NULL as Outcome_Score, 
                        NULL as Time_Taken_minutes, Engineer_Id, VIN, Make, Model
                    FROM job_card
                    WHERE Engineer_Id = ?
                    
                    UNION ALL
                    
                    -- Completed jobs from job_history
                    SELECT 
                        Job_ID AS Job_Id, Task_Id, Task_Description, Status, Estimated_Standard_Time, 
                        Time_Started, 'history' as source, Outcome_Score, Time_Taken_minutes,
                        Engineer_Id, VIN, Make, Model
                    FROM job_history
                    WHERE Engineer_Id = ?
                )
                SELECT t.*, p.*
                FROM all_tasks t
                LEFT JOIN engineer_profiles p ON t.Engineer_Id = p.Engineer_ID;
            """
            
            cursor.execute(sql, (engineer_id, engineer_id))
            enriched_tasks = [dict(row) for row in cursor.fetchall()]
            
        return jsonify(enriched_tasks), 200
        
    except sqlite3.Error as e:
        print(f"Database error for engineer {engineer_id}: {e}")
        return jsonify({'error': 'A database error occurred'}), 500
    except Exception as e:
        print(f"Error fetching details for engineer {engineer_id}: {e}")
        return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/api/v1/engineer-dashboard/<string:engineer_id>', methods=['GET'])
def get_engineer_dashboard(engineer_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Get engineer profile
        cursor.execute('''
            SELECT * FROM engineer_profiles WHERE Engineer_ID = ?
        ''', (engineer_id,))
        engineer_profile = cursor.fetchone()
        
        # Get engineer's active tasks
        cursor.execute('''
            SELECT * FROM job_card WHERE Engineer_Id = ? AND Status != 'Completed'
            ORDER BY Date_Created DESC
        ''', (engineer_id,))
        active_tasks = cursor.fetchall()
        
        # Get engineer's completed tasks (last 30 days)
        cursor.execute('''
            SELECT * FROM job_history 
            WHERE Engineer_Id = ? 
            AND Date_Completed >= datetime('now', '-30 days')
            ORDER BY Date_Completed DESC
        ''', (engineer_id,))
        completed_tasks = cursor.fetchall()
        
        # Get today's completed tasks
        cursor.execute('''
            SELECT * FROM job_history 
            WHERE Engineer_Id = ? 
            AND date(Date_Completed) = date('now')
        ''', (engineer_id,))
        todays_completed = cursor.fetchall()
        
        # Get engineer's performance data (last 7 days)
        cursor.execute('''
            SELECT Date_Completed, COUNT(*) as completed_count,
                   AVG(Time_Taken_minutes) as avg_time,
                   AVG(Outcome_Score) as avg_score
            FROM job_history 
            WHERE Engineer_Id = ? 
            AND Date_Completed >= datetime('now', '-7 days')
            GROUP BY date(Date_Completed)
            ORDER BY Date_Completed
        ''', (engineer_id,))
        performance_data = cursor.fetchall()
        
        # Format the response
        response = {
            'engineer_profile': {
                'engineer_id': engineer_profile[0] if engineer_profile else engineer_id,
                'name': engineer_profile[1] if engineer_profile else 'Unknown',
                'availability': engineer_profile[2] if engineer_profile else 'Available',
                'experience': engineer_profile[3] if engineer_profile else 0,
                'specialization': engineer_profile[4] if engineer_profile else 'General',
                'customer_rating': engineer_profile[7] if engineer_profile else 0,
                'avg_completion_time': engineer_profile[6] if engineer_profile else 0,
                'overall_performance_score': engineer_profile[-1] if engineer_profile else 0
            },
            'active_tasks': [
                {
                    'job_id': task[0],
                    'job_name': task[1],
                    'task_id': task[2],
                    'task_description': task[3],
                    'status': task[4],
                    'date_created': task[5],
                    'urgency': task[6],
                    'vin': task[7],
                    'make': task[8],
                    'model': task[9],
                    'estimated_time': task[15],
                    'suitability_score': task[16]
                } for task in active_tasks
            ],
            'completed_tasks': [
                {
                    'job_id': task[0],
                    'task_description': task[3],
                    'date_completed': task[5],
                    'time_taken': task[16],
                    'outcome_score': task[17],
                    'estimated_time': task[15]
                } for task in completed_tasks
            ],
            'todays_stats': {
                'completed_count': len(todays_completed),
                'avg_outcome_score': sum(task[17] for task in todays_completed if task[17]) / len(todays_completed) if todays_completed else 0,
                'total_time_spent': sum(task[16] for task in todays_completed if task[16]) if todays_completed else 0
            },
            'performance_trend': [
                {
                    'date': perf[0],
                    'completed': perf[1],
                    'avg_time': perf[2],
                    'avg_score': perf[3]
                } for perf in performance_data
            ]
        }
        
        return jsonify(response), 200
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

# =============================================================================
# JOB MANAGEMENT ROUTES
# =============================================================================

@app.route("/api/v1/jobs", methods=["GET"])
def get_jobs():
    """Get all jobs with dynamic estimates."""
    try:
        jobs_df = fetch_all_jobs()
        jobs_df["Suitability_Score"] = jobs_df["Suitability_Score"].fillna(0)
        jobs = jobs_df.to_dict(orient="records")
        jobs = sanitize_jobs(jobs)
        
        # Add dynamic estimates to each job
        for job in jobs:
            job_id = job.get("Job_Id")
            result_success, result = get_dynamic_job_estimate(job_id)
            if result_success:
                estimate = result.get("Total_Estimate_Minutes")
                if estimate is None or not isinstance(estimate, (int, float)):
                    job["Dynamic_Estimate"] = 0
                else:
                    job["Dynamic_Estimate"] = max(0, estimate)
                job["Estimate_Details"] = result
            else:
                job["Dynamic_Estimate"] = 0
        
        jobs = sanitize_jobs(jobs)
        return jsonify(jobs), 200
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return jsonify({'error': 'Failed to fetch jobs'}), 500
@app.route("/api/v1/jobs/<string:job_id>", methods=["GET"])
def get_job_by_id(job_id):
    """Get a specific job from both active and history tables."""
    try:
        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # First check active jobs
            cursor.execute("SELECT * FROM job_card WHERE Job_Id = ?", (job_id,))
            active_tasks = cursor.fetchall()
            
            # Then check job history
            cursor.execute("SELECT * FROM job_history WHERE Job_ID = ?", (job_id,))
            history_tasks = cursor.fetchall()
            
            if not active_tasks and not history_tasks:
                return jsonify({'error': 'Job not found'}), 404
            
            # Combine results
            all_tasks = []
            job_data = None
            
            # Process active tasks
            for task in active_tasks:
                task_dict = dict(task)
                task_dict['source'] = 'active'
                all_tasks.append(task_dict)
                if not job_data:
                    job_data = {
                        'Job_Id': task_dict['Job_Id'],
                        'Job_Name': task_dict['Job_Name'],
                        'VIN': task_dict['VIN'],
                        'Make': task_dict['Make'],
                        'Model': task_dict['Model'],
                        'Mileage': task_dict.get('Mileage'),
                        'Urgency': task_dict['Urgency'],
                        'Date_Created': task_dict['Date_Created'],
                        'status': 'active'
                    }
            
            # Process history tasks
            for task in history_tasks:
                task_dict = dict(task)
                task_dict['source'] = 'history'
                # Normalize column names for consistency
                task_dict['Job_Id'] = task_dict.pop('Job_ID', task_dict.get('Job_Id'))
                all_tasks.append(task_dict)
                if not job_data:
                    job_data = {
                        'Job_Id': task_dict['Job_Id'],
                        'Job_Name': task_dict['Job_Name'],
                        'VIN': task_dict['VIN'],
                        'Make': task_dict['Make'],
                        'Model': task_dict['Model'],
                        'Mileage': task_dict.get('Mileage'),
                        'Urgency': task_dict['Urgency'],
                        'Date_Created': task_dict.get('Time_Started'),
                        'status': 'completed'
                    }
            
            job_data['tasks'] = all_tasks
            job_data['total_tasks'] = len(all_tasks)
            job_data['active_tasks'] = len(active_tasks)
            job_data['completed_tasks'] = len(history_tasks)
            
            return jsonify(job_data), 200
            
    except Exception as e:
        print(f"Error fetching job {job_id}: {e}")
        return jsonify({'error': 'Failed to fetch job'}), 500

@app.route("/api/v1/jobs/<string:job_id>", methods=["PUT"])
def update_job(job_id):
    """Update job information in both active jobs and job history."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Fields that can be updated
        updatable_fields = {
            'Make': data.get('make'),
            'Model': data.get('model'), 
            'VIN': data.get('vin'),
            'Urgency': data.get('urgency')
        }
        
        # Filter out None values
        fields_to_update = {k: v for k, v in updatable_fields.items() if v is not None}
        
        if not fields_to_update:
            return jsonify({'error': 'No valid fields provided to update'}), 400
            
        # Validation
        if 'vin' in data:
            vin = data['vin'].strip().upper()
            if len(vin) != 17:
                return jsonify({'error': 'VIN must be exactly 17 characters'}), 400
            fields_to_update['VIN'] = vin
            
        if 'urgency' in data and data['urgency'] not in ['Low', 'Normal', 'High']:
            return jsonify({'error': 'Invalid urgency level'}), 400
            
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Check both tables to find where the job exists
            cursor.execute("SELECT COUNT(*) FROM job_card WHERE Job_Id = ?", (job_id,))
            active_job_exists = cursor.fetchone()[0] > 0
            
            cursor.execute("SELECT COUNT(*) FROM job_history WHERE Job_ID = ?", (job_id,))
            history_job_exists = cursor.fetchone()[0] > 0
            
            if not active_job_exists and not history_job_exists:
                return jsonify({'error': 'Job not found in active jobs or history'}), 404
            
            updated_tables = []
            
            # Update active jobs if they exist
            if active_job_exists:
                set_clause = ", ".join([f"{field} = ?" for field in fields_to_update.keys()])
                values = list(fields_to_update.values()) + [job_id]
                
                update_query = f"UPDATE job_card SET {set_clause} WHERE Job_Id = ?"
                cursor.execute(update_query, values)
                if cursor.rowcount > 0:
                    updated_tables.append('active_jobs')
            
            # Update job history if they exist
            if history_job_exists:
                set_clause = ", ".join([f"{field} = ?" for field in fields_to_update.keys()])
                values = list(fields_to_update.values()) + [job_id]
                
                update_query = f"UPDATE job_history SET {set_clause} WHERE Job_ID = ?"
                cursor.execute(update_query, values)
                if cursor.rowcount > 0:
                    updated_tables.append('job_history')
            
            conn.commit()
            
            return jsonify({
                'message': f'Job {job_id} updated successfully',
                'updated_fields': list(fields_to_update.keys()),
                'updated_tables': updated_tables,
                'job_id': job_id
            }), 200
            
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"Error updating job {job_id}: {e}")
        return jsonify({'error': 'Failed to update job'}), 500

@app.route("/api/v1/jobs/<string:job_id>", methods=["DELETE"])
def delete_job(job_id):
    """Delete a job from both active jobs and history."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Check and get engineers from active jobs
            cursor.execute("""
                SELECT DISTINCT Engineer_Id FROM job_card 
                WHERE Job_Id = ? AND Engineer_Id IS NOT NULL
            """, (job_id,))
            engineers_to_free = [row[0] for row in cursor.fetchall()]
            
            # Delete from active jobs
            cursor.execute("DELETE FROM job_card WHERE Job_Id = ?", (job_id,))
            deleted_active = cursor.rowcount
            
            # Delete from job history
            cursor.execute("DELETE FROM job_history WHERE Job_ID = ?", (job_id,))
            deleted_history = cursor.rowcount
            
            if deleted_active == 0 and deleted_history == 0:
                return jsonify({'error': 'Job not found'}), 404
            
            # Free up engineers who were assigned to active tasks
            for engineer_id in engineers_to_free:
                mark_engineer_available(conn, engineer_id)
            
            conn.commit()
            
            return jsonify({
                'message': f'Job {job_id} deleted successfully',
                'deleted_active_tasks': deleted_active,
                'deleted_history_tasks': deleted_history,
                'freed_engineers': len(engineers_to_free)
            }), 200
            
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"Error deleting job {job_id}: {e}")
        return jsonify({'error': 'Failed to delete job'}), 500

@app.route("/api/v1/jobs/unassigned", methods=["GET"])
def get_unassigned_jobs():
    """Get all unassigned jobs."""
    try:
        jobs_df = fetch_unassigned_jobs()
        jobs = jobs_df.to_dict(orient="records")
        return jsonify(jobs), 200
    except Exception as e:
        print(f"Error fetching unassigned jobs: {e}")
        return jsonify({'error': 'Failed to fetch unassigned jobs'}), 500

@app.route("/api/v1/create-job", methods=["POST"])
def create_job_endpoint():
    """Create a new job from UI input."""
    try:
        data = request.get_json()

        # Extract required fields
        job_name = data.get('jobName')
        vin = data.get('vin')
        make = data.get('make')
        model = data.get('model')
        mileage = data.get('mileage')
        urgency = data.get('urgency')
        selected_tasks = data.get('selectedTasks')

        # Validation
        if not all([job_name, vin, make, model, mileage, urgency]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Create job
        success, message, generated_job_id = create_job_from_ui_input(
            job_name=job_name, vin=vin, make=make, model=model, 
            mileage=mileage, urgency=urgency, selected_tasks=selected_tasks
        )

        if success:
            return jsonify({'message': message, 'job_id': generated_job_id}), 201
        else:
            return jsonify({'error': message}), 500
    except Exception as e:
        print(f"Error creating job: {e}")
        return jsonify({'error': 'Failed to create job'}), 500

@app.route("/api/v1/job-history", methods=["GET"])
def get_job_history():
    """Get all completed job history."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM job_history")
            rows = cursor.fetchall()
            
            job_history = [
                {
                    "job_id": row[0], "job_name": row[1], "task_id": row[2],
                    "task_description": row[3], "status": row[4], "date_completed": row[5],
                    "urgency": row[6], "VIN": row[7], "make": row[8], "model": row[9],
                    "mileage": row[10], "assigned_engineer_id": row[11], "engineer_name": row[12],
                    "engineer_level": row[13], "time_started": row[14], "time_ended": row[15],
                    "time_taken": row[16], "estimated_standard_time": row[17], "outcome_score": row[18],
                    "dynamic_estimated_time": row[19], "suitability_score": row[20]
                }
                for row in rows
            ]
            
            jobs = sanitize_jobs(job_history)
            return jsonify(jobs), 200

    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route("/api/v1/jobs/<string:job_id>/start-all-tasks", methods=["POST"])
def start_all_tasks(job_id):
    """Start all eligible tasks for a specific job."""
    try:
        data = request.get_json()
        time_started = data.get('time_started')
        
        # Validation
        if not time_started:
            return jsonify({'error': 'time_started is required'}), 400
            
        try:
            parsed_time = datetime.strptime(time_started, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use YYYY-MM-DD HH:MM:SS'}), 400
        
        with get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if job exists
            cursor.execute("SELECT COUNT(*) FROM job_card WHERE Job_Id = ?", (job_id,))
            if cursor.fetchone()[0] == 0:
                return jsonify({'error': 'Job not found'}), 404
            
            # Only update tasks that can be started (not already completed or in progress)
            cursor.execute("""
                UPDATE job_card 
                SET Status = 'In Progress', Time_Started = ?
                WHERE Job_Id = ? AND Status = 'Assigned'
            """, (parsed_time, job_id))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'No eligible tasks to start. All tasks may already be in progress or completed.'}), 400
            
            conn.commit()
            
            return jsonify({
                "message": f"Started {cursor.rowcount} tasks successfully",
                "job_id": job_id,
                "tasks_started": cursor.rowcount
            }), 200
            
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


# =============================================================================
# TASK MANAGEMENT ROUTES
# =============================================================================

@app.route("/api/v1/task/assign-engineer", methods=["POST"])
def assign_engineer_to_task():
    """Assign an engineer to a specific task."""
    try:
        data = request.get_json()
        job_card_id = data.get("job_card_id")
        task_id = data.get("task_id")

        if not job_card_id or not task_id:
            return jsonify({"message": "Missing job_card_id or task_id"}), 400

        # Get recommendations for the task
        recommendations, reason = recommend_engineers_memory_cf(task_id, top_n=5)
        
        if isinstance(recommendations, str):
            return jsonify({"message": f"Recommendation system error: {recommendations}"}), 500

        if recommendations is None or recommendations == ():
            return jsonify({"message": f"No engineers available for task {task_id}"}), 404

        engineer_assigned, engineer_score = recommendations
        
        if not engineer_assigned or not engineer_score:
            return jsonify({"message": "No available engineer found in recommendations"}), 404

        # Update the task assignment
        update_task_assignment(task_id, job_card_id, engineer_assigned, engineer_score)
        
        # Mark the engineer as unavailable
        mark_engineer_unavailable(engineer_assigned)

        # Get dynamic estimated time for the task
        _, dynamic_estimated_time = get_dynamic_task_estimate(task_id, engineer_assigned)
        save_dynamic_estimated_time(task_id, job_card_id, dynamic_estimated_time)
        return jsonify({
            "message": f"Engineer {engineer_assigned} assigned to task {task_id} for job {job_card_id}",
            "engineer_assigned": engineer_assigned,
            "suitability_score": safe_float(engineer_score),
            "dynamic_estimated_time": dynamic_estimated_time,
            "recommendation_reason": reason
        }), 200
    except Exception as e:
        print(f"Error assigning engineer to task {task_id}: {e}")
        return jsonify({'message': 'Failed to assign engineer to task'}), 500

@app.route("/api/v1/jobs/assign-all-tasks", methods=["POST"])
def assign_engineer_to_all_tasks_for_job():
    """Assign engineers to all tasks for a specific job."""
    try:
        data = request.get_json()
        job_card_id = data.get("job_card_id")

        if not job_card_id:
            return jsonify({"error": "Missing job_card_id"}), 400

        # Get all task IDs for this job
        task_ids = get_task_ids_for_job(job_card_id)
        if not task_ids:
            return jsonify({"error": f"No tasks found for Job_Card_ID {job_card_id}"}), 404

        assignment_results = []
        
        # Process each task
        for task_id in task_ids:
            engineer_assigned = None
            engineer_score = None
            dynamic_estimated_time = None
            recommendation_reason = "No recommendation provided"
            status = "Failed: No available engineer"

            try:
                recommendations, reason = recommend_engineers_memory_cf(task_id, top_n=5)
                recommendation_reason = reason
                
                if isinstance(recommendations, str):
                    status = f"Failed: Recommendation system error - {recommendations}"
                else:
                    engineer_assigned, engineer_score = recommendations
                    if engineer_assigned and engineer_score:
                        update_task_assignment(task_id, job_card_id, engineer_assigned, engineer_score)
                        mark_engineer_unavailable(engineer_assigned)
                        status = "Assigned"
                        _, dynamic_estimated_time = get_dynamic_task_estimate(task_id, engineer_assigned)
                        save_dynamic_estimated_time(task_id, job_card_id, dynamic_estimated_time)
                        if engineer_score is None:
                            engineer_score = "N/A"
                    else:
                        status = "Failed: No available engineer found in recommendations"

            except Exception as e:
                status = f"Failed: Unexpected error during assignment - {str(e)}"
                print(f"Error assigning engineer to task {task_id}: {e}")

            assignment_results.append({
                "task_id": task_id,
                "engineer_assigned": engineer_assigned,
                "suitability_score": safe_float(engineer_score),
                "status": status,
                "recommendation_reason": recommendation_reason,
                "dynamic_estimated_time": dynamic_estimated_time
            })

        return jsonify({
            "message": f"Assignment process completed for Job {job_card_id}",
            "assignments": assignment_results
        }), 200
    except Exception as e:
        print(f"Error in task assignment: {e}")
        return jsonify({'error': 'Failed to assign tasks'}), 500

@app.route('/api/v1/jobs/start-task', methods=['POST'])
def start_task():
    """Start a task by updating its status to 'In Progress' and setting the start time."""
    try:
        data = request.get_json()
        job_id = data.get('job_id')
        task_id = data.get('task_id')
        time_started = data.get('time_started')

        if not job_id or not task_id:
            return jsonify({'error': 'Missing job_id or task_id'}), 400

        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Check current task status
            cursor.execute("SELECT Status FROM job_card WHERE Job_Id = ? AND Task_Id = ?", (job_id, task_id))
            task_record = cursor.fetchone()

            if not task_record:
                return jsonify({'error': 'Task not found'}), 404
            
            if task_record['Status'] != 'Assigned':
                return jsonify({'error': f"Task cannot be started. Status is currently '{task_record['Status']}'"}), 409

            # Update task to 'In Progress'
            parsed_time = datetime.strptime(time_started, '%Y-%m-%d %H:%M:%S')
            cursor.execute("""
                UPDATE job_card 
                SET Status = 'In Progress', Time_Started = ?
                WHERE Job_Id = ? AND Task_Id = ?
            """, (parsed_time, job_id, task_id))
            conn.commit()

            return jsonify({'message': f'Task {task_id} started successfully'}), 200

    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Error starting task: {e}")
        return jsonify({'error': 'Failed to start task'}), 500

@app.route('/api/v1/jobs/mark-complete', methods=['POST'])
def mark_task_complete():
    """Move a completed task from the job_card table to the job_history table."""
    try:
        data = request.get_json()
        job_id = data.get('job_id')
        task_id = data.get('task_id')
        outcome_score = data.get('outcome_score')

        if not job_id or not task_id or outcome_score is None:
            return jsonify({'error': 'Missing job_id, task_id, or outcome_score'}), 400

        with get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Fetch the complete record from job_card
            cursor.execute("SELECT * FROM job_card WHERE Job_Id = ? AND Task_Id = ?", (job_id, task_id))
            record = cursor.fetchone()

            if not record:
                return jsonify({'error': 'Task not found in active jobs'}), 404

            if not record['Time_Started']:
                return jsonify({'error': 'Cannot complete a task that has not been started'}), 400

            # Calculate completion time
            time_ended_dt = datetime.now()
            time_started_dt = datetime.strptime(record['Time_Started'], '%Y-%m-%d %H:%M:%S')
            time_taken = int((time_ended_dt - time_started_dt).total_seconds() / 60)

            # Insert into job_history
            cursor.execute("""
                INSERT INTO job_history (
                    Job_ID, Job_Name, Task_Id, Task_Description, Status, Date_Completed, Urgency, VIN, Make, Model, Mileage, 
                    Engineer_Id, Engineer_Name, Engineer_Level, Time_Started, Time_Ended, Time_Taken_Minutes, Estimated_Standard_Time, 
                    Outcome_Score, Suitability_Score, Dynamic_Estimated_Time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record['Job_Id'], record['Job_Name'], record['Task_Id'], record['Task_Description'], 'Completed',
                time_ended_dt.strftime('%Y-%m-%d %H:%M:%S'), record['Urgency'], record['VIN'], record['Make'],
                record['Model'], record['Mileage'], record['Engineer_Id'], record['Engineer_Name'],
                record['Engineer_Level'], record['Time_Started'], time_ended_dt.strftime('%Y-%m-%d %H:%M:%S'),
                time_taken, record['Estimated_Standard_Time'], outcome_score, record['Suitability_Score'], 
                record['Dynamic_Estimated_Time']
            ))

            # Remove from active jobs
            cursor.execute("DELETE FROM job_card WHERE Job_Id = ? AND Task_Id = ?", (job_id, task_id))

            # Make engineer available again
            if record['Engineer_Id']:
                mark_engineer_available(conn, record['Engineer_Id'])

            conn.commit()
            return jsonify({'message': 'Task marked as complete and moved to history'}), 200

    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Error completing task: {e}")
        return jsonify({'error': 'Failed to complete task'}), 500

# =============================================================================
# SERVICE MAPPING ROUTES
# =============================================================================

@app.route('/api/v1/mapping-services', methods=['POST'])
def select_services():
    """Get matching services based on user description using AI mapping."""
    try:
        data = request.get_json()
        user_input = data.get('description')

        if not user_input:
            return jsonify({"error": "Description is required"}), 400
        
        services = get_matching_services(user_input)
        return jsonify({"services": services}), 200
    except Exception as e:
        print(f"Error in service mapping: {e}")
        return jsonify({"error": "Failed to map services"}), 500

# =============================================================================
# ADMIN & UTILITY ROUTES
# =============================================================================

@app.route("/api/v1/reset-database", methods=["GET", "POST"])
def reset_database():
    """
    Reset the database by clearing job_card and job_history tables.
    WARNING: This is a destructive operation!
    """
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM job_card")
            cursor.execute("UPDATE engineer_profiles SET Availability = 'Yes'")
            cursor.execute("""
                DELETE FROM job_history
                WHERE CAST(SUBSTR(Job_ID, 4) AS INTEGER) < 1001
            """)
            conn.commit()
        return jsonify({"message": "Database reset successfully"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# =============================================================================
# APPLICATION ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, threaded=False, port=4001)
