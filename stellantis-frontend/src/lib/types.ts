// src/lib/types.ts

export interface EngineerProfile {
  Engineer_ID: string;
  Engineer_Name: string;
  Availability: "Yes" | "No";
  Years_of_Experience: number;
  Specialization: string | null;
  Certifications: string | null;
  Avg_Job_Completion_Time: number;
  Customer_Rating: number;
  Overall_Basic_Service_Score: number;
  Overall_Custom_Service_Score: number;
  Overall_Full_Service_Score: number;
  Overall_Intermediate_Service_Score: number;
  Air_Filter_Check_Score: number;
  Battery_Check_Score: number;
  Brake_Inspection_Score: number;
  Cabin_Filter_Replacement_Score: number;
  Comprehensive_Diagnostic_Check_Score: number;
  Exhaust_System_Inspection_Score: number;
  Fluid_Levels_Check_Score: number;
  Fuel_System_Inspection_Score: number;
  Lights_and_Wipers_Check_Score: number;
  Oil_Change_Score: number;
  Oil_Filter_Replacement_Score: number;
  Spark_Plugs_Replacement_Score: number;
  Steering_and_Suspension_Check_Score: number;
  Timing_Belt_Inspection_Score: number;
  Transmission_Check_Score: number;
  Tyre_Condition_and_Alignment_Check_Score: number;
  Tyre_Pressure_Check_Score: number;
  Underbody_Inspection_Score: number;
  Visual_Inspection_Score: number;
  Wheel_Alignment_and_Balancing_Score: number;
  Overall_Performance_Score: number;
}

// Base task structure from job_card/job_history
interface BaseTask {
  Job_Id: string;
  Task_Id: string;
  Task_Description: string;
  Status: "Pending" | "Assigned" | "In Progress" | "Completed";
  Estimated_Standard_Time: number;
  Time_Started: string; // From job_card or job_history
  Time_Taken_minutes: number | null; // From job_history or calculated from current task
  Outcome_Score: number | null; // From job_history
  VIN: string;
  Make: string;
  Model: string;
}

// EnrichedEngineerTask combines BaseTask with EngineerProfile data
export type EnrichedEngineerTask = BaseTask & EngineerProfile;

// Other types like Job and UnifiedTask might still be present, but EnrichedEngineerTask is key here.
export interface EstimateDetails {
  Calculated_At: string;
  Job_ID: string;
  Tasks: Array<{
    engineer_id: string;
    estimate: number;
    task_id: string;
  }>;
  Total_Estimate_Minutes: number;
}

// /jobs (active jobs)
export interface JobTask {
  Date_Created: string;
  Dynamic_Estimate: number;
  Estimate_Details: EstimateDetails;
  Engineer_Id: string | null;
  Engineer_Level: string | null;
  Engineer_Name: string | null;
  Suitability_Score: number | null;
  Estimated_Standard_Time: number;
  Job_Id: string;
  Job_Name: string;
  Make: string;
  Mileage: number;
  Model: string;
  Status: "Pending" | "Assigned" | "In Progress" | "Completed";
  Task_Description: string;
  Task_Id: string;
  Time_Started: string | null;
  Urgency: string;
  VIN: string;
}

// Unified task for table
export interface UnifiedTask {
  Job_Id: string;
  Task_Id: string;
  Task_Description: string;
  Status: "Pending" | "Assigned" | "In Progress" | "Completed";
  Engineer_Id: string | null;
  Engineer_Name: string | null;
  Engineer_Level: string | null;
  Suitability_Score: number | null;
  Estimated_Standard_Time: number;
  Dynamic_Estimate?: number;
  Estimate_Details?: EstimateDetails;
  timeTaken: number;
  VIN: string;
  Make: string;
  Model: string;
  Job_Name: string;
  Date_Created: string;
  Urgency: string;
  Time_Ended?: string | null; // Only present in completed tasks
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
  Dynamic_Estimated_Time: number | string;
  derivedCompletionStatus: "Completed" | "In Progress" | "Not Started";
}

export interface TimelineTask {
  Job_Id: string;
  Task_Id: string;
  Task_Description: string;
  Status: "Pending" | "Assigned" | "In Progress" | "Completed";
  Estimated_Standard_Time: number;
  Time_Started: string | null;
  Engineer_Id: string;
  Engineer_Name: string;
  Time_Taken_minutes: number | null;
}

