import { NewJobForm } from "@/components/dashboard/new-job-form";

export default function CreateJobPage() {
  return (
    // ADDED: Responsive padding to the page container
    <div className="space-y-6 p-2 sm:p-4">
      <div>
        {/* CHANGED: Responsive font size for the main heading */}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Create a New Job
        </h1>
        <p className="text-muted-foreground">
          Fill out the form below to register a new vehicle and create a service
          job in the system.
        </p>
      </div>

      {/* The Form Component */}
      {/* This container is fine, it centers the form content within a max-width */}
      <div className="flex w-full items-center justify-center">
        <NewJobForm />
      </div>
    </div>
  );
}
