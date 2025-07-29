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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend, // ADDED: Legend for Pie Chart
} from "recharts";
import { format, subDays, parseISO, isToday } from "date-fns"; // ADDED: isToday
import type { EngineerProfile, JobTask, JobHistoryTask } from "@/lib/types";
import { ActiveTasksTable } from "./active-tasks-table";

// --- PRIMARY COLOR ---
const PRIMARY = "hsl(227, 57%, 33%)";

// --- KPI Card ---
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
    // CHANGED: Responsive min-width for better stacking on small screens.
    <Card className="min-w-0 flex-1">
      <CardContent className="flex flex-col items-center py-4">
        {/* CHANGED: Responsive font size for value. */}
        <div
          className="text-xl font-bold sm:text-2xl"
          style={color ? { color } : {}}
        >
          {value}
        </div>
        {/* CHANGED: Smaller text for label. */}
        <div className="text-muted-foreground text-center text-xs">{label}</div>
      </CardContent>
    </Card>
  );
}

// --- Fetch Dashboard Data ---
function useDashboardData() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<null | {
    totalEngineers: number;
    totalTasks: number;
    tasksInProgress: number;
    tasksAssigned: number;
    tasksCompletedToday: number;
    avgOutcomeScoreToday: string;
    tasksPerStatus: { status: string; count: number }[];
    tasksPerTypeToday: { type: string; value: number }[];
    tasksCompletedLast7Days: { date: string; completed: number }[];
    activeTasksList: JobTask[];
  }>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [engineersRes, jobsRes, jobHistoryRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers`),
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs`),
          fetch(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/job-history`),
        ]);

        const engineers: EngineerProfile[] = await engineersRes.json();
        const jobs: JobTask[] = await jobsRes.json();
        const jobHistory: JobHistoryTask[] = await jobHistoryRes.json();

        // --- Compute KPIs ---
        const totalEngineers = engineers.length;
        const activeTasks = jobs.filter(
          (t) => (t.Status as string) !== "Completed",
        );
        const totalTasks = activeTasks.length;
        const tasksInProgress = activeTasks.filter(
          (t) => t.Status === "In Progress",
        ).length;
        const tasksAssigned = activeTasks.filter(
          (t) => t.Status === "Assigned",
        ).length;

        const today = new Date();
        const tasksCompletedToday = jobHistory.filter(
          (t) => t.date_completed && isToday(parseISO(t.date_completed)),
        ).length;

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

        // --- Chart Data ---
        const currentStatuses = ["Pending", "Assigned", "In Progress"];
        const tasksPerStatus = currentStatuses.map((status) => ({
          status,
          count: activeTasks.filter((t) => t.Status === status).length,
        }));
        tasksPerStatus.push({
          status: "Completed Today",
          count: tasksCompletedToday,
        });

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

        const last7Days = Array.from({ length: 7 }).map((_, i) =>
          format(subDays(today, 6 - i), "yyyy-MM-dd"),
        );
        const tasksCompletedLast7Days = last7Days.map((date) => ({
          date: format(parseISO(date), "MMM d"),
          completed: jobHistory.filter(
            (t) => t.date_completed?.slice(0, 10) === date,
          ).length,
        }));

        const activeTasksList = jobs.filter(
          (task) => task.Status === "Assigned" || task.Status === "In Progress",
        );

        setData({
          totalEngineers,
          totalTasks,
          tasksInProgress,
          tasksAssigned,
          tasksCompletedToday,
          avgOutcomeScoreToday,
          tasksPerStatus,
          tasksPerTypeToday,
          tasksCompletedLast7Days,
          activeTasksList,
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        setLoading(false);
      }
    }
    void fetchData();
  }, []); // Empty dependency array means this runs once on component mount
  return { loading, data };
}

// --- COLORS ---
const STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308",
  Assigned: "#3b82f6",
  "In Progress": "#06b6d4",
  "Completed Today": "#22c55e", // Changed to reflect daily context
};
const TASK_TYPE_COLORS = [
  "hsl(227, 57%, 33%)",
  "#22c55e",
  "#eab308",
  "#a21caf",
  "#6366f1",
  "#f97316",
  "#ef4444", // More colors for variety
  "#8b5cf6",
  "#14b8a6",
];

export default function DashboardPage() {
  const { loading, data } = useDashboardData();

  if (loading || !data) {
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
    // ADDED: Responsive padding for the main container.
    <div className="space-y-8 p-2 sm:p-6">
      <div>
        {/* CHANGED: Responsive font size for main heading. */}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Manager Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of shop activity, engineer performance, and task flow for
          today.
        </p>
      </div>

      {/* --- KPI WIDGETS --- */}
      {/* CHANGED: Responsive grid for KPIs. Stacks more on smaller screens. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <KPI
          label="Total Engineers"
          value={data.totalEngineers}
          color="#6366f1"
        />
        {/* Renamed "Total Tasks" to "Total Active Tasks" for clarity */}
        <KPI label="Active Tasks" value={data.totalTasks} color={PRIMARY} />
        <KPI label="In Progress" value={data.tasksInProgress} color="#06b6d4" />
        {/* ADDED: KPI for Tasks Assigned */}
        <KPI label="Assigned" value={data.tasksAssigned} color="#3b82f6" />
        <KPI
          label="Completed Today"
          value={data.tasksCompletedToday}
          color="#22c55e"
        />
        {/* CHANGED: KPI for Avg. Outcome Score Today */}
        <KPI
          label="Avg. Outcome Today"
          value={data.avgOutcomeScoreToday}
          color="#a21caf"
        />
      </div>

      {/* --- CHARTS --- */}
      {/* ADDED: Grid container for the first two charts to sit side-by-side on larger screens. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Task Status Distribution (Bar Chart for current statuses) */}
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
                  {data.tasksPerStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Type Distribution Today (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Task Types Completed Today</CardTitle>
            <CardDescription>
              Distribution of task types finished this day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.tasksPerTypeToday.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.tasksPerTypeToday}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    labelLine={false} // Hide label lines for cleaner look
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {data.tasksPerTypeToday.map((entry, idx) => (
                      <Cell
                        key={entry.type}
                        fill={TASK_TYPE_COLORS[idx % TASK_TYPE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend /> {/* ADDED: Legend for Pie Chart */}
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center">
                No tasks completed today to show distribution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks Completed Over Last 7 Days (Line Chart) */}
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
      <Card>
        <CardHeader>
          <CardTitle>Active Tasks</CardTitle>
          <CardDescription>
            A real-time list of tasks that are currently assigned or in
            progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveTasksTable tasks={data.activeTasksList} />
        </CardContent>
      </Card>
    </div>
  );
}
