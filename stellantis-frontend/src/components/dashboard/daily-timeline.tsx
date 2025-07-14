// src/components/dashboards/daily-timeline.tsx
"use client";

import * as React from "react";
import { addMinutes, format, parseISO } from "date-fns";
import { type TimelineTask } from "@/lib/types"; // This type should include Make, Model, VIN from your previous setup
import { Skeleton } from "@/components/ui/skeleton";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { DatePicker } from "./date-picker";
import { cn } from "@/lib/utils";

// A consistent color palette for engineers
const ENGINEER_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];
const UNASSIGNED_COLOR = "bg-gray-400";

const SLOT_WIDTH = 60; // px
const SLOT_DURATION = 5; // minutes
// Helper to assign a consistent color to each engineer
const getEngineerColor = (
  engineerId: string | null,
  colorMap: Map<string, string>,
): string => {
  if (!engineerId) return UNASSIGNED_COLOR;
  if (!colorMap.has(engineerId)) {
    const colorIndex = colorMap.size % ENGINEER_COLORS.length;
    colorMap.set(engineerId, ENGINEER_COLORS[colorIndex]!);
  }
  return colorMap.get(engineerId)!;
};

export function DailyTimeline() {
  const [date, setDate] = React.useState(new Date());
  const [tasks, setTasks] = React.useState<TimelineTask[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchTimelineData = async () => {
      setIsLoading(true);
      setError(null);
      const dateStr = format(date, "yyyy-MM-dd");
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_FLASK_API_URL}/timeline?date=${dateStr}`,
        );
        if (!res.ok) throw new Error("Failed to fetch timeline data.");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: TimelineTask[] = await res.json();
        setTasks(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    void fetchTimelineData();
  }, [date]);

  // --- THIS IS THE KEY CHANGE: Group tasks by Task_Description ---
  const { groupedTasks, engineerColorMap } = React.useMemo(() => {
    const colorMap = new Map<string, string>();
    const grouped = tasks.reduce(
      (acc: Record<string, TimelineTask[]>, task) => {
        if (task.Time_Started) {
          // Only include tasks that can be placed on the timeline
          (acc[task.Task_Description] ??= []).push(task);
          if (task.Engineer_Id) {
            getEngineerColor(task.Engineer_Id, colorMap);
          }
        }
        return acc;
      },
      {},
    );
    return { groupedTasks: grouped, engineerColorMap: colorMap };
  }, [tasks]);

  const timeSlots = React.useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_DURATION) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  }, []);

  const TIMELINE_START_HOUR = 7;
  const TOTAL_TIMELINE_MINUTES = (24 - TIMELINE_START_HOUR) * 60;
  const contentHeight = Object.keys(groupedTasks).length * 64;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold">Timeline for:</h3>
        <DatePicker date={date} setDate={setDate} />
      </div>

      {isLoading && <Skeleton className="h-[80vh] w-full" />}
      {error && <div className="text-destructive p-8 text-center">{error}</div>}

      {!isLoading && !error && Object.keys(groupedTasks).length > 0 && (
        <div className="flex h-[80vh] w-full overflow-auto rounded-lg border">
          <div className="bg-background sticky left-0 z-10 w-64 border-r">
            <div className="flex h-12 items-center border-b px-4 font-semibold">
              Task Type
            </div>
            {/* --- CHANGE: Iterate over task descriptions for Y-axis labels --- */}
            {Object.keys(groupedTasks).map((taskDescription) => (
              <div
                key={taskDescription}
                className="flex h-16 items-center border-b px-4"
              >
                <span className="truncate font-medium">{taskDescription}</span>
              </div>
            ))}
          </div>
          <div className="w-[500px] flex-1 overflow-auto">
            <div
              className="bg-background sticky top-0 z-10 grid"
              style={{
                gridTemplateColumns: `repeat(${timeSlots.length}, minmax(60px, 1fr))`,
              }}
            >
              {timeSlots.map(({ hour, minute }) => (
                <div
                  key={`${hour}-${minute}`}
                  className="flex h-12 flex-col items-center justify-center border-r border-b text-xs font-medium"
                >
                  {minute === 0 && (
                    <span className="font-bold">
                      {format(new Date(0, 0, 0, hour), "ha")}
                    </span>
                  )}
                  <span>{format(new Date(0, 0, 0, hour, minute), "mm")}</span>
                </div>
              ))}
            </div>
            <div className="relative" style={{ height: `${contentHeight}px` }}>
              {/* --- CHANGE: Outer loop is now task descriptions --- */}
              {Object.keys(groupedTasks).map((taskDescription) => (
                <div
                  key={taskDescription}
                  className="relative grid h-16 border-b"
                  style={{
                    gridTemplateColumns: `repeat(${timeSlots.length}, minmax(60px, 1fr))`,
                  }}
                >
                  {timeSlots.map(({ hour, minute }) => (
                    <div
                      key={`${taskDescription}-${hour}-${minute}`}
                      className="border-r"
                    ></div>
                  ))}

                  {/* --- CHANGE: Inner loop renders all instances of that task --- */}
                  {groupedTasks[taskDescription]?.map((taskInstance) => {
                    if (!taskInstance.Time_Started) return null;
                    const startTime = parseISO(taskInstance.Time_Started);
                    const startMinutes =
                      startTime.getHours() * 60 + startTime.getMinutes();
                    const slotIndex = Math.floor(
                      (startMinutes - TIMELINE_START_HOUR * 60) / SLOT_DURATION,
                    );
                    // Use actual time if available, otherwise estimated
                    const duration =
                      taskInstance.Time_Taken_minutes ??
                      taskInstance.Estimated_Standard_Time;
                    const slotSpan = Math.ceil(duration / SLOT_DURATION);

                    // Calculate pixel values
                    const left = slotIndex * SLOT_WIDTH;
                    const width = slotSpan * SLOT_WIDTH;
                    console.log(slotIndex, slotSpan, left, width);
                    // Calculate time ended
                    const timeEnded = addMinutes(startTime, duration);

                    const hasExceeded =
                      !!taskInstance.Time_Taken_minutes &&
                      taskInstance.Time_Taken_minutes >
                        taskInstance.Estimated_Standard_Time;
                    const color = getEngineerColor(
                      taskInstance.Engineer_Id,
                      engineerColorMap,
                    );

                    return (
                      <HoverCard key={taskInstance.Task_Id}>
                        <HoverCardTrigger asChild>
                          <div
                            className={cn(
                              "absolute top-2 h-12 rounded-lg p-2 text-white shadow-md transition-all hover:z-20 hover:scale-105",
                              color,
                            )}
                            style={{
                              left: `${left}px`,
                              width: `${width}px`,
                              minWidth: `${SLOT_WIDTH}px`,
                              maxWidth: `calc(100% - ${left}px)`,
                            }}
                          >
                            <p className="truncate text-sm font-bold">
                              {taskInstance.Engineer_Name ?? "Unassigned"}
                            </p>
                            {hasExceeded && (
                              <div
                                className="absolute top-0 h-full rounded-r-lg bg-red-600 opacity-80"
                                style={{
                                  left: "100%",
                                  width: "10px",
                                }}
                              />
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent>
                          <p className="font-bold">
                            {taskInstance.Task_Description}
                          </p>
                          <p>
                            <strong>Job:</strong> {taskInstance.Job_Id}
                          </p>
                          <p>
                            <strong>Engineer:</strong>{" "}
                            {taskInstance.Engineer_Name ?? "N/A"}
                          </p>
                          <p>
                            <strong>Time Started:</strong>{" "}
                            {format(startTime, "PPpp")}
                          </p>
                          <p>
                            <strong>Time Ended:</strong>{" "}
                            {format(timeEnded, "PPpp")}
                          </p>
                          <p>
                            <strong>Est. Time:</strong>{" "}
                            {taskInstance.Estimated_Standard_Time} min
                          </p>
                          {taskInstance.Time_Taken_minutes && (
                            <p>
                              <strong>Actual Time:</strong>{" "}
                              {taskInstance.Time_Taken_minutes} min
                            </p>
                          )}
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!isLoading && !error && Object.keys(groupedTasks).length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
          <p className="text-muted-foreground">
            No tasks with a start time found for this day.
          </p>
        </div>
      )}
    </div>
  );
}
