import math

def safe_float(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def sanitize_jobs(jobs):
    """Remove NaN and inf values from job data to ensure JSON serialization."""
    for job in jobs:
        for key, value in job.items():
            # Handle float NaN or inf values
            if isinstance(value, float):
                if math.isnan(value) or math.isinf(value):
                    job[key] = 0  # or choose None / another sentinel
            # For string fields, optionally handle known "NaN" strings
            elif isinstance(value, str) and value.lower() == 'nan':
                job[key] = "null"
    return jobs