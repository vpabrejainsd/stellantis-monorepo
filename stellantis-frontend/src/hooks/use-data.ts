import { useState, useCallback, useRef } from "react";
import {
  type ColumnFiltersState,
  type ExpandedState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import {
  type JobTask,
  type JobHistoryTask,
  type Job,
  type UnifiedTask,
} from "@/lib/types";

export function useJobData() {
  // State management
  const [data, setData] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // URL initialization tracking
  const didInitFromUrl = useRef(false);

  // Data fetching and processing logic
  const fetchAndProcessData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsResponse, historyResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs`),
        fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/job-history`),
      ]);

      const currentTasks = (await jobsResponse.json()) as JobTask[];
      const historyTasks = (await historyResponse.json()) as JobHistoryTask[];

      // Normalize current tasks
      const normalizedCurrentTasks: UnifiedTask[] = currentTasks.map(
        (task) => ({
          ...task,
          timeTaken: 0,
          Dynamic_Estimate: task.Dynamic_Estimate,
          Estimate_Details: task.Estimate_Details,
        }),
      );

      // Normalize history tasks
      const normalizedHistoryTasks: UnifiedTask[] = historyTasks.map(
        (task) => ({
          Job_Id: task.job_id,
          Task_Id: task.task_id,
          Task_Description: task.task_description,
          Status: "Completed",
          Engineer_Id: task.assigned_engineer_id,
          Engineer_Name: task.engineer_name,
          Engineer_Level: task.engineer_level,
          Estimated_Standard_Time: task.estimated_standard_time,
          Suitability_Score: task.suitability_score ?? null,
          timeTaken: task.time_taken,
          VIN: task.VIN,
          Make: task.make,
          Model: task.model,
          Job_Name: task.job_name,
          Date_Created: task.time_started,
          Urgency: task.urgency,
          Dynamic_Estimate: task.dynamic_estimated_time,
          Time_Ended: task.time_ended ?? null,
        }),
      );

      // Combine and group by job
      const allTasks = [...normalizedCurrentTasks, ...normalizedHistoryTasks];

      const groupedJobs = allTasks.reduce(
        (acc, task) => {
          acc[task.Job_Id] ??= {
            Job_Id: task.Job_Id,
            VIN: task.VIN,
            Make: task.Make,
            Model: task.Model,
            Job_Name: task.Job_Name,
            Date_Created: task.Date_Created,
            Urgency: task.Urgency,
            tasks: [],
            completedTasks: 0,
            totalTasks: 0,
            Dynamic_Estimated_Time: task.Dynamic_Estimate ?? "-",
            derivedCompletionStatus: "Not Started",
          };

          const currentJob = acc[task.Job_Id];
          if (currentJob) {
            currentJob.tasks.push(task);
            currentJob.totalTasks++;
            if (task.Status === "Completed") currentJob.completedTasks++;

            // Update completion status
            if (currentJob.completedTasks === currentJob.totalTasks) {
              currentJob.derivedCompletionStatus = "Completed";
            } else if (
              currentJob.completedTasks > 0 ||
              currentJob.tasks.some(
                (t) => t.Status === "In Progress" || t.Status === "Assigned",
              )
            ) {
              currentJob.derivedCompletionStatus = "In Progress";
            }
          }
          return acc;
        },
        {} as Record<string, Job>,
      );

      // Sort by Job_Id (descending)
      const sortedJobs = Object.values(groupedJobs).sort((a, b) => {
        const idA = parseInt(a.Job_Id.replace(/\D/g, ""), 10);
        const idB = parseInt(b.Job_Id.replace(/\D/g, ""), 10);
        return idB - idA;
      });

      setData(sortedJobs);
    } catch (error) {
      console.error("Failed to fetch and process job data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset URL initialization flag when data changes
  const resetUrlInit = useCallback(() => {
    didInitFromUrl.current = false;
  }, []);

  return {
    // State
    data,
    isLoading,
    sorting,
    columnFilters,
    expanded,
    globalFilter,
    pagination,

    // State setters
    setSorting,
    setColumnFilters,
    setExpanded,
    setGlobalFilter,
    setPagination,

    // Actions
    fetchAndProcessData,
    resetUrlInit,

    // Refs
    didInitFromUrl,
  };
}
