import type { UnifiedTask } from "@/lib/types";
import { getLocalTimeString } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface StartTaskActionProps {
  task: UnifiedTask;
  onTaskStart: () => void; // Callback to refresh data
}
const StartTaskAction = ({ task, onTaskStart }: StartTaskActionProps) => {
  const handleStartTask = () => {
    const timeStarted = getLocalTimeString();
    console.log("Starting task:", task.Task_Id, "at", timeStarted);
    const promise = fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/start-task`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: task.Job_Id,
          task_id: task.Task_Id,
          time_started: timeStarted,
        }),
      },
    );

    toast.promise(promise, {
      loading: "Starting task...",
      success: async (res) => {
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          throw new Error(error.error || "Failed to start task.");
        }
        onTaskStart(); // Refresh the table data
        return `Task "${task.Task_Description}" has been started!`;
      },
      error: (err: Error) => err.message,
    });
  };

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        handleStartTask();
      }}
    >
      Start Task
    </DropdownMenuItem>
  );
};

export default StartTaskAction;
