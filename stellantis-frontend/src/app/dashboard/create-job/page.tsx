import { NewJobForm } from "@/components/dashboard/new-job-form";

export default function CreateJobPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create a New Job</h1>
        <p className="text-muted-foreground">
          Fill out the form below to register a new vehicle and create a service
          job in the system.
        </p>
      </div>

      {/* The Form Component */}
      <div className="flex max-w-7xl items-center justify-center">
        <NewJobForm />
      </div>
    </div>
  );
}
