import sys
# We need to add the 'core' directory to the python path
# This allows us to import modules from the 'core' subfolder
sys.path.append('core')

# Now we can import our functions
from core.job_assigner import assign_job_to_engineer
from core.job_completion_simulator import complete_job_and_record_outcome
from core.engineer_analyzer import calculate_and_update_engineer_scores
from core.predictive_model import run_training_pipeline
from core.reports import display_system_status, show_pending_jobs, show_assigned_jobs

def print_menu():
    print("\n" + "="*20 + " Main Menu " + "="*20)
    print("[1] Assign a Pending Job")
    print("[2] Complete an Assigned Job")
    print("[3] Update All Engineer Performance Scores")
    print("[4] Retrain the AI Model on New Data")
    print("[5] View System Status")
    print("[6] Exit")
    print("="*51)

def main():
    while True:
        print_menu()
        choice = input("Enter your choice: ")

        if choice == '1':
            # Assign a Pending Job
            if show_pending_jobs():
                try:
                    job_id = int(input("Enter the Job ID to assign: "))
                    assign_job_to_engineer(job_id)
                except ValueError:
                    print("Invalid input. Please enter a number for the Job ID.")
            
        elif choice == '2':
            # Complete an Assigned Job
            if show_assigned_jobs():
                try:
                    job_id = int(input("Enter the Job ID to complete: "))
                    score = int(input(f"Enter outcome score (1-5) for job {job_id}: "))
                    if not 1 <= score <= 5: raise ValueError("Score must be 1-5.")
                    time = int(input(f"Enter actual time taken (minutes) for job {job_id}: "))
                    if time < 0: raise ValueError("Time cannot be negative.")
                    
                    complete_job_and_record_outcome(job_id, score, time)
                except ValueError as e:
                    print(f"Invalid input: {e}")

        elif choice == '3':
            # Update Engineer Scores
            print("\nRecalculating and updating engineer overall scores...")
            calculate_and_update_engineer_scores()
            print("Scores updated successfully.")

        elif choice == '4':
            # Retrain the AI Model
            confirm = input("Retraining can take a moment. Are you sure? (y/n): ").lower()
            if confirm == 'y':
                run_training_pipeline()
            else:
                print("Retraining cancelled.")

        elif choice == '5':
            # View System Status
            display_system_status()

        elif choice == '6':
            # Exit
            print("Exiting the application. Goodbye!")
            break

        else:
            print("Invalid choice. Please enter a number between 1 and 6.")

        input("\nPress Enter to continue...")

if __name__ == '__main__':
    main()