import type { EngineerActiveTask } from "@/lib/types";
import { getLocalTimeString } from "@/lib/utils";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { Play, AlertCircle } from "lucide-react";

interface EngineerStartTaskActionProps {
  task: EngineerActiveTask;
  onTaskStart: () => void; // Callback to refresh engineer dashboard data
}

const EngineerStartTaskAction = ({
  task,
  onTaskStart,
}: EngineerStartTaskActionProps) => {
  const { user } = useUser();

  const handleStartTask = async () => {
    // Engineer-specific validations
    if (!user?.engineer_id) {
      toast.error(
        "Engineer profile not found. Please contact your administrator.",
      );
      return;
    }

    if (task.status !== "Assigned") {
      toast.error("Only assigned tasks can be started.");
      return;
    }

    // Additional check: Ensure task is assigned to this engineer (if you have that data)
    // This would require the API to return engineer assignment info in the task

    const timeStarted = getLocalTimeString();
    console.log(
      `Engineer ${user.engineer_id} starting task:`,
      task.task_id,
      "at",
      timeStarted,
    );

    const requestBody = {
      job_id: task.job_id,
      task_id: task.task_id,
      time_started: timeStarted,
    };

    const promise = fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/start-task`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
        },
        body: JSON.stringify(requestBody),
      },
    );

    toast.promise(promise, {
      loading: "Starting your task...",
      success: async (res) => {
        if (!res.ok) {
          const errorData = (await res.json()) as { error: string };

          // Engineer-specific error messages
          if (res.status === 403) {
            throw new Error("This task is not assigned to you.");
          }
          if (res.status === 409) {
            throw new Error(
              "You already have a task in progress. Please complete it first.",
            );
          }

          throw new Error(errorData.error || "Failed to start task.");
        }

        onTaskStart(); // Refresh the engineer dashboard data
        return `You've started "${task.task_description}"! Good luck! 🔧`;
      },
      error: (err: Error) => {
        console.error("Error starting task:", err);
        return err.message;
      },
    });
  };

  // Don't show start action if not assigned or user is not an engineer
  if (user?.role !== "engineer" || task.status !== "Assigned") {
    return null;
  }

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        void handleStartTask();
      }}
      className="text-green-600 focus:text-green-600"
    >
      <Play className="mr-2 h-4 w-4" />
      Start My Task
    </DropdownMenuItem>
  );
};

export default EngineerStartTaskAction;
