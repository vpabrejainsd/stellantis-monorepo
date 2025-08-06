// src/components/dashboards/engineer-tasks-table.tsx
"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { type EnrichedEngineerTask } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

// Helper to determine status badge variant
const getStatusBadgeVariant = (status: EnrichedEngineerTask["Status"]) => {
  if (status === "Completed") return "outline";
  if (status === "In Progress") return "default";
  return "secondary";
};

// This column definition now works because the EnrichedEngineerTask type is correct.
const columns: ColumnDef<EnrichedEngineerTask>[] = [
  // { accessorKey: "Job_Id", header: "Job ID", enableSorting: true },
  { accessorKey: "Make", header: "Make", enableSorting: true, size: 120 },
  { accessorKey: "Model", header: "Model", enableSorting: true, size: 120 },
  { accessorKey: "VIN", header: "VIN", enableSorting: true, size: 150 },
  {
    accessorKey: "Task_Description",
    header: "Task",
    enableSorting: true,
    size: 100,
  },
  {
    accessorKey: "Status",
    header: "Status",
    size: 120,
    cell: ({ row }) => (
      <Badge variant={getStatusBadgeVariant(row.original.Status)}>
        {row.original.Status}
      </Badge>
    ),
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: "equals",
  },
  {
    accessorKey: "Estimated_Standard_Time",
    header: "Est. Time (min)",
    enableSorting: true,
    size: 100,
  },
  {
    accessorKey: "time_taken",
    header: "Time Taken (min)",
    cell: ({ row }) => row.original.Time_Taken_minutes ?? "-",
    enableSorting: true,
    size: 100,
  },
  {
    accessorKey: "outcome_score",
    header: "Score",
    cell: ({ row }) => row.original.Outcome_Score ?? "-",
    enableSorting: true,
    size: 60,
  },
  {
    accessorKey: "Time_Started",
    header: "Started On",
    cell: ({ row }) =>
      row.original.Time_Started
        ? new Date(row.original.Time_Started).toLocaleString()
        : "-",
    enableSorting: true,
    size: 150,
  },
];

interface EngineerTasksTableProps {
  tasks: EnrichedEngineerTask[];
}

export function EngineerTasksTable({ tasks }: EngineerTasksTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");

  const table = useReactTable({
    data: tasks,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters, globalFilter },
    globalFilterFn: (row, columnId, filterValue: string) => {
      const searchTerm = filterValue.toLowerCase();
      const taskDescription =
        row.original.Task_Description?.toLowerCase() || "";
      const make = row.original.Make?.toLowerCase() || "";
      const model = row.original.Model?.toLowerCase() || "";
      const vin = row.original.VIN?.toLowerCase() || "";
      return (
        taskDescription.includes(searchTerm) ||
        make.includes(searchTerm) ||
        model.includes(searchTerm) ||
        vin.includes(searchTerm)
      );
    },
  });

  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter;
  const TASK_STATUS_OPTIONS = [
    "Pending",
    "Assigned",
    "In Progress",
    "Completed",
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search all tasks..."
          value={(table.getState().globalFilter as string) ?? ""}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <Select
          value={(table.getColumn("Status")?.getFilterValue() as string) ?? ""}
          onValueChange={(value) =>
            table
              .getColumn("Status")
              ?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {TASK_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <button
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter("");
            }}
            className="border-input bg-background hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            Reset <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
