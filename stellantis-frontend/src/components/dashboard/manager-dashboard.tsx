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
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import type { EngineerProfile, JobTask, JobHistoryTask } from "@/lib/types";

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
    <Card className="min-w-[130px] flex-1">
      <CardContent className="flex flex-col items-center py-4">
        <div className="text-2xl font-bold" style={color ? { color } : {}}>
          {value}
        </div>
        <div className="text-muted-foreground text-xs">{label}</div>
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
    tasksPending: number;
    tasksCompletedToday: number;
    avgOutcomeScore: string;
    tasksPerStatus: { status: string; count: number }[];
    tasksPerType: { type: string; value: number }[];
    tasksPerDay: { date: string; completed: number }[];
    topEngineers: { name: string; count: number }[];
  }>(null);

  React.useEffect(() => {
    async function fetchData() {
      // Fetch and type the data
      const engineers: EngineerProfile[] = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers`,
      ).then((r) => r.json());
      const jobs: JobTask[] = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/jobs`,
      ).then((r) => r.json());
      const jobHistory: JobHistoryTask[] = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/job-history`,
      ).then((r) => r.json());

      // --- Compute KPIs ---
      const totalEngineers = engineers.length;
      const allTasks = [
        ...jobs.map((t) => ({ ...t, Status: t.Status })),
        ...jobHistory.map((t) => ({
          ...t,
          Status: "Completed" as const,
          Task_Description: t.task_description,
          Outcome_Score: t.outcome_score,
        })),
      ];
      const totalTasks = allTasks.length;
      const tasksInProgress = allTasks.filter(
        (t) => t.Status === "In Progress",
      ).length;
      const tasksPending = allTasks.filter(
        (t) => t.Status === "Pending",
      ).length;

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const tasksCompletedToday = jobHistory.filter(
        (t) => t.date_completed?.slice(0, 10) === todayStr,
      ).length;
      const outcomeScores = jobHistory
        .map((t) => t.outcome_score)
        .filter((n): n is number => typeof n === "number");
      const avgOutcomeScore = outcomeScores.length
        ? (
            outcomeScores.reduce((a, b) => a + b, 0) / outcomeScores.length
          ).toFixed(2)
        : "N/A";

      // --- Chart Data ---
      // Tasks per Status
      const statuses = ["Pending", "Assigned", "In Progress", "Completed"];
      const tasksPerStatus = statuses.map((status) => ({
        status,
        count: allTasks.filter((t) => t.Status === status).length,
      }));

      // Tasks per Type (Pie)
      const taskTypeMap: Record<string, number> = {};
      allTasks.forEach((t) => {
        const desc = t.Task_Description;
        if (!desc) return;
        taskTypeMap[desc] = (taskTypeMap[desc] ?? 0) + 1;
      });
      const tasksPerType = Object.entries(taskTypeMap)
        .map(([type, value]) => ({ type, value }))
        .sort((a, b) => b.value - a.value);

      // Tasks Completed per Day (Line)
      const last30Days = Array.from({ length: 30 }).map((_, i) =>
        format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
      );
      const tasksPerDay = last30Days.map((date) => ({
        date: format(parseISO(date), "MMM d"),
        completed: jobHistory.filter(
          (t) => t.date_completed?.slice(0, 10) === date,
        ).length,
      }));

      // Top Engineers (Horizontal Bar)
      const engineerTaskCount: Record<string, number> = {};
      jobHistory.forEach((t) => {
        if (!t.engineer_name) return;
        engineerTaskCount[t.engineer_name] =
          (engineerTaskCount[t.engineer_name] ?? 0) + 1;
      });
      const topEngineers = Object.entries(engineerTaskCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setData({
        totalEngineers,
        totalTasks,
        tasksInProgress,
        tasksPending,
        tasksCompletedToday,
        avgOutcomeScore,
        tasksPerStatus,
        tasksPerType,
        tasksPerDay,
        topEngineers,
      });
      setLoading(false);
    }
    void fetchData();
  }, []);
  return { loading, data };
}

// --- COLORS ---
const STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308",
  Assigned: "#3b82f6",
  "In Progress": "#06b6d4",
  Completed: "#22c55e",
};
const TASK_TYPE_COLORS = [
  "hsl(227, 57%, 33%)",
  "#22c55e",
  "#eab308",
  "#a21caf",
  "#6366f1",
  "#f97316",
];

export default function DashboardPage() {
  const { loading, data } = useDashboardData();

  if (loading || !data) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of shop activity, engineer performance, and task flow.
        </p>
      </div>

      {/* --- KPI WIDGETS --- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <KPI
          label="Total Engineers"
          value={data.totalEngineers}
          color="#6366f1"
        />
        <KPI label="Total Tasks" value={data.totalTasks} color={PRIMARY} />
        <KPI label="In Progress" value={data.tasksInProgress} color="#06b6d4" />
        <KPI
          label="Pending Assignment"
          value={data.tasksPending}
          color="#eab308"
        />
        <KPI
          label="Completed Today"
          value={data.tasksCompletedToday}
          color="#22c55e"
        />
        <KPI
          label="Avg. Outcome Score"
          value={data.avgOutcomeScore}
          color="#a21caf"
        />
      </div>

      {/* --- CHARTS --- */}
      <div className="">
        {/* Task Type Distribution (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Task Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.tasksPerType}
                  dataKey="value"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.tasksPerType.map((entry, idx) => (
                    <Cell
                      key={entry.type}
                      fill={TASK_TYPE_COLORS[idx % TASK_TYPE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Completed Over Time (Line Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Completed per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.tasksPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={8} />
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

      {/* Top Engineers (Horizontal Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Top Engineers by Tasks Completed</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topEngineers} layout="vertical">
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill={PRIMARY} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
