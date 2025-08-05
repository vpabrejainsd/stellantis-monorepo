/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app/dashboard/page.tsx
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import {
  startOfToday,
  addHours,
  format,
  subDays,
  parseISO,
  isToday,
} from "date-fns";
import type { EngineerProfile, JobTask, JobHistoryTask } from "@/lib/types";
import { ActiveTasksTable } from "./active-tasks-table";
import { Car } from "lucide-react";

// --- Theme Colors ---
const PRIMARY = "hsl(227, 57%, 33%)";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308",
  Assigned: "#3b82f6",
  "In Progress": "#06b6d4",
  Completed: "#22c55e",
};

// --- KPI Card Component ---
// Simple reusable KPI tile with label, value, and optional color
function KPI({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <Card className="min-w-0 flex-1">
      <CardContent className="flex flex-col items-center py-4">
        <div
          className="text-xl font-bold sm:text-2xl"
          style={color ? { color } : undefined}
        >
          {value}
        </div>
        <div className="text-muted-foreground text-center text-xs">{label}</div>
      </CardContent>
    </Card>
  );
}

// --- Dashboard Data Fetching & Preparation ---
// Fetch engineers, jobs, job history, and prepare dashboard data
function useDashboardData() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<null | {
    totalEngineers: number;
    totalTasks: number;
    carsInGarage: number;
    tasksInProgress: number;
    tasksAssigned: number;
    tasksCompletedToday: number;
    avgOutcomeScoreToday: string;
    totalJobCardsCreatedToday: number;
    activeJobCardsToday: number;
    totalTasksCreated: number;
    activePendingAssignedTasks: number;
    tasksPerStatus: { status: string; count: number }[];
    tasksPerTypeToday: { type: string; value: number }[];
    tasksCompletedLast7Days: { date: string; completed: number }[];
    hourlyStats: { hour: string; created: number; completed: number }[];
    activeTasksList: JobTask[];
  }>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all relevant data in parallel
        const [engineersRes, jobsRes, jobHistoryRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers`),
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs`),
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/job-history`),
        ]);

        const engineers: EngineerProfile[] = await engineersRes.json();
        const jobs: JobTask[] = await jobsRes.json();
        const jobHistory: JobHistoryTask[] = await jobHistoryRes.json();
        const todayStr = format(new Date(), "yyyy-MM-dd");
        // All Job IDs created today from jobs and history
        const jobsCreatedTodaySet = new Set([
          // From active jobs:
          ...jobs
            .filter((j) => j.Date_Created?.startsWith(todayStr))
            .map((j) => j.Job_Id),
          // From completed jobs (history)—assuming time_started exists in history:
          ...jobHistory
            .filter((j) => j.time_started?.startsWith(todayStr))
            .map((j) => j.job_id),
        ]);
        const totalJobCardsCreatedToday = jobsCreatedTodaySet.size;

        // Determine which of today's Job Cards are still "active"
        const activeJobCardsTodaySet = new Set(
          jobs
            .filter(
              (j) =>
                j.Date_Created &&
                j.Date_Created.startsWith(todayStr) &&
                j.Status !== "Completed",
            )
            .map((j) => j.Job_Id),
        );
        const activeJobCardsToday = activeJobCardsTodaySet.size;
        // Filter active tasks created today
        const activeJobsCreatedToday = jobs.filter((task) =>
          task.Date_Created?.startsWith(todayStr),
        );

        // Filter completed tasks created today — from job history,
        // assuming jobHistory has a field for task creation date/time, e.g. time_started
        const completedJobsCreatedToday = jobHistory.filter((task) =>
          task.time_started?.startsWith(todayStr),
        );

        const totalTasksCreated =
          activeJobsCreatedToday.length + completedJobsCreatedToday.length;
        const activeJobs = jobs.filter((t) => t.Status !== "Completed");

        const activePendingAssignedTasks = jobs.filter(
          (task) => task.Status === "Pending" || task.Status === "Assigned",
        ).length;

        const carsInGarageSet = new Set(activeJobs.map((job) => job.VIN));
        const carsInGarage = carsInGarageSet.size;

        // --- Compute KPIs ---
        const totalEngineers = engineers.length;
        const totalTasks = activeJobs.length;
        const tasksInProgress = activeJobs.filter(
          (t) => t.Status === "In Progress",
        ).length;
        const tasksAssigned = activeJobs.filter(
          (t) => t.Status === "Assigned",
        ).length;

        const today = new Date();

        // Count tasks completed today
        const tasksCompletedToday = jobHistory.filter(
          (t) => t.date_completed && isToday(parseISO(t.date_completed)),
        ).length;

        // Average outcome score for tasks completed today
        const outcomeScoresToday = jobHistory
          .filter(
            (t) => t.date_completed && isToday(parseISO(t.date_completed)),
          )
          .map((t) => t.outcome_score)
          .filter((n): n is number => typeof n === "number");
        const avgOutcomeScoreToday = outcomeScoresToday.length
          ? (
              outcomeScoresToday.reduce((a, b) => a + b, 0) /
              outcomeScoresToday.length
            ).toFixed(2)
          : "N/A";

        // --- Prepare Hourly Stats for Today ---
        // Tasks created and completed per hour
        const hourlyStats: {
          hour: string;
          created: number;
          completed: number;
        }[] = [];
        const now = new Date();
        const start = startOfToday();
        const maxHour = now.getHours();

        for (let h = 0; h <= maxHour; h++) {
          const hourStart = addHours(start, h);
          const label = format(hourStart, "h a"); // e.g. "8 AM"

          // Tasks created in this hour (based on Date_Created)
          const createdCount = jobs.filter(
            (job) =>
              job.Date_Created &&
              isToday(parseISO(job.Date_Created)) &&
              parseISO(job.Date_Created).getHours() === h,
          ).length;

          // Tasks completed in this hour
          const completedCount = jobHistory.filter(
            (job) =>
              job.date_completed &&
              isToday(parseISO(job.date_completed)) &&
              parseISO(job.date_completed).getHours() === h,
          ).length;

          hourlyStats.push({
            hour: label,
            created: createdCount,
            completed: completedCount,
          });
        }

        // --- Chart Data: Tasks per Status ---
        const currentStatuses = ["Pending", "Assigned", "In Progress"];
        const tasksPerStatus = currentStatuses.map((status) => ({
          status,
          count: activeJobs.filter((t) => t.Status === status).length,
        }));

        // Add today's completed as separate bar
        tasksPerStatus.push({
          status: "Completed",
          count: tasksCompletedToday,
        });

        // --- Chart Data: Task Types Completed Today ---
        const taskTypeMapToday: Record<string, number> = {};
        jobHistory
          .filter(
            (t) => t.date_completed && isToday(parseISO(t.date_completed)),
          )
          .forEach((t) => {
            const desc = t.task_description;
            if (!desc) return;
            taskTypeMapToday[desc] = (taskTypeMapToday[desc] ?? 0) + 1;
          });

        const tasksPerTypeToday = Object.entries(taskTypeMapToday)
          .map(([type, value]) => ({ type, value }))
          .sort((a, b) => b.value - a.value);

        // --- Chart Data: Tasks Completed Last 7 Days ---
        const last7Days = Array.from({ length: 7 }).map((_, i) =>
          format(subDays(today, 6 - i), "yyyy-MM-dd"),
        );
        const tasksCompletedLast7Days = last7Days.map((date) => ({
          date: format(parseISO(date), "MMM d"),
          completed: jobHistory.filter(
            (t) => t.date_completed?.slice(0, 10) === date,
          ).length,
        }));

        // --- Active Tasks List (Show all assigned or in progress tasks) ---
        const activeTasksList = jobs.filter(
          (task) => task.Status === "Assigned" || task.Status === "In Progress",
        );

        // --- Set all fetched and processed data to state ---
        setData({
          totalEngineers,
          totalTasks,
          activePendingAssignedTasks,
          carsInGarage,
          tasksInProgress,
          tasksAssigned,
          totalJobCardsCreatedToday,
          activeJobCardsToday,
          tasksCompletedToday,
          avgOutcomeScoreToday,
          tasksPerStatus,
          totalTasksCreated,
          tasksPerTypeToday,
          tasksCompletedLast7Days,
          hourlyStats,
          activeTasksList,
        });

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  return { loading, data };
}

// --- Main Dashboard Page ---
export default function DashboardPage() {
  const { loading, data } = useDashboardData();

  if (loading || !data) {
    // Loading skeleton placeholders
    return (
      <div className="space-y-6 p-2 sm:p-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    // Main dashboard container with responsive padding
    <div className="space-y-8 p-2 sm:p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Manager Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of shop activity, engineer performance, and task flow for
          today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <KPI
          label="Total Engineers"
          value={data.totalEngineers}
          color="#6366f1"
        />
        <KPI
          label="Job Cards Created"
          value={data.totalJobCardsCreatedToday}
          color="#a21caf"
        />
        <KPI
          label="Active Job Cards"
          value={data.activeJobCardsToday}
          color="#06b6d4"
        />
        <KPI
          label="Tasks Created"
          value={data.totalTasksCreated}
          color={PRIMARY}
        />
        <KPI
          label="Tasks in Queue"
          value={data.activePendingAssignedTasks}
          color="#f97316"
        />

        <KPI
          label="Tasks in Progress"
          value={data.tasksInProgress}
          color="#06b6d4"
        />
        <KPI
          label="Tasks Assigned"
          value={data.tasksAssigned}
          color="#3b82f6"
        />
        <KPI
          label="Tasks Completed"
          value={data.tasksCompletedToday}
          color="#22c55e"
        />
        <KPI
          label="Average Outcome"
          value={data.avgOutcomeScoreToday}
          color="#a21caf"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4">
        {/* Current Task Status Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Current Task Status</CardTitle>
            <CardDescription>
              Breakdown of active task statuses and tasks completed today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.tasksPerStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={PRIMARY}>
                  {data.tasksPerStatus.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={STATUS_COLORS[entry.status]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Today's Task Flow Line Chart (Created & Completed per Hour) */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Task Flow</CardTitle>
            <CardDescription>
              Number of tasks created and completed per hour today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.hourlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.hourlyStats}
                  margin={{ top: 8, right: 24, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Created"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                No task activity yet today.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Types Completed Today Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Task Types Completed Today</CardTitle>
            <CardDescription>
              Number of each task type completed today, by count.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.tasksPerTypeToday.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart layout="vertical" data={data.tasksPerTypeToday}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill={PRIMARY} barSize={20}>
                    {data.tasksPerTypeToday.map((entry) => (
                      <Cell key={entry.type} fill={PRIMARY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                No tasks completed today to show distribution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Completed Last 7 Days Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Completed Last 7 Days</CardTitle>
          <CardDescription>Daily count of tasks completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.tasksCompletedLast7Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={1} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="completed"
                stroke={PRIMARY}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Active Tasks Table: Assigned or In Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>
            A real-time list of tasks currently assigned or in progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveTasksTable tasks={data.activeTasksList} />
        </CardContent>
      </Card>
    </div>
  );
}
