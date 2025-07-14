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
import { Textarea } from "../ui/textarea";
import { getTaskIdsFromNames } from "@/lib/utils";

type NewJobFormValues = z.infer<typeof newJobFormSchema>;

const jobTypeToTaskNames: Record<(typeof JOB_TYPES)[number], string[]> = {
  "Basic Service": BASIC_SERVICE_TASK_IDS.map(
    (id) => ALL_TASKS[id as keyof typeof ALL_TASKS].name,
  ),
  "Intermediate Service": INTERMEDIATE_SERVICE_TASK_IDS.map(
    (id) => ALL_TASKS[id as keyof typeof ALL_TASKS].name,
  ),
  "Full Service": FULL_SERVICE_TASK_IDS.map(
    (id) => ALL_TASKS[id as keyof typeof ALL_TASKS].name,
  ),
  "Custom Service": [],
};

export function NewJobForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<string[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<
    (typeof JOB_TYPES)[number] | "Custom Service"
  >("Custom Service");

  const form = useForm<NewJobFormValues>({
    resolver: zodResolver(newJobFormSchema),
    defaultValues: {
      vin: "",
      make: "",
      model: "",
      mileage: 0,
      urgency: "Normal",
      jobType: "Custom Service",
      selectedTasks: [],
      description: undefined,
    },
  });

  const { watch, setValue } = form;
  const watchedDescription = watch("description");
  const watchedJobType = watch("jobType");

  useEffect(() => {
    // Only reset tasks if a PRESET is selected.
    // If "Custom Service" is selected, leave the tasks as they are.
    if (watchedJobType && watchedJobType !== "Custom Service") {
      const presetTasks = jobTypeToTaskNames[watchedJobType] ?? [];
      setValue("selectedTasks", presetTasks, { shouldValidate: true });
    }
    // Always update the visual header
    setSelectedJobType(watchedJobType);
  }, [watchedJobType, setValue]);

  async function handleAnalyzeProblems() {
    if (!watchedDescription?.trim()) {
      toast.error("Please enter a problem description first.");
      return;
    }
    setIsMapping(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/mapping-services`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: watchedDescription }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to map description to tasks.");
      }
      const data = await res.json();
      if (Array.isArray(data.services)) {
        const aiSuggestedNames = data.services as string[];
        const currentSelectedTasks = form.getValues("selectedTasks") ?? [];

        // Combine current selected tasks (including presets) with AI suggested tasks
        const mergedTasks = Array.from(
          new Set([...currentSelectedTasks, ...aiSuggestedNames]),
        );

        setValue("selectedTasks", mergedTasks, { shouldValidate: true });
        setAiSuggestedTasks(aiSuggestedNames); // Keep track of just AI suggested for messaging

        // Determine if the job type needs to change to "Custom Service"
        const currentPresetTasks = jobTypeToTaskNames[watchedJobType] || [];
        const hasNewTasksBeyondPreset = aiSuggestedNames.some(
          (taskName: string) => !currentPresetTasks.includes(taskName),
        );
        console.log(
          selectedJobType,
          watchedJobType,
          hasNewTasksBeyondPreset,
          form.getValues("selectedTasks"),
        );
        if (hasNewTasksBeyondPreset) {
          setValue("jobType", "Custom Service");
          setSelectedJobType("Custom Service"); // Update local state for rendering headers
          toast.success(
            "Tasks mapped and merged. Job type set to Custom Service.",
          );
        } else {
          toast.success("Tasks mapped and merged with existing preset.");
        }
      } else {
        toast.error("No tasks returned from mapping.");
      }
    } catch (e) {
      toast.error("Could not map description to tasks.");
    } finally {
      setIsMapping(false);
    }
  }

  async function onSubmit(data: NewJobFormValues) {
    setIsSubmitting(true);
    toast.info("Step 1: Creating job and tasks in the database...");
    if (data.selectedTasks === undefined || data.selectedTasks.length === 0) {
      toast.error("Cannot create a job with no tasks selected.");
      setIsSubmitting(false);
      return;
    }

    const ids = getTaskIdsFromNames(data.selectedTasks);
    const initialPayload = {
      jobName: data.jobType ?? "Custom Service",
      vin: data.vin,
      make: data.make,
      model: data.model,
      mileage: data.mileage,
      urgency: data.urgency,
      selectedTasks: ids,
    };

    let generatedJobId: string | null = null;

    try {
      // --- STAGE 1: CREATE THE JOB AND TASKS ---
      const createJobResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/create-job`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initialPayload),
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
      generatedJobId = createJobResult.job_id;

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
          body: JSON.stringify({ job_card_id: generatedJobId }),
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
          task_id: string;
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
        toast.warning(
          `${successes} tasks were assigned, but ${failures} could not be assigned.`,
        );
      }

      form.reset();
      setSelectedJobType("Custom Service");
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

  const presetTaskNames = useMemo(
    () => jobTypeToTaskNames[selectedJobType] || [],
    [selectedJobType],
  );
  const addonTasks = useMemo(
    () =>
      Object.values(ALL_TASKS).filter(
        (task) => !presetTaskNames.includes(task.name),
      ),
    [presetTaskNames],
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>New Car & Job Intake</CardTitle>
        <CardDescription>
          Enter car details and describe the problems. Tasks can be selected
          from a preset or suggested automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log("Form validation errors:", errors);
            })}
            className="space-y-8"
          >
            {/* Car Details */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">Car Details</h3>
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
                        <Input
                          type="number"
                          placeholder="50000"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
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

            {/* Problem Description & Urgency */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">
                Service Details & Urgency
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Describe Additional Problems</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any other issues..."
                          className="max-h-40"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex w-full flex-col space-y-4">
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Job Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={selectedJobType}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-full">
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
                      <FormItem className="w-full">
                        <FormLabel>Urgency</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select urgency" />
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
              <div className="mt-4 flex">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAnalyzeProblems}
                  disabled={isMapping || !watchedDescription?.trim()}
                >
                  {isMapping ? "Analyzing..." : "Analyze & Add Tasks"}
                </Button>
                {aiSuggestedTasks.length > 0 && (
                  <span className="ml-4 flex items-center gap-1 text-sm text-green-600">
                    Tasks suggested! Please review below.
                  </span>
                )}
              </div>
            </div>

            <Separator />

            {/* Task Selection */}
            <div>
              <h3 className="mb-4 text-lg font-semibold">
                {selectedJobType} Tasks
              </h3>
              <div className="bg-muted/30 space-y-2 rounded-md border p-4">
                {presetTaskNames.length > 0 ? (
                  presetTaskNames.map((taskName) => (
                    <FormItem
                      key={taskName}
                      className="flex flex-row items-start space-y-0 space-x-3"
                    >
                      <FormControl>
                        <Checkbox checked={true} disabled />
                      </FormControl>
                      <FormLabel className="font-normal">{taskName}</FormLabel>
                    </FormItem>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No preset tasks for this selection. Choose from the add-ons
                    below or describe the problem.
                  </p>
                )}
              </div>

              {addonTasks.length > 0 && (
                <>
                  <h3 className="mt-6 mb-4 text-lg font-semibold">Add-ons</h3>
                  <div className="bg-muted/30 space-y-2 rounded-md border p-4">
                    {addonTasks.map((taskInfo) => {
                      return (
                        <FormField
                          key={taskInfo.name}
                          control={form.control}
                          name="selectedTasks"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(taskInfo.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...(field.value ?? []),
                                          taskInfo.name,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== taskInfo.name,
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
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Job"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
