# In main.py
import sys
sys.path.append('core')

# --- 1. Import the new function ---
from core.job_card_creator import create_new_job_card
from core.job_assigner import assign_job_to_engineer
from core.job_completion_simulator import complete_job_and_record_outcome
from core.engineer_analyzer import calculate_and_update_engineer_scores
from core.predictive_model import run_training_pipeline
from core.reports import display_system_status, show_pending_jobs, show_assigned_jobs

def print_menu():
    """Prints the main menu to the console."""
    print("\n" + "="*20 + " Main Menu " + "="*20)
    # --- 2. Add the new option to the menu ---
    print("[1] Create New Job Card")
    #print("[2] Assign a Pending Task")
    print("[3] Complete an Assigned Task")
    #print("[4] Update All Engineer Performance Scores")
    #print("[5] Retrain the AI Model on New Data")
    #print("[6] View System Status")
    print("[7] Exit")
    print("="*51)


def main():
    """The main function to run the application."""
    while True:
        print_menu()
        choice = input("Enter your choice: ")

        # --- 3. Add the logic to call the new function ---
        if choice == '1':
            create_new_job_card()
            
        elif choice == '2':
            # This logic now assigns individual tasks, not jobs
            if show_pending_jobs(): # We can rename this to show_pending_tasks
                try:
                    # In a real app, you might get job_card_id here
                    job_id = int(input("Enter the Job Card ID to assign: "))
                    assign_job_to_engineer(job_id)
                except ValueError:
                    print("Invalid input. Please enter a number for the ID.")
        elif choice == '3':
            print("Exiting the application. Goodbye!")
            break

        else:
            print("Invalid choice. Please enter a number between 1 and 7.")

        input("\nPress Enter to continue...")

if __name__ == '__main__':
    main()