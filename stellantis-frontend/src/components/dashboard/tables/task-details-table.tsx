import { ProgressBar } from "@/components/shared/progress-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UnifiedTask } from "@/lib/types";
import { getTaskRowColor, cn, formatMinutes } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import AssignTaskAction from "../assign-task-action";
import MarkCompleteDialog from "../mark-complete-dialog-box";
import StartTaskAction from "../start-task-action";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, User } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TaskDetailsTable = ({
  tasks,
  onTaskUpdate,
}: {
  tasks: UnifiedTask[];
  onTaskUpdate: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.Status === "Completed").length;
    setProgress((done / total) * 100);
  }, [tasks]);

  return (
    <div className="bg-muted/50 p-2 sm:p-4">
      <div>
        <div className="flex items-center justify-center gap-2">
          <ProgressBar value={progress} key={tasks[0]?.Job_Id} />
          <span>{progress.toPrecision(3)}%</span>
        </div>
        {/* ADDED: Responsive font size */}
        <h4 className="mb-2 text-base font-semibold">Tasks for this Job:</h4>
      </div>
      {/* ADDED: Wrapper to make the inner table horizontally scrollable. */}
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader className="text-sm">
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Engineer</TableHead>
              <TableHead className="hidden lg:table-cell">
                Suitability Score
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Standard Est. Time
              </TableHead>
              <TableHead>Dynamic Est.</TableHead>
              <TableHead className="hidden md:table-cell">Time Taken</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {tasks.map((task) => {
              const standardTime = task.Estimated_Standard_Time;
              const dynamicEstimate =
                task.Status !== "Completed"
                  ? (task.Estimate_Details?.Tasks.find(
                      (t) =>
                        t.task_id === task.Task_Id &&
                        t.engineer_id === task.Engineer_Id,
                    )?.estimate ?? 0)
                  : (task.Dynamic_Estimate ?? 0);
              const shownEstimate = Math.round(
                Math.round((dynamicEstimate / 2) * 180) / 100,
              );
              const badgeClass =
                shownEstimate > standardTime
                  ? "bg-red-500"
                  : shownEstimate === standardTime
                    ? "bg-yellow-500"
                    : "bg-green-500";
              const suitability = task.Suitability_Score ?? 0;
              const suitabilityBadgeClass =
                suitability < 60
                  ? "bg-red-500"
                  : suitability <= 80
                    ? "bg-yellow-500"
                    : "bg-green-500";
              const canStart = task.Status === "Assigned";
              const canComplete = task.Status === "In Progress";
              const canAssign = task.Status === "Pending";
              return (
                <TableRow
                  key={task.Task_Id}
                  className={getTaskRowColor(task.Status)}
                >
                  <TableCell className="font-medium">
                    {task.Task_Description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.Status === "Completed" ? "outline" : "default"
                      }
                    >
                      {task.Status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.Engineer_Id ? (
                      <Link
                        href={`/dashboard/engineers/${task.Engineer_Id}`}
                        className="group flex max-w-[180px] items-center gap-2 text-blue-800 transition-colors hover:text-blue-600 hover:underline sm:max-w-none dark:text-blue-300"
                        tabIndex={0}
                      >
                        <span className="inline-flex items-center gap-1 truncate">
                          <User
                            className="h-4 w-4 text-blue-400 transition-colors group-hover:text-blue-600"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {task.Engineer_Name ?? "N/A"}
                          </span>
                        </span>
                        {task.Engineer_Level && (
                          <span className="text-muted-foreground bg-muted ml-1 hidden rounded px-2 py-0.5 text-xs group-hover:bg-blue-50 md:block dark:group-hover:bg-blue-950">
                            {task.Engineer_Level}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  {/* CHANGED: Hide less critical columns on small screens */}
                  <TableCell className="hidden lg:table-cell">
                    {task.Suitability_Score == null ? (
                      "N/A"
                    ) : (
                      <Badge
                        className={cn(
                          "rounded-full px-2 py-1",
                          suitabilityBadgeClass,
                        )}
                      >{`${task.Suitability_Score}%`}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatMinutes(standardTime)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-full px-2 py-1", badgeClass)}>
                      {formatMinutes(shownEstimate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {task.timeTaken > 0 && task.Status === "Completed"
                      ? formatMinutes(task.timeTaken)
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {task.Status !== "Completed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canStart && (
                            <StartTaskAction
                              task={task}
                              onTaskStart={onTaskUpdate}
                            />
                          )}
                          {canComplete && (
                            <MarkCompleteDialog
                              task={task}
                              onTaskComplete={onTaskUpdate}
                            />
                          )}
                          {canAssign && (
                            <AssignTaskAction
                              task={task}
                              onTaskAssign={onTaskUpdate}
                            />
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
export default TaskDetailsTable;
