import React, { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import {
  MoreHorizontal,
  Edit,
  User,
  Trash,
  AlarmClockCheckIcon,
} from "lucide-react";
import { type Job } from "@/lib/types";
import { EditJobDialog } from "./update-job-dialog-box";
import { DeleteJobDialog } from "./delete-dialog-box";
import { assignAllTasks, getLocalTimeString } from "@/lib/utils";

interface JobActionDropdownProps {
  job: Job;
  onAssign: (jobId: string) => void;
  onRefresh: () => void;
}

export function JobActionDropdown({
  job,
  onAssign,
  onRefresh,
}: JobActionDropdownProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isStartingAllTasks, setIsStartingAllTasks] = useState(false);

  const assignDisabled =
    job.completedTasks >= job.totalTasks ||
    job.derivedCompletionStatus === "Completed" ||
    job.totalTasks === 0 ||
    job.tasks.filter((t) => t.Status === "Pending").length === 0; // No tasks to assign

  const startAllTasksDisabled = job.completedTasks >= job.totalTasks;
  const handleEdit = async (updatedJobData: Partial<Job>) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/${job.Job_Id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            make: updatedJobData.Make,
            model: updatedJobData.Model,
            vin: updatedJobData.VIN,
            urgency: updatedJobData.Urgency,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update job");
      }

      onRefresh(); // Refresh the table data
    } catch (error) {
      console.error("Edit job error:", error);
      throw error; // Re-throw to let the dialog handle the error display
    }
  };

  const handleAssignTasks = async () => {
    setIsAssigning(true);
    try {
      const result = await assignAllTasks(job.Job_Id);

      if (result.success) {
        onRefresh(); // Refresh the table to show updated assignments
      }

      // Additional logging for debugging
      console.log("Assignment result:", result);
    } catch (error) {
      console.error("Assignment error:", error);
      // Error handling is already done in assignAllTasks function
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartAllTasks = async () => {
    setIsStartingAllTasks(true);
    try {
      const timeStarted = getLocalTimeString();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/${job.Job_Id}/start-all-tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ time_started: timeStarted }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start all tasks");
      }

      onRefresh(); // Refresh the table data
    } catch (error) {
      console.error("Start all tasks error:", error);
    } finally {
      setIsStartingAllTasks(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/${job.Job_Id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const errorData = await response.json().catch(() => ({}));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        throw new Error(errorData.error ?? "Failed to delete job");
      }

      // Success handling
      toast.success("Job deleted successfully");
      onRefresh(); // Refresh the table data
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Delete job error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete job",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getAssignTooltip = () => {
    if (job.derivedCompletionStatus === "Completed") {
      return "All tasks completed";
    }
    if (job.completedTasks >= job.totalTasks) {
      return "All tasks already assigned";
    }
    if (job.totalTasks === 0) {
      return "No tasks to assign";
    }
    return "";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={`Actions for job ${job.Job_Name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-xs">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Job
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!assignDisabled && !isAssigning) {
                handleAssignTasks().catch(console.error);
              }
            }}
            disabled={assignDisabled || isAssigning}
            className={
              assignDisabled || isAssigning
                ? "cursor-not-allowed text-gray-400 opacity-50"
                : "cursor-pointer"
            }
            title={assignDisabled ? getAssignTooltip() : ""}
          >
            <User className="mr-2 h-4 w-4" />
            {isAssigning ? "Assigning..." : "Assign Tasks"}
            {assignDisabled && (
              <span className="ml-auto text-xs text-gray-400">
                ({job.completedTasks}/{job.totalTasks})
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={startAllTasksDisabled}
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!startAllTasksDisabled) {
                handleStartAllTasks().catch(console.error);
              }
            }}
            className={
              startAllTasksDisabled
                ? "cursor-not-allowed text-gray-400 opacity-50"
                : "cursor-pointer"
            }
          >
            <AlarmClockCheckIcon className="mr-2 h-4 w-4" />
            <p>
              Start All Tasks{" "}
              <span className="ml-auto text-xs text-gray-400">
                ({job.totalTasks - job.completedTasks}/{job.totalTasks})
              </span>
            </p>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsDeleteDialogOpen(true);
            }}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete Job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Edit Dialog */}
      <EditJobDialog
        job={job}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={handleEdit}
      />
      <DeleteJobDialog
        job={job}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirmDelete={handleDelete}
      />
    </>
  );
}
