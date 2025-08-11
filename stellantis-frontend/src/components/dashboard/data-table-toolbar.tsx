import type { Job } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_TYPES } from "@/lib/constants";
import { type Table as TanStackTable } from "@tanstack/react-table";
interface DataTableToolbarProps {
  table: TanStackTable<Job>;
}

const DataTableToolbar = ({ table }: DataTableToolbarProps) => {
  const COMPLETION_STATUSES = ["In Progress", "Completed"];

  return (
    // CHANGED: Replaced the rigid flex layout with a responsive grid.
    // This stacks filters on mobile and expands to columns on larger screens.
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <Input
        placeholder="Search by VIN or Car Name..."
        value={(table.getState().globalFilter as string) ?? ""}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="h-10"
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
    </div>
  );
};

export default DataTableToolbar;
