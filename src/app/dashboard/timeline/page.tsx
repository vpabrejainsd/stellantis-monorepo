// src/app/dashboard/timeline/page.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import { DailyTimeline } from "@/components/dashboard/daily-timeline";
import { DatePicker } from "@/components/dashboard/date-picker";

export default function TimelinePage() {
  const [date, setDate] = React.useState(new Date());

  // This is a placeholder since the DailyTimeline component now fetches its own data
  // based on an internal date state. To connect this, we would need to lift state up.
  // For simplicity, I'll modify DailyTimeline to accept date as a prop.
  // Please see the final version of DailyTimeline below.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Daily Task Timeline
        </h1>
        <p className="text-muted-foreground">
          A visual overview of tasks scheduled for {format(date, "PPP")}.
        </p>
      </div>
      {/* The DatePicker will be integrated into the DailyTimeline component itself */}
      {/* <DailyTimeline /> */}
    </div>
  );
}
