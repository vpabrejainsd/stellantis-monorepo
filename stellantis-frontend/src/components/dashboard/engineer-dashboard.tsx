/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format, parseISO, subDays } from "date-fns";
import { useUser } from "@/hooks/use-user"; // Your new hook
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Star,
  Target,
  TrendingUp,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import type {
  EngineerActiveTask,
  EngineerCompletedTask,
  EngineerDashboardResponse,
  PerformanceChartData,
  TaskStatusChart,
  TaskUrgencyChart,
} from "@/lib/types";
import StartTaskAction from "./start-task-action";
import EngineerStartTaskAction from "./engineer-start-task";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";

// Theme Colors
const PRIMARY = "hsl(227, 57%, 33%)";
const SECONDARY = "hsl(142, 71%, 45%)";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308",
  Assigned: "#3b82f6",
  "In Progress": "#06b6d4",
  Completed: "#22c55e",
};

const URGENCY_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f97316",
  Low: "#22c55e",
};

// KPI Card Component
function KPI({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  color?: string;
  icon?: React.ElementType;
}) {
  return (
    <Card className="min-w-0 flex-1">
      <CardContent className="flex flex-col items-center py-4">
        {Icon && <Icon className="text-muted-foreground mb-2 h-6 w-6" />}
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

// Engineer Dashboard Data Hook
function useEngineerDashboard() {
  const { user } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<EngineerDashboardResponse | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!user?.engineer_id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineer-dashboard/${user.engineer_id}`,
        { method: "GET", cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch engineer dashboard data");
      }

      const result: EngineerDashboardResponse = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch engineer dashboard data:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.engineer_id]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { loading, data, error, refetch: fetchData };
}

// Active Tasks Table Component
function MyTasksTable({
  tasks,
  onTaskUpdate,
}: {
  tasks: EngineerActiveTask[];
  onTaskUpdate: () => void;
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <Target className="mx-auto mb-2 h-12 w-12 opacity-50" />
        <p>No active task assigned to you</p>
        <p className="text-xs">New task will appear here when assigned</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">Task</TableHead>
            <TableHead className="text-left">Vehicle</TableHead>
            <TableHead className="text-left">Status</TableHead>
            <TableHead className="text-left">Urgency</TableHead>
            <TableHead className="text-left">Est. Time</TableHead>
            <TableHead className="text-left">Suitability</TableHead>
            <TableHead className="text-left">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, index) => (
            <TableRow key={index} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <div className="font-medium">{task.job_name}</div>
                  <div className="text-muted-foreground text-xs">
                    {task.task_description}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-xs">
                  <div>
                    {task.make} {task.model}
                  </div>
                  <div className="text-muted-foreground">
                    {task.vin?.slice(-6)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: STATUS_COLORS[task.status],
                    color: STATUS_COLORS[task.status],
                  }}
                >
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  style={{
                    borderColor: URGENCY_COLORS[task.urgency],
                    color: URGENCY_COLORS[task.urgency],
                  }}
                >
                  {task.urgency}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {task.estimated_time ? `${task.estimated_time} min` : "N/A"}
              </TableCell>
              <TableCell>
                <div className="text-xs">
                  {task.suitability_score
                    ? `${task.suitability_score.toFixed(2)}%`
                    : "N/A"}
                </div>
              </TableCell>
              <TableCell align="center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label={`Actions for job ${task.task_id}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <EngineerStartTaskAction
                      task={task}
                      onTaskStart={onTaskUpdate}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Recent Completed Tasks Component
function RecentCompletedTasks({ tasks }: { tasks: EngineerCompletedTask[] }) {
  const recentTasks = tasks.slice(0, 5); // Show only 5 most recent

  if (!recentTasks || recentTasks.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <Clock className="mx-auto mb-2 h-12 w-12 opacity-50" />
        <p>No completed tasks in the last 30 days</p>
        <p className="text-xs">Completed tasks will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentTasks.map((task, index) => (
        <div
          key={index}
          className="bg-muted/30 flex items-center justify-between rounded-lg p-3"
        >
          <div className="flex-1">
            <div className="text-sm font-medium">{task.task_description}</div>
            <div className="text-muted-foreground text-xs">
              Completed {format(parseISO(task.date_completed), "MMM d, h:mm a")}
            </div>
          </div>
          <div className="space-y-1 text-right text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.time_taken}m
            </div>
            <div className="text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" />
              {task.outcome_score}/5
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main Engineer Dashboard Component
export default function EngineerDashboard() {
  const { user, loading: userLoading } = useUser();
  const {
    loading: dashboardLoading,
    data,
    error,
    refetch,
  } = useEngineerDashboard();

  // Show loading while user data is being fetched
  if (userLoading) {
    return (
      <div className="space-y-6 p-2 sm:p-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Show message if user doesn't have engineer_id
  if (!user?.engineer_id) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">
                Engineer Profile Required
              </h3>
              <p className="text-muted-foreground">
                Your account needs to be linked to an engineer profile to view
                this dashboard.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Please contact your administrator to link your account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="mb-2 text-lg font-semibold">
                Error Loading Dashboard
              </h3>
              <p className="text-muted-foreground">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-primary mt-4 rounded-md px-4 py-2 text-white"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while dashboard data is being fetched
  if (dashboardLoading || !data) {
    return (
      <div className="space-y-6 p-2 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            My Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.first_name}! Loading your dashboard...
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const {
    engineer_profile,
    active_tasks,
    completed_tasks,
    todays_stats,
    performance_trend,
  } = data;

  // const tasksByStatus: TaskStatusChart[] = Object.entries(
  //   active_tasks.reduce((acc: Record<string, number>, task) => {
  //     acc[task.status] = (acc[task.status] ?? 0) + 1;
  //     return acc;
  //   }, {}),
  // ).map(([status, count]) => ({ status, count }));

  // const tasksByUrgency: TaskUrgencyChart[] = Object.entries(
  //   active_tasks.reduce((acc: Record<string, number>, task) => {
  //     acc[task.urgency] = (acc[task.urgency] ?? 0) + 1;
  //     return acc;
  //   }, {}),
  // ).map(([urgency, count]) => ({ urgency, count }));

  // Performance trend for last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) =>
    format(subDays(new Date(), 6 - i), "yyyy-MM-dd"),
  );

  // Performance chart data with proper typing
  const performanceChartData: PerformanceChartData[] = last7Days.map((date) => {
    const dayData = performance_trend.find((p) => p.date.startsWith(date));
    return {
      date: format(parseISO(date), "MMM d"),
      completed: dayData?.completed ?? 0,
      avgScore: dayData?.avg_score ?? 0,
    };
  });

  return (
    <div className="space-y-8 p-2 sm:p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          My Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {engineer_profile.name}! Here&apos;s your workload and
          performance overview.
        </p>
      </div>

      {/* Profile Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Experience</div>
              <div className="font-semibold">
                {engineer_profile.experience} years
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Specialization</div>
              <div className="font-semibold">
                {engineer_profile.specialization}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Customer Rating</div>
              <div className="flex items-center gap-1 font-semibold">
                <Star className="h-4 w-4 text-yellow-500" />
                {engineer_profile.customer_rating?.toFixed(1) || "N/A"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Availability</div>
              <Badge
                variant={
                  engineer_profile.availability === "Available"
                    ? "default"
                    : "secondary"
                }
              >
                {engineer_profile.availability}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPI
          label="Active Tasks"
          value={active_tasks.length}
          color={PRIMARY}
          icon={Target}
        />
        <KPI
          label="Completed Today"
          value={todays_stats.completed_count}
          color={SECONDARY}
          icon={TrendingUp}
        />
        <KPI
          label="Avg Completion Time"
          value={`${engineer_profile.avg_completion_time?.toFixed(0) || 0}m`}
          color="#f97316"
          icon={Clock}
        />
        <KPI
          label="Today's Avg Score"
          value={todays_stats.avg_outcome_score?.toFixed(1) || "N/A"}
          color="#a21caf"
          icon={Star}
        />
      </div>
      {/* Tasks Section */}

      {/* My Active Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Active Task</CardTitle>
          <CardDescription>Task currently assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          <MyTasksTable tasks={active_tasks} onTaskUpdate={refetch} />
        </CardContent>
      </Card>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>My Performance (Last 7 Days)</CardTitle>
          <CardDescription>
            Daily task completion and quality scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={performanceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="completed"
                fill={PRIMARY}
                name="Tasks Completed"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgScore"
                stroke={SECONDARY}
                strokeWidth={2}
                name="Avg Quality Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Recent Completed Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Completed</CardTitle>
          <CardDescription>Your last 5 completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentCompletedTasks tasks={completed_tasks} />
        </CardContent>
      </Card>
    </div>
  );
}
