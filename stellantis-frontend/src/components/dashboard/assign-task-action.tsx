import type { UnifiedTask } from "@/lib/types";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface AssignTaskActionProps {
  task: UnifiedTask;
  onTaskAssign: () => void;
}

const AssignTaskAction = ({ task, onTaskAssign }: AssignTaskActionProps) => {
  const handleAssignTask = () => {
    const promise = fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/task/assign-engineer`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_card_id: task.Job_Id,
          task_id: task.Task_Id,
        }),
      },
    );

    toast.promise(promise, {
      loading: "Assigning task...",
      success: async (res) => {
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          throw new Error(error.error || "Failed to assign task.");
        }
        onTaskAssign(); // Refresh the table data
        return `Task "${task.Task_Description}" has been assigned!`;
      },
      error: (err: Error) => err.message,
    });
  };

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        handleAssignTask();
      }}
    >
      Assign Task
    </DropdownMenuItem>
  );
};

export default AssignTaskAction;
