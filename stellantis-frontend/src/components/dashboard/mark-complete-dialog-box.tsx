import type { UnifiedTask } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import StarRating from "./star-rating";

interface MarkCompleteDialogProps {
  task: UnifiedTask;
  onTaskComplete: () => void; // Callback to refresh data
}
const MarkCompleteDialog = ({
  task,
  onTaskComplete,
}: MarkCompleteDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [outcomeScore, setOutcomeScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (outcomeScore === 0) {
      toast.error("Please provide a rating from 1 to 5.");
      return;
    }
    setIsSubmitting(true);

    const promise = fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/mark-complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.Task_Id,
          job_id: task.Job_Id,
          outcome_score: outcomeScore,
        }),
      },
    );

    toast.promise(promise, {
      loading: "Marking task as complete...",
      success: async (res) => {
        if (!res.ok) {
          const error = (await res.json()) as { error: string };
          console.error("Error marking task as complete:", error);
          throw new Error(error.error || "Failed to mark as complete.");
        }
        onTaskComplete(); // Refresh the table data
        setIsOpen(false);
        return `Task "${task.Task_Description}" marked as complete!`;
      },
      error: (err: Error) => err.message,
      finally: () => setIsSubmitting(false),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Mark Complete
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Task: {task.Task_Description}</DialogTitle>
          <DialogDescription>
            Provide an outcome score for this task. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-muted-foreground text-sm">
            Rate the outcome of this task (1-5)
          </p>
          <StarRating rating={outcomeScore} onRatingChange={setOutcomeScore} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Mark as Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkCompleteDialog;
