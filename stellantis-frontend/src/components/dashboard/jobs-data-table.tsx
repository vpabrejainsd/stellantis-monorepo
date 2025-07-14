// src/components/dashboards/jobs-data-table.tsx
"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type FilterFn,
  type SortingState,
  type Table as TanStackTable,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  differenceInMinutes,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { ChevronDown, MoreHorizontal, Star } from "lucide-react";
import * as React from "react";
import { type DateRange } from "react-day-picker";

import { JOB_TYPES } from "@/lib/constants";
import {
  type JobTask,
  type JobHistoryTask,
  type Job,
  type UnifiedTask,
} from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useEffect } from "react";
import { ProgressBar } from "./progress-bar";
import { randomInt } from "node:crypto";

const formatMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} mins`;
};

// --- HELPER FUNCTIONS FOR CONDITIONAL STYLING ---
const getJobRowColor = (status: Job["derivedCompletionStatus"]): string => {
  if (status === "Completed") return "bg-green-100/50 dark:bg-green-900/30";
  if (status === "In Progress") return "bg-blue-100/50 dark:bg-blue-900/30";
  return "bg-transparent";
};

const getTaskRowColor = (
  status: UnifiedTask["Status"],
  timeTaken: number,
  estimated: number,
): string => {
  if (status === "Completed") return "bg-green-100/50 dark:bg-green-900/20";
  if (status === "In Progress") return "bg-yellow-100/50 dark:bg-yellow-900/20";
  return "bg-transparent";
};

// --- DEDICATED TOOLBAR COMPONENT FOR FILTERS ---
interface DataTableToolbarProps {
  table: TanStackTable<Job>;
}

function DataTableToolbar({ table }: DataTableToolbarProps) {
  // const isFiltered =
  //   table.getState().columnFilters.length > 0 ||
  //   !!table.getState().globalFilter;
  // const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  // React.useEffect(() => {
  //   table.getColumn("Date_Created")?.setFilterValue(date);
  // }, [date, table]);

  // const resetFilters = () => {
  //   table.resetColumnFilters();
  //   table.setGlobalFilter("");
  //   setDate(undefined);
  // };

  const COMPLETION_STATUSES = ["Not Started", "In Progress", "Completed"];

  return (
    <div className="flex items-center justify-between">
      <div className="flex w-full items-center justify-between gap-2">
        <Input
          placeholder="Search by VIN or Car Name..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-10 w-full"
        />
        <Select
          onValueChange={(value) =>
            table
              .getColumn("Job_Name")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Filter by Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {JOB_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) =>
            table
              .getColumn("Urgency")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Filter by Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgencies</SelectItem>
            {["Low", "Normal", "High"].map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) =>
            table
              .getColumn("derivedCompletionStatus")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {COMPLETION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* <Popover> */}
        {/*   <PopoverTrigger asChild> */}
        {/*     <Button */}
        {/*       id="date" */}
        {/*       variant={"outline"} */}
        {/*       className="h-10 w-[300px] justify-start text-left font-normal" */}
        {/*     > */}
        {/*       <CalendarIcon className="mr-2 h-4 w-4" /> */}
        {/*       {date?.from ? ( */}
        {/*         date.to ? ( */}
        {/*           <> */}
        {/*             {format(date.from, "LLL dd, y")} -{" "} */}
        {/*             {format(date.to, "LLL dd, y")} */}
        {/*           </> */}
        {/*         ) : ( */}
        {/*           format(date.from, "LLL dd, y") */}
        {/*         ) */}
        {/*       ) : ( */}
        {/*         <span>Pick a date range</span> */}
        {/*       )} */}
        {/*     </Button> */}
        {/*   </PopoverTrigger> */}
        {/*   <PopoverContent className="w-auto p-0" align="start"> */}
        {/*     <Calendar */}
        {/*       initialFocus */}
        {/*       mode="range" */}
        {/*       defaultMonth={date?.from} */}
        {/*       selected={date} */}
        {/*       onSelect={setDate} */}
        {/*       numberOfMonths={2} */}
        {/*     /> */}
        {/*   </PopoverContent> */}
        {/* </Popover> */}
        {/* {isFiltered && ( */}
        {/*   <Button */}
        {/*     variant="ghost" */}
        {/*     onClick={resetFilters} */}
        {/*     className="h-10 px-2 lg:px-3" */}
        {/*   > */}
        {/*     Reset <X className="ml-2 h-4 w-4" /> */}
        {/*   </Button> */}
        {/* )} */}
      </div>
    </div>
  );
}
interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  totalStars?: number;
}
function StarRating({
  rating,
  onRatingChange,
  totalStars = 5,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  return (
    <div className="flex items-center space-x-1">
      {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverRating ?? rating);
        return (
          <button
            key={starValue}
            type="button"
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => onRatingChange(starValue)}
            className="cursor-pointer"
          >
            <Star
              className={cn(
                "h-8 w-8 transition-colors",
                isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
// --- NEW: Mark Complete Dialog Component ---
interface MarkCompleteDialogProps {
  task: UnifiedTask;
  onTaskComplete: () => void; // Callback to refresh data
}
function MarkCompleteDialog({ task, onTaskComplete }: MarkCompleteDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [outcomeScore, setOutcomeScore] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
}
// --- NEW: Start Task Dialog/Button Component ---
// This component will handle starting a task.
interface StartTaskActionProps {
  task: UnifiedTask;
  onTaskStart: () => void; // Callback to refresh data
}
function StartTaskAction({ task, onTaskStart }: StartTaskActionProps) {
  const handleStartTask = () => {
    const promise = fetch(
      `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/start-task`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: task.Job_Id,
          task_id: task.Task_Id,
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
}

// --- EXPANDED ROW SUB-COMPONENT (UPDATED) ---
// This is the component that renders the list of tasks for an expanded job row.
function TaskDetailsSubComponent({
  tasks,
  onTaskUpdate,
}: {
  tasks: UnifiedTask[];
  onTaskUpdate: () => void;
}) {
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.Status === "Completed").length;
    setProgress((done / total) * 100);
  }, [tasks]);

  return (
    <div className="bg-muted/50 p-4">
      <div>
        <div className="flex items-center justify-center gap-1">
          <ProgressBar value={progress} key={tasks[0]?.Job_Id} />
          <h1>{progress.toPrecision(3)}%</h1>
        </div>
        <h4 className="mb-2 font-semibold">Tasks for this Job:</h4>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned Engineer</TableHead>
            <TableHead>Suitability Score</TableHead>
            <TableHead>Standard Est. Time</TableHead>
            <TableHead>Dynamic Est.</TableHead>
            <TableHead>Time Taken</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            // row background
            const rowColor = getTaskRowColor(
              task.Status,
              task.timeTaken,
              task.Estimated_Standard_Time,
            );

            // actions availability
            const canStart = task.Status === "Assigned";
            const canComplete = task.Status === "In Progress";

            // compute standard vs dynamic & badge color
            const standardTime = task.Estimated_Standard_Time;
            const dynamicEstimate =
              task.Estimate_Details?.Tasks.find(
                (t) =>
                  t.task_id === task.Task_Id &&
                  t.engineer_id === task.Engineer_Id,
              )?.estimate ?? 0;

            const shownEstimate = Math.round(
              Math.round((dynamicEstimate / 2) * 180) / 100,
            );

            const badgeClass =
              shownEstimate > standardTime
                ? "bg-red-500 dark:bg-red-700"
                : shownEstimate === standardTime
                  ? "bg-yellow-500 dark:bg-yellow-700"
                  : "bg-green-500 dark:bg-green-700";

            const suitability = task.Suitability_Score ?? 0;
            const suitabilityBadgeClass =
              suitability < 60
                ? "bg-red-500 dark:bg-red-700"
                : suitability <= 80
                  ? "bg-yellow-500 dark:bg-yellow-700"
                  : "bg-green-500 dark:bg-green-700";
            return (
              <TableRow key={task.Task_Id} className={rowColor}>
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
                  <div>{task.Engineer_Name ?? "N/A"}</div>
                  {task.Engineer_Level && (
                    <div className="text-muted-foreground text-xs">
                      {task.Engineer_Level}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {task.Suitability_Score == null ? (
                    "N/A"
                  ) : (
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-1",
                        suitabilityBadgeClass,
                      )}
                    >
                      {`${task.Suitability_Score}%`}
                    </Badge>
                  )}
                </TableCell>
                {/* Standard estimate */}
                <TableCell>{formatMinutes(standardTime)}</TableCell>

                {/* Dynamic estimate with colored badge */}
                <TableCell>
                  <Badge className={cn("rounded-full px-2 py-1", badgeClass)}>
                    {formatMinutes(shownEstimate)}
                  </Badge>
                </TableCell>

                {/* Actual time taken */}
                <TableCell>
                  {task.timeTaken > 0 ? formatMinutes(task.timeTaken) : "-"}
                </TableCell>

                {/* Actions dropdown */}
                <TableCell className="text-right">
                  {task.Status !== "Completed" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Edit</DropdownMenuItem>
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
  );
}

// --- CUSTOM FILTER FUNCTION FOR DATE RANGE ---
const dateRangeFilter: FilterFn<Job> = (row, columnId, value: DateRange) => {
  if (!value?.from) return true;
  const date = parseISO(row.getValue(columnId));
  const toDate = value.to ? new Date(value.to) : new Date(value.from);
  toDate.setHours(23, 59, 59, 999);
  return isWithinInterval(date, { start: startOfDay(value.from), end: toDate });
};

// --- MAIN TABLE COLUMN DEFINITIONS ---
const columns: ColumnDef<Job>[] = [
  {
    id: "expander",
    header: () => null,
    cell: ({ row }) => (
      <ChevronDown
        className={`h-4 w-4 transition-transform ${row.getIsExpanded() ? "rotate-180" : ""}`}
      />
    ),
    enableSorting: false,
  },
  { accessorKey: "Job_Id", header: "Job ID", enableGlobalFilter: false },
  {
    accessorKey: "VIN",
    header: "Vehicle",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">
          {row.original.Make} {row.original.Model}
        </div>
        <div className="text-muted-foreground text-xs">{row.original.VIN}</div>
      </div>
    ),
  },
  { accessorKey: "Job_Name", header: "Service Type" },
  {
    accessorKey: "Urgency",
    header: "Urgency",
    cell: ({ row }) => {
      const urgency = row.original.Urgency.toLowerCase();
      let variant: "default" | "secondary" | "destructive" = "default";
      if (urgency === "high") variant = "destructive";
      if (urgency === "low") variant = "secondary";
      return (
        <Badge variant={variant} className="capitalize">
          {row.original.Urgency}
        </Badge>
      );
    },
  },
  {
    accessorKey: "derivedCompletionStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.derivedCompletionStatus;
      let variant: "default" | "secondary" | "outline" = "secondary";
      if (status === "In Progress") variant = "default";
      if (status === "Completed") variant = "outline";
      return (
        <Badge variant={variant}>
          {status} ({row.original.completedTasks}/{row.original.totalTasks})
        </Badge>
      );
    },
  },
  {
    accessorKey: "Dynamic_Estimated_Time",
    header: "Dynamic Est. Time",
    cell: ({ row }) => {
      return typeof row.original.Dynamic_Estimated_Time === "number"
        ? formatMinutes(
            Math.round((row.original.Dynamic_Estimated_Time / 2) * 1.8),
          )
        : row.original.Dynamic_Estimated_Time;
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
            View Details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableGlobalFilter: false,
    enableSorting: false,
  },
];

// --- MAIN DATA TABLE COMPONENT ---
export function JobsDataTable() {
  const [data, setData] = React.useState<Job[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const fetchAndProcessData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [jobsResponse, historyResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs`),
        fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/job-history`),
      ]);
      // console.log("jobs: ", await jobsResponse.json());
      const currentTasks = (await jobsResponse.json()) as JobTask[];
      const historyTasks = (await historyResponse.json()) as JobHistoryTask[];
      console.log("Current Tasks:", currentTasks);
      const normalizedCurrentTasks: UnifiedTask[] = currentTasks.map(
        (task) => ({
          ...task,
          timeTaken: task.Time_Started
            ? differenceInMinutes(new Date(), parseISO(task.Time_Started))
            : 0,
          // These fields are only on /jobs
          Dynamic_Estimate: task.Dynamic_Estimate,
          Estimate_Details: task.Estimate_Details,
        }),
      );
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
          Suitability_Score: null,
          timeTaken: task.time_taken,
          VIN: task.VIN,
          Make: task.make,
          Model: task.model,
          Job_Name: task.job_name,
          Date_Created: task.time_started,
          Urgency: task.urgency,
        }),
      );
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
            if (currentJob.completedTasks === currentJob.totalTasks)
              currentJob.derivedCompletionStatus = "Completed";
            else if (
              currentJob.completedTasks > 0 ||
              currentJob.tasks.some(
                (t) => t.Status === "In Progress" || t.Status === "Assigned",
              )
            )
              currentJob.derivedCompletionStatus = "In Progress";
          }
          return acc;
        },
        {} as Record<string, Job>,
      );

      setData(
        Object.values(groupedJobs).sort((a, b) => {
          const dateA = new Date(a.Date_Created).getTime();
          const dateB = new Date(b.Date_Created).getTime();
          return dateB - dateA;
        }),
      );
    } catch (error) {
      console.error("Failed to fetch and process job data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchAndProcessData();
  }, [fetchAndProcessData]);

  const table = useReactTable({
    data,
    columns,
    filterFns: { dateRangeFilter },
    state: { sorting, columnFilters, expanded, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, filterValue) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const vin = (row.getValue("VIN") as string)?.toLowerCase();
      const make = (row.original.Make ?? "").toLowerCase();
      const model = (row.original.Model ?? "").toLowerCase();
      const searchTerm = filterValue.toLowerCase();
      return (
        vin?.includes(searchTerm) ||
        make.includes(searchTerm) ||
        model.includes(searchTerm)
      );
    },
    getRowCanExpand: () => true,
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const jobColor = getJobRowColor(
                  row.original.derivedCompletionStatus,
                );
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsExpanded() && "selected"}
                      onClick={row.getToggleExpandedHandler()}
                      className={`cursor-pointer ${jobColor}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow
                      className={!row.getIsExpanded() ? "bg-transparent" : ""}
                    >
                      <TableCell colSpan={columns.length} className="p-0">
                        <div
                          className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${row.getIsExpanded() ? "max-h-[1000px]" : "max-h-0"}`}
                        >
                          <div className="p-4">
                            <TaskDetailsSubComponent
                              tasks={row.original.tasks}
                              onTaskUpdate={fetchAndProcessData}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No jobs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground text-sm font-medium">
            Displaying {table.getFilteredRowModel().rows.length} of{" "}
            {data.length} total jobs.
          </h3>
        </div>
        <div className="flex items-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
