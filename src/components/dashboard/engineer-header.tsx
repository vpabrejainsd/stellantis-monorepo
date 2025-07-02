// src/components/dashboards/engineer-header.tsx
import { type EngineerProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EngineerHeaderProps {
  engineer: EngineerProfile;
  stats: {
    tasksInProgress: number;
    tasksCompleted: number;
    timesExceededEstimate: number;
  };
}

export function EngineerHeader({ engineer, stats }: EngineerHeaderProps) {
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("");

  return (
    <div>
      <div className="mb-6 flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${engineer.Engineer_Name}`}
            alt={engineer.Engineer_Name}
          />
          <AvatarFallback>{getInitials(engineer.Engineer_Name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {engineer.Engineer_Name}
          </h1>
          <p className="text-muted-foreground">{engineer.Engineer_ID}</p>
          <Badge
            variant={engineer.Availability === "Yes" ? "default" : "secondary"}
            className={`mt-2 ${engineer.Availability === "Yes" ? "bg-green-500" : ""}`}
          >
            {engineer.Availability === "Yes" ? "Available" : "Unavailable"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Perf. Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engineer.Overall_Performance_Score.toFixed(1)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksInProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tasks Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Times Over Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.timesExceededEstimate}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
