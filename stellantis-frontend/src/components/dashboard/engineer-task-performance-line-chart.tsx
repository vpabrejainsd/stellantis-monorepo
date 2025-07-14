// src/components/dashboards/engineer-task-performance-chart.tsx
"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { type EnrichedEngineerTask } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface EngineerTaskPerformanceChartProps {
  tasks: EnrichedEngineerTask[];
}

export function EngineerTaskPerformanceChart({
  tasks,
}: EngineerTaskPerformanceChartProps) {
  // Get all unique task descriptions for the dropdown
  const taskTypes = React.useMemo(
    () => Array.from(new Set(tasks.map((t) => t.Task_Description))).sort(),
    [tasks],
  );
  // Default to first task type
  const [selectedTask, setSelectedTask] = React.useState(taskTypes[0] ?? "");

  // Filter tasks for the selected type and with valid Outcome_Score
  const filtered = React.useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.Task_Description === selectedTask &&
            t.Outcome_Score !== null &&
            t.Status === "Completed",
        )
        .sort((a, b) =>
          a.Time_Started && b.Time_Started
            ? parseISO(a.Time_Started).getTime() -
              parseISO(b.Time_Started).getTime()
            : 0,
        ),
    [tasks, selectedTask],
  );

  // Prepare chart data
  const chartData = filtered.map((t) => ({
    date: t.Time_Started
      ? format(parseISO(t.Time_Started), "MMM dd, yyyy")
      : "",
    score: t.Outcome_Score!,
    job: t.Job_Id,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="font-semibold">Task type:</span>
        <Select value={selectedTask} onValueChange={setSelectedTask}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select task type" />
          </SelectTrigger>
          <SelectContent>
            {taskTypes.map((task) => (
              <SelectItem key={task} value={task}>
                {task}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={12} />
          <YAxis domain={[1, 5]} allowDecimals={false} />
          <Tooltip
            formatter={(value, name) =>
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              name === "score" ? [`${value}`, "Outcome Score"] : value
            }
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Outcome Score"
            stroke="hsl(227, 57%, 33%)"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {chartData.length === 0 && (
        <div className="text-muted-foreground text-center">
          No completed tasks of this type with an outcome score.
        </div>
      )}
    </div>
  );
}
