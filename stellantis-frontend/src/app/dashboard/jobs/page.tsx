import JobsDataTable from "@/components/dashboard/tables/jobs-data-table";

const JobsPage = () => {
  return (
    <div className="space-y-4 p-2 sm:p-6">
      <div>
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
