import { JobsDataTable } from "@/components/dashboard/jobs-data-table";

const JobsPage = () => {
  return (
    // ADDED: A main container with responsive padding and spacing.
    <div className="space-y-4 p-2 sm:p-6">
      <div>
        {/* ADDED: A clear heading for the page with responsive font size. */}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          All Jobs
        </h1>
        <p className="text-muted-foreground">
          View, filter, and manage all current and past service jobs.
        </p>
      </div>
      <div>
        <JobsDataTable />
      </div>
    </div>
  );
};

export default JobsPage;
