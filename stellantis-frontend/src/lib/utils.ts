import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ALL_TASKS } from "@/lib/constants";
import type { Job, UnifiedTask } from "@/lib/types";
import type { FilterFn } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, startOfDay } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getLocalTimeString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export function getTaskIdsFromNames(taskNames: string[]): string[] {
  const nameToIdMap = Object.entries(ALL_TASKS).reduce(
    (acc, [taskId, task]) => {
      acc[task.name] = taskId;
      return acc;
    },
    {} as Record<string, string>,
  );

  return taskNames
    .map((name) => nameToIdMap[name])
    .filter((id): id is string => id !== undefined);
}

export const formatMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} mins`;
};

export const getJobRowColor = (
  status: Job["derivedCompletionStatus"],
): string => {
  if (status === "Completed") return "bg-green-100/50 dark:bg-green-900/30";
  if (status === "In Progress") return "bg-blue-100/50 dark:bg-blue-900/30";
  return "bg-transparent";
};

export const getTaskRowColor = (status: UnifiedTask["Status"]): string => {
  if (status === "Completed") return "bg-green-100/50 dark:bg-green-900/20";
  if (status === "In Progress") return "bg-yellow-100/50 dark:bg-yellow-900/20";
  return "bg-transparent";
};

export const dateRangeFilter: FilterFn<Job> = (
  row,
  columnId,
  value: DateRange,
) => {
  if (!value?.from) return true;
  const date = parseISO(row.getValue(columnId));
  const toDate = value.to ? new Date(value.to) : new Date(value.from);
  toDate.setHours(23, 59, 59, 999);
  return isWithinInterval(date, { start: startOfDay(value.from), end: toDate });
};

// src/utils/jobAssignment.ts
import { toast } from "sonner";

interface AssignmentResult {
  task_id: string;
  engineer_assigned: string | null;
  suitability_score: number | null;
  status: string;
  recommendation_reason: string | null;
  dynamic_estimated_time: number | null;
}

interface AssignmentResponse {
  message: string;
  assignments: AssignmentResult[];
}

export async function assignAllTasks(jobId: string): Promise<{
  success: boolean;
  assignedCount: number;
  failedCount: number;
  totalTasks: number;
}> {
  try {
    toast.info(`Assigning engineers to all tasks for Job ${jobId}...`);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/assign-all-tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_card_id: jobId }),
      },
    );

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = await response.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      throw new Error(errorData.error ?? "Failed to assign engineers to tasks");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const assignmentResult: AssignmentResponse = await response.json();
    const { assignments } = assignmentResult;

    const assignedCount = assignments.filter(
      (a) => a.status === "Assigned",
    ).length;
    const failedCount = assignments.length - assignedCount;
    const totalTasks = assignments.length;

    // Provide detailed feedback to the user
    if (failedCount === 0) {
      toast.success(
        `All ${assignedCount} tasks have been assigned successfully!`,
      );
    } else if (assignedCount === 0) {
      toast.error(
        `No tasks could be assigned. All ${failedCount} assignments failed.`,
      );
    } else {
      toast.warning(
        `${assignedCount} tasks assigned successfully, but ${failedCount} failed to assign.`,
      );
    }

    return {
      success: failedCount === 0,
      assignedCount,
      failedCount,
      totalTasks,
    };
  } catch (error) {
    console.error("Error assigning tasks:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    toast.error("Failed to assign tasks", {
      description: errorMessage,
    });

    return {
      success: false,
      assignedCount: 0,
      failedCount: 0,
      totalTasks: 0,
    };
  }
}