// src/lib/types.ts

// /engineers and /engineers/available
export interface EngineerProfile {
  Engineer_ID: string;
  Engineer_Name: string;
  Availability: "Yes" | "No";
  Years_of_Experience: number;
  Specialization: string | null;
  Certifications: string | null;
  Avg_Job_Completion_Time: number;
  Customer_Rating: number;
  Overall_Basic_Service_Score: number;
  Overall_Custom_Service_Score: number;
  Overall_Full_Service_Score: number;
  Overall_Intermediate_Service_Score: number;
  Air_Filter_Check_Score: number;
  Battery_Check_Score: number;
  Brake_Inspection_Score: number;
  Cabin_Filter_Replacement_Score: number;
  Comprehensive_Diagnostic_Check_Score: number;
  Exhaust_System_Inspection_Score: number;
  Fluid_Levels_Check_Score: number;
  Fuel_System_Inspection_Score: number;
  Lights_and_Wipers_Check_Score: number;
  Oil_Change_Score: number;
  Oil_Filter_Replacement_Score: number;
  Spark_Plugs_Replacement_Score: number;
  Steering_and_Suspension_Check_Score: number;
  Timing_Belt_Inspection_Score: number;
  Transmission_Check_Score: number;
  Tyre_Condition_and_Alignment_Check_Score: number;
  Tyre_Pressure_Check_Score: number;
  Underbody_Inspection_Score: number;
  Visual_Inspection_Score: number;
  Wheel_Alignment_and_Balancing_Score: number;
  Overall_Performance_Score: number;
}

// /job-history (completed jobs)
export interface JobHistoryTask {
  job_id: string;
  job_name: string;
  task_id: string;
  task_description: string;
  status: "Completed";
  date_completed: string;
  urgency: string;
  VIN: string;
  make: string;
  model: string;
  mileage: number;
  assigned_engineer_id: string;
  engineer_name: string;
  engineer_level: "Master" | "Senior" | "Junior";
  time_started: string;
  time_ended: string;
  time_taken: number;
  estimated_standard_time: number;
  outcome_score: number;
  suitability_score?: number;
  dynamic_estimated_time?: number;
}

export interface EstimateDetails {
  Calculated_At: string;
  Job_ID: string;
  Tasks: Array<{
    engineer_id: string;
    estimate: number;
    task_id: string;
  }>;
  Total_Estimate_Minutes: number;
}

export interface User {
  id: number;
  clerk_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  manager_id: string | null;
  engineer_id: string | null;
  role: "engineer" | "manager";
}

export interface EngineerDashboardResponse {
  engineer_profile: EngineerDashboardProfile;
  active_tasks: EngineerActiveTask[];
  completed_tasks: EngineerCompletedTask[];
  todays_stats: EngineerTodayStats;
  performance_trend: EngineerPerformanceTrend[];
}

// Simplified engineer profile for dashboard (subset of EngineerProfile)
export interface EngineerDashboardProfile {
  engineer_id: string;
  name: string;
  availability: string;
  experience: number;
  specialization: string;
  customer_rating: number;
  avg_completion_time: number;
  overall_performance_score: number;
}

// Active task structure for engineer dashboard (simplified JobTask)
export interface EngineerActiveTask {
  job_id: string;
  job_name: string;
  task_id: string;
  task_description: string;
  status: "Pending" | "Assigned" | "In Progress";
  date_created: string;
  urgency: string;
  vin: string;
  make: string;
  model: string;
  estimated_time: number;
  suitability_score: number | null;
}

// Completed task structure for engineer dashboard (simplified JobHistoryTask)
export interface EngineerCompletedTask {
  job_id: string;
  task_description: string;
  date_completed: string;
  time_taken: number;
  outcome_score: number;
  estimated_time: number;
}

// Today's statistics for engineer
export interface EngineerTodayStats {
  completed_count: number;
  avg_outcome_score: number;
  total_time_spent: number;
}

// Performance trend data for charts
export interface EngineerPerformanceTrend {
  date: string;
  completed: number;
  avg_time: number;
  avg_score: number;
}

// Chart data types for the dashboard
export interface TaskStatusChart {
  status: string;
  count: number;
}

export interface TaskUrgencyChart {
  urgency: string;
  count: number;
}

export interface PerformanceChartData {
  date: string;
  completed: number;
  avgScore: number;
}
