"use client";

import { type JobTask } from "@/lib/types"; // Assuming JobTask is the type for items from the /jobs endpoint
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActiveTasksTableProps {
  tasks: JobTask[];
}

export function ActiveTasksTable({ tasks }: ActiveTasksTableProps) {
  // If there are no active tasks, display a message.
  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground flex h-24 items-center justify-center text-center text-sm">
        No tasks are currently assigned or in progress.
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    if (status === "In Progress") return "default";
    if (status === "Assigned") return "secondary";
    return "outline";
  };

  const getUrgencyVariant = (urgency?: string) => {
    const urgencyLower = urgency?.toLowerCase();
    if (urgencyLower === "high") return "destructive";
    if (urgencyLower === "normal") return "secondary";
    return "outline";
  };

  return (
    // This wrapper makes the table horizontally scrollable on small screens if needed.
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Status</TableHead>
            {/* These columns will be hidden on smaller screens for a better layout */}
            <TableHead className="hidden md:table-cell">Engineer</TableHead>
            <TableHead className="hidden text-right lg:table-cell">
              Urgency
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">
                {task.Task_Description}
              </TableCell>
              <TableCell>
                <div>{`${task.Make} ${task.Model}`}</div>
                <div className="text-muted-foreground text-xs">{task.VIN}</div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(task.Status)}>
                  {task.Status}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {task.Engineer_Name ?? "N/A"}
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Badge
                  variant={getUrgencyVariant(task.Urgency)}
                  className="capitalize"
                >
                  {task.Urgency}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
