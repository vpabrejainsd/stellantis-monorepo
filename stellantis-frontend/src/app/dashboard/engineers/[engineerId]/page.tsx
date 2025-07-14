// src/app/dashboard/engineers/[engineerId]/page.tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { type EngineerProfile, type EnrichedEngineerTask } from "@/lib/types";
import { EngineerHeader } from "@/components/dashboard/engineer-header";
import { EngineerPerformanceLineChart } from "@/components/dashboard/engineer-performance-line-chart";
import { EngineerSkillsRadarChart } from "@/components/dashboard/engineer-skills-radar-chart";
import { EngineerTasksTable } from "@/components/dashboard/engineer-tasks-table"; // NEW IMPORT
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EngineerTaskFrequencyChart } from "@/components/dashboard/tasks-frequency-chart";
import { EngineerTaskPerformanceChart } from "@/components/dashboard/engineer-task-performance-line-chart";

export default function EngineerDetailPage() {
  const params = useParams();
  const engineerId = params.engineerId as string;

  const [engineer, setEngineer] = React.useState<EngineerProfile | null>(null);
  const [tasks, setTasks] = React.useState<EnrichedEngineerTask[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!engineerId) return;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch from the new /engineers/<engineer_id>/details endpoint
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers/${engineerId}/details`,
        );
        if (!res.ok) throw new Error("Failed to load data for engineer.");

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const enrichedTasks: EnrichedEngineerTask[] = await res.json();

        // Extract the engineer profile from the first task if tasks exist
        if (enrichedTasks.length > 0) {
          // All enrichedTasks will have the same engineer profile embedded
          setEngineer(enrichedTasks[0] as EngineerProfile);
          setTasks(enrichedTasks);
        } else {
          // If engineer has no tasks, fetch their profile separately
          const profileRes = await fetch(
            `${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers/${engineerId}`,
          );
          if (!profileRes.ok)
            throw new Error(`Could not find engineer with ID ${engineerId}`);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          setEngineer(await profileRes.json());
          setTasks([]); // No tasks for this engineer
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    void fetchData();
  }, [engineerId]);

  const processedData = React.useMemo(() => {
    if (!tasks.length && !engineer) {
      // Handle case where engineer has no tasks and profile fetched separately
      return {
        stats: {
          tasksInProgress: 0,
          tasksCompleted: 0,
          timesExceededEstimate: 0,
        },
        lineChartData: [],
        radarChartData: [],
        taskFrequencyChartData: [],
      };
    }

    const tasksCompleted = tasks.filter((t) => t.Status === "Completed").length;
    const tasksInProgress = tasks.filter(
      (t) => t.Status === "In Progress",
    ).length;
    const timesExceededEstimate = tasks.filter(
      (t) =>
        t.Time_Taken_minutes != null &&
        t.Time_Taken_minutes > t.Estimated_Standard_Time,
    ).length;
    const lineChartData = tasks
      .filter(
        (t) =>
          t.Status === "Completed" && t.Outcome_Score != null && t.Time_Started,
      )
      .map((t) => ({
        date: format(parseISO(t.Time_Started), "MMM dd"),
        score: t.Outcome_Score!,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-50);

    // Prepare data for Radar Chart
    const skillScores = engineer
      ? Object.entries(engineer)
          .filter(
            ([key, value]) =>
              key.endsWith("_Score") &&
              !key.startsWith("Overall") &&
              key !== "Outcome_Score" &&
              typeof value === "number",
          )
          .map(([key, value]) => ({
            subject: key.replace(/_/g, " ").replace(" Score", ""), // Prettify the label
            score: Math.round(value as number),
          }))
      : [];
    const taskFrequency = tasks
      .filter((t) => t.Status === "Completed")
      .reduce(
        (acc, task) => {
          acc[task.Task_Description] = (acc[task.Task_Description] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    const taskFrequencyChartData = Object.entries(taskFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by most frequent

    const frequencyChartHeight = Math.max(
      600,
      taskFrequencyChartData.length * 45,
    );

    return {
      stats: { tasksInProgress, tasksCompleted, timesExceededEstimate },
      lineChartData,
      radarChartData: skillScores,
      taskFrequencyChartData,
      taskFrequencyChartHeight: frequencyChartHeight,
    };
  }, [tasks, engineer]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive text-center">{error}</div>;
  }
  if (!engineer) {
    return (
      <div className="text-muted-foreground text-center">
        No engineer data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EngineerHeader engineer={engineer} stats={processedData.stats} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Performance by Task Type</CardTitle>
            <CardDescription>
              View this engineer&apos;s outcome scores for a selected task type
              over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EngineerTaskPerformanceChart tasks={tasks} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Skill Proficiency</CardTitle>
            <CardDescription>
              Average performance score across different task types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EngineerSkillsRadarChart data={processedData.radarChartData} />
          </CardContent>
        </Card>
      </div>
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>
            Outcome score of the last 50 completed tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineerPerformanceLineChart data={processedData.lineChartData} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Frequency</CardTitle>
          <CardDescription>
            A breakdown of how many times {engineer.Engineer_Name} has completed
            each type of task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineerTaskFrequencyChart
            data={processedData.taskFrequencyChartData}
            height={processedData.taskFrequencyChartHeight}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>
            Overview of all tasks handled by {engineer.Engineer_Name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EngineerTasksTable tasks={tasks} />{" "}
          {/* NEW: Display the tasks table */}
        </CardContent>
      </Card>
    </div>
  );
}
