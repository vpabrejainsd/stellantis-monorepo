// src/components/dashboards/engineer-task-frequency-chart.tsx
"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface ChartData {
  name: string;
  count: number;
}

interface EngineerTaskFrequencyChartProps {
  data: ChartData[];
  height?: number; // Make height an optional prop
}

export function EngineerTaskFrequencyChart({
  data,
  height = 400,
}: EngineerTaskFrequencyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical" // Horizontal bar chart is better for long labels
        margin={{ top: 5, right: 30, left: 120, bottom: 5 }} // Adjust margins for labels
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          stroke="#888888"
          fontSize={12}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          width={120}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
          contentStyle={{
            background: "white",
            border: "1px solid hsl(var(--border))",
          }}
        />
        <Legend />
        <Bar
          dataKey="count"
          name="Times Completed"
          fill="hsl(227, 57%, 33%)"
          radius={[0, 4, 4, 0]}
          style={{
            backgroundColor: "white",
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
