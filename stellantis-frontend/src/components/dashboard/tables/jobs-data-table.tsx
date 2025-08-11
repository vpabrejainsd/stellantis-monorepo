// TODO: Implement pagination using params
"use client";

import {
  type ColumnDef,
  type ExpandedState,
  type Row,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { formatDate } from "date-fns";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { type Job } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  cn,
  dateRangeFilter,
  formatMinutes,
  getJobRowColor,
} from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import DataTableToolbar from "@/components/dashboard/data-table-toolbar";
import TaskDetailsTable from "./task-details-table";
import { useJobData } from "@/hooks/use-data";
import { JobActionDropdown } from "../job-actions";

// --- MAIN DATA TABLE COMPONENT ---
const JobsDataTable = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data,
    isLoading,
    sorting,
    columnFilters,
    expanded,
    globalFilter,
    pagination,
    setSorting,
    setColumnFilters,
    setExpanded,
    setGlobalFilter,
    setPagination,
    fetchAndProcessData,
    didInitFromUrl,
  } = useJobData();

  const columns: ColumnDef<Job>[] = React.useMemo(
    () => [
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
            <div className="text-muted-foreground text-xs">
              {row.original.VIN}
            </div>
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
        accessorKey: "Date_Created",
        header: "Date Created",
        cell: ({ row }) => {
          return formatDate(row.original.Date_Created, "yyyy-MM-dd");
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const job = row.original;

          const handleAssign = async (jobId: string) => {
            // Your assign logic
            await fetchAndProcessData();
          };

          return (
            <JobActionDropdown
              job={job}
              onAssign={handleAssign}
              onRefresh={fetchAndProcessData}
            />
          );
        },
        enableSorting: false,
      },
    ],
    [fetchAndProcessData],
  );

  const table = useReactTable({
    data,
    columns,
    filterFns: { dateRangeFilter },
    state: { sorting, columnFilters, expanded, globalFilter, pagination },
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
    getRowId: (row) => row.Job_Id,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
  const columnClassMap: Record<string, string> = {
    Job_Id: "hidden lg:table-cell", // Hide Job ID on most screens
    Urgency: "hidden sm:table-cell", // Hide Urgency on the smallest screens
    Dynamic_Estimated_Time: "hidden md:table-cell", // Hide estimate on small/medium
  };

  const handleRowClick = (row: Row<Job>) => {
    const isCurrentlyExpanded = row.getIsExpanded();
    const jobId = row.id;
    const params = new URLSearchParams(searchParams.toString());

    table.toggleAllRowsExpanded(false);

    if (!isCurrentlyExpanded) {
      row.toggleExpanded(true);
      params.set("job", jobId);
      // When a job is expanded, also set the page param for consistency
      params.set("page", String(pagination.pageIndex));
    } else {
      params.delete("job");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPageIndex: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPageIndex));
    params.delete("job"); // Changing pages collapses any open job.
    router.push(`?${params.toString()}`, { scroll: false });

    setPagination((prev) => ({ ...prev, pageIndex: newPageIndex }));
    setExpanded({});
  };

  // --- THE ONLY `useEffect` FOR URL INITIALIZATION ---
  React.useEffect(() => {
    // Guard clauses to ensure this runs only when ready and only once.
    if (
      isLoading ||
      didInitFromUrl.current ||
      table.getSortedRowModel().rows.length === 0
    ) {
      return;
    }

    const jobParam = searchParams.get("job");
    const pageParam = searchParams.get("page");

    let pageIndexToSet = 0;
    let expandedToSet: ExpandedState = {};

    // Priority 1: A 'job' param exists. Find its page and expand it.
    if (jobParam) {
      const rowIndex = table
        .getSortedRowModel()
        .rows.findIndex((r) => r.id === jobParam);
      if (rowIndex !== -1) {
        pageIndexToSet = Math.floor(rowIndex / pagination.pageSize);
        expandedToSet = { [jobParam]: true };
      } else {
        toast.error("Job Not Found", {
          description: `Job with ID "${jobParam}" could not be found.`,
        });
      }
    }
    // Priority 2: No 'job' param, but a 'page' param exists.
    else if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum >= 0 && pageNum < table.getPageCount()) {
        pageIndexToSet = pageNum;
      }
    }

    // Apply the derived state from the URL.
    setPagination((prev) => ({ ...prev, pageIndex: pageIndexToSet }));
    setExpanded(expandedToSet);

    // Lock this effect from ever running again.
    didInitFromUrl.current = true;
  }, [
    isLoading,
    searchParams,
    table,
    pagination.pageSize,
    router,
    didInitFromUrl,
    setPagination,
    setExpanded,
  ]);

  React.useEffect(() => {
    void fetchAndProcessData();
  }, [fetchAndProcessData]);

  return (
    <div className="w-full space-y-4">
      <DataTableToolbar table={table} />
      <div className="w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="text-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  // CHANGED: Apply responsive classes to hide certain columns.
                  <TableHead
                    key={header.id}
                    className={cn(columnClassMap[header.id])}
                  >
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
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsExpanded() && "selected"}
                    onClick={() => {
                      handleRowClick(row);
                    }}
                    className={`cursor-pointer text-xs ${getJobRowColor(row.original.derivedCompletionStatus)}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      // CHANGED: Apply same responsive classes to the data cells.
                      <TableCell
                        key={cell.id}
                        className={cn(columnClassMap[cell.column.id])}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {/* This is the expanded row content */}
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="p-0">
                        {/* CHANGED: Removed extra inner div with padding. Padding is now handled inside TaskDetailsSubComponent. */}
                        <TaskDetailsTable
                          tasks={row.original.tasks}
                          onTaskUpdate={fetchAndProcessData}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
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
      {/* CHANGED: Make pagination controls stack on mobile and go row on larger screens. */}
      <div className="flex flex-col items-start justify-between gap-4 py-4 sm:flex-row sm:items-center">
        <div className="text-muted-foreground flex-1 text-sm">
          Displaying {table.getFilteredRowModel().rows.length} of {data.length}{" "}
          total jobs.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.pageIndex - 1)}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.pageIndex + 1)}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobsDataTable;
