# Job Assigner for Vehicle Workshops

This project is a Proof of Concept (POC) for an intelligent job assignment system. It uses historical data and a machine learning model to assign incoming vehicle repair jobs to the most suitable available engineer, aiming to maximize the probability of a high-quality outcome.

---

## Features

* **Data Management:** Ingests car and job data from Excel files into a structured SQLite database.
* **AI-Driven Assignment:** Uses a trained Logistic Regression model to predict the success probability for each engineer-job pairing.
* **Intelligent Matching:** Assigns jobs to the engineer with the highest predicted success score, with logic to distribute tasks among similarly-skilled engineers.
* **Continuous Learning:** Includes a workflow to record job outcomes and retrain the AI model with new data, allowing the system to become smarter over time.
* **Menu-Driven Interface:** A simple command-line interface (`main.py`) to operate the entire system.

---

## Project Structure

```
garage_ai_assigner/
├── core/                 # Core application logic
├── data/                 # Sample input data (Excel/CSV)
├── database/             # SQLite database file is stored here
├── models/               # Saved trained AI model
├── main.py               # Main entry point to run the application
├── requirements.txt      # Project dependencies
└── README.md             # This file
```

---

## Setup and Installation

1.  **Prerequisites:**
    * Python 3.7+

2.  **Clone the Repository (Example):**
    ```bash
    git clone <your-repository-url>
    cd garage_ai_assigner
    ```

3.  **Create a Virtual Environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

---

## Usage

The entire application can be operated through the main control panel.

1.  **Prepare the Data and Database (First-Time Setup):**
    * Generate sample data: `python generate_sample_data.py`
    * Set up the database schema: `python core/db_setup.py`
    * Load the data into the database: `python core/data_loader.py`

2.  **Prepare the AI Model (First-Time Setup):**
    * Calculate initial engineer scores: `python core/engineer_analyzer.py`
    * Train the first version of the AI model: `python core/predictive_model.py`

3.  **Run the Main Application:**
    ```bash
    python main.py
    ```
    This will launch the main menu, where you can:
    * Assign pending jobs.
    * Mark assigned jobs as complete and record their outcomes.
    * Retrain the model with the new outcome data.
    * And more.

---