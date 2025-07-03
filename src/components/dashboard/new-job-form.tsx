/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/components/dashboards/new-job-form.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type * as z from "zod";
import { toast } from "sonner";

import { newJobFormSchema } from "@/lib/validators";
import {
  JOB_TYPES,
  URGENCY_LEVELS,
  ALL_TASKS,
  BASIC_SERVICE_TASK_IDS,
  INTERMEDIATE_SERVICE_TASK_IDS,
  FULL_SERVICE_TASK_IDS,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

type NewJobFormValues = z.infer<typeof newJobFormSchema>;

export function NewJobForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewJobFormValues>({
    resolver: zodResolver(newJobFormSchema),
    defaultValues: {
      vin: "",
      make: "",
      model: "",
      mileage: 0,
      urgency: "Normal",
      jobName: undefined,
      selectedTasks: [],
    },
  });

  const { watch, setValue } = form;
  const watchedJobName = watch("jobName");

  // Automatically set the correct preset tasks for non-custom jobs
  useEffect(() => {
    let taskIds: string[] = [];
    if (watchedJobName === "Basic Service") {
      taskIds = [...BASIC_SERVICE_TASK_IDS];
    } else if (watchedJobName === "Intermediate Service") {
      taskIds = [...INTERMEDIATE_SERVICE_TASK_IDS];
    } else if (watchedJobName === "Full Service") {
      taskIds = [...FULL_SERVICE_TASK_IDS];
    }
    if (watchedJobName !== "Custom Service") {
      setValue("selectedTasks", taskIds, { shouldValidate: true });
    }
  }, [watchedJobName, setValue]);

  async function onSubmit(data: NewJobFormValues) {
    setIsSubmitting(true);
    toast.info("Step 1: Creating job and tasks in the database...");

    // Frontend no longer generates commonJobCardId here for the initial job creation
    // Instead, it passes all relevant form data to the backend directly.
    const initialPayload = {
      jobName: data.jobName,
      vin: data.vin,
      make: data.make,
      model: data.model,
      mileage: data.mileage,
      urgency: data.urgency,
      selectedTasks: data.selectedTasks, // array of Task_IDs (e.g., ["T001", "T003"])
    };

    if (
      initialPayload.selectedTasks === undefined ||
      initialPayload.selectedTasks.length === 0
    ) {
      toast.error("Cannot create a job with no tasks selected.");
      setIsSubmitting(false);
      return;
    }

    let generatedJobId: string | null = null; // To store the ID returned from Flask

    try {
      // --- STAGE 1: CREATE THE JOB AND TASKS ---
      const createJobResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/create-job`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initialPayload), // Send the initial payload
        },
      );

      if (!createJobResponse.ok) {
        const errorData = await createJobResponse.json();
        throw new Error(
          errorData.error ?? "Failed to create job in the database.",
        );
      }
      const createJobResult = (await createJobResponse.json()) as {
        message: string;
        job_id: string;
      };
      generatedJobId = createJobResult.job_id; // Capture the Job_Id returned by Flask

      if (!generatedJobId) {
        throw new Error("Backend did not return a Job ID.");
      }

      toast.success(`Job ${generatedJobId} created successfully!`);

      // --- STAGE 2: TRIGGER ENGINEER ASSIGNMENT FOR THE NEWLY CREATED JOB ---
      toast.info(
        `Step 2: Assigning engineers to all tasks for Job ${generatedJobId}...`,
      );

      const assignResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs/assign-all-tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_card_id: generatedJobId }), // Use the Job_Id from the first call
        },
      );

      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        throw new Error(
          errorData.error ?? "Failed to trigger engineer assignments.",
        );
      }

      const assignmentSummary = (await assignResponse.json()) as {
        message: string;
        assignments: {
          task_id: string; // Assuming Task_ID can be a string now
          status: string;
          engineer_assigned: string | null;
        }[];
      };

      const successes = assignmentSummary.assignments.filter(
        (a) => a.status === "Assigned",
      ).length;
      const failures = assignmentSummary.assignments.length - successes;

      if (failures === 0) {
        toast.success(`All ${successes} tasks have been assigned an engineer.`);
      } else {
        console.log(assignmentSummary);
        toast.warning(
          `${successes} tasks were assigned, but ${failures} could not be assigned.`,
        );
      }

      form.reset();
    } catch (error) {
      console.error(
        "An error occurred during the job creation/assignment process:",
        error,
      );
      toast.error("Process failed", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Display selected tasks by name
  const TasksDisplay = useMemo(() => {
    if (!watchedJobName || watchedJobName === "Custom Service") return null;
    const taskIds = form.getValues("selectedTasks") ?? [];
    if (taskIds.length === 0) return null;

    return (
      <div className="bg-muted/50 space-y-4 rounded-md border p-4">
        <h4 className="text-foreground font-semibold">Included Tasks</h4>
        <ul className="list-inside list-disc pt-1 pl-2 text-sm">
          {taskIds.map((taskId) => (
            <li key={taskId}>
              {ALL_TASKS[taskId as keyof typeof ALL_TASKS]?.name ?? taskId}
            </li>
          ))}
        </ul>
      </div>
    );
  }, [watchedJobName, form]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Car & Job Intake</CardTitle>
        <CardDescription>
          Enter car and job details to add a new job to the queue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div>
              <h3 className="mb-4 text-lg font-semibold">
                Car & Customer Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VIN</FormLabel>
                      <FormControl>
                        <Input placeholder="1GKS1EKD4E..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="Chevrolet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Silverado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-semibold">Job Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="jobName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {JOB_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select urgency level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {URGENCY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {TasksDisplay}

            {watchedJobName === "Custom Service" && (
              <FormField
                control={form.control}
                name="selectedTasks"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base font-semibold">
                        Select Custom Tasks
                      </FormLabel>
                    </div>
                    <div className="space-y-2 rounded-md border p-4">
                      {Object.entries(ALL_TASKS).map(([taskId, taskInfo]) => (
                        <FormField
                          key={taskId}
                          control={form.control}
                          name="selectedTasks"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(taskId)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...(field.value ?? []),
                                          taskId,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== taskId,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {taskInfo.name}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Job"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
