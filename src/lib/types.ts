// src/lib/types.ts

// The shape of data from your /jobs endpoint
export interface CurrentTask {
  Date_Created: string;
  Engineer_Id: string | null;
  Engineer_Level: string | null; // Add this
  Engineer_Name: string | null; // Add this
  Estimated_Standard_Time: number;
  Job_Id: string;
  Job_Name: string;
  Make: string;
  Mileage: number;
  Model: string;
  Status: "Pending" | "Assigned" | "In Progress";
  Task_Description: string;
  Task_Id: string;
  Time_Started: string | null;
  Urgency: string;
  VIN: string;
}

// The shape of data from your /job_history endpoint
export interface HistoryTask {
  VIN: string;
  assigned_engineer_id: string;
  engineer_level: "Master" | "Senior" | "Junior";
  engineer_name: string;
  date_completed: string;
  estimated_standard_time: number;
  job_id: string;
  job_name: string;
  make: string;
  mileage: number;
  model: string;
  outcome_score: number;
  status: "Completed";
  task_description: string;
  task_id: string;
  time_ended: string;
  time_started: string;
  time_taken: number;
  urgency: string;
}

// A unified structure to hold all tasks, regardless of source
export interface UnifiedTask {
  Job_Id: string;
  Task_Id: string;
  Task_Description: string;
  Status: "Pending" | "Assigned" | "In Progress" | "Completed";
  Engineer_Id: string | null;
  Engineer_Name: string | null; // Add this
  Engineer_Level: string | null; // Add this
  Estimated_Standard_Time: number;
  timeTaken: number;
  // ... other common fields
  VIN: string;
  Make: string;
  Model: string;
  Job_Name: string;
  Date_Created: string;
  Urgency: string;
}

export interface Job {
  Job_Id: string;
  VIN: string;
  Make: string;
  Model: string;
  Job_Name: string;
  Date_Created: string;
  Urgency: string;
  tasks: UnifiedTask[];
  completedTasks: number;
  totalTasks: number;
  // --- ADD THIS LINE ---
  derivedCompletionStatus: "Completed" | "In Progress" | "Not Started";
}
