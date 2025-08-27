import React, { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash, AlertTriangle, Car, Calendar, Users } from "lucide-react";

interface Job {
  Job_Id: string;
  Job_Name: string;
  Make: string;
  Model: string;
  VIN: string;
  Urgency: string;
  totalTasks: number;
  completedTasks: number;
  derivedCompletionStatus: string;
  Date_Created: string;
}

interface DeleteJobDialogProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (jobId: string) => Promise<void>;
}

export function DeleteJobDialog({
  job,
  isOpen,
  onClose,
  onConfirmDelete,
}: DeleteJobDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const isHistoricalJob = job.derivedCompletionStatus === "Completed";
  const hasActiveTasks = job.totalTasks - job.completedTasks > 0;

  // Required confirmation text
  const requiredConfirmText = `DELETE ${job.Job_Id}`;

  const handleDelete = async () => {
    if (confirmText !== requiredConfirmText) {
      toast.error(`Please type "${requiredConfirmText}" to confirm`);
      return;
    }

    setIsDeleting(true);

    try {
      await onConfirmDelete(job.Job_Id);
      toast.success("Job deleted successfully");
      onClose();
      setConfirmText(""); // Reset confirmation text
    } catch (error) {
      toast.error("Failed to delete job");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onClose();
  };

  const getUrgencyVariant = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "high":
        return "destructive";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[500px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash className="h-5 w-5" />
            Delete Job Confirmation
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the job
            and all associated data.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {/* Job Details Card */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="truncate pr-2 text-base font-semibold">
                {job.Job_Name}
              </h3>
              <Badge
                variant={getUrgencyVariant(job.Urgency)}
                className="flex-shrink-0 capitalize"
              >
                {job.Urgency}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Car className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {job.Make} {job.Model}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {new Date(job.Date_Created).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">VIN:</span>{" "}
                <span className="font-mono text-xs break-all">{job.VIN}</span>
              </div>
              <div>
                <span className="font-medium">Job ID:</span>{" "}
                <span className="font-mono text-xs">{job.Job_Id}</span>
              </div>
            </div>
          </div>

          {/* Impact Warning */}
          <Alert variant={hasActiveTasks ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">This will delete:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>
                    <strong>{job.totalTasks}</strong> total tasks (
                    {job.completedTasks} completed,{" "}
                    {job.totalTasks - job.completedTasks} pending)
                  </li>
                  {hasActiveTasks && (
                    <li className="text-red-600">
                      <strong>Active tasks will be removed</strong> and assigned
                      engineers will be freed
                    </li>
                  )}
                  {isHistoricalJob && (
                    <li>Historical job data and performance metrics</li>
                  )}
                  <li>All associated job history and logs</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label
              htmlFor="confirmDelete"
              className="block text-sm font-medium"
            >
              Type{" "}
              <span className="bg-muted rounded px-1 font-mono text-xs">
                {requiredConfirmText}
              </span>{" "}
              to confirm deletion:
            </label>
            <input
              id="confirmDelete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-md border px-3 py-2 font-mono text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
              placeholder={requiredConfirmText}
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          {/* Status Info */}
          <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">
                Status: {isHistoricalJob ? "Completed" : "Active"}
                {hasActiveTasks &&
                  ` (${job.totalTasks - job.completedTasks} pending tasks)`}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== requiredConfirmText}
            className="min-w-[120px] flex-1 sm:flex-none"
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Delete Job
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
