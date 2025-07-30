// src/components/dashboards/engineer-card.tsx
import Link from "next/link";
import { type EngineerProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EngineerCardProps {
  engineer: EngineerProfile;
}

export function EngineerCard({ engineer }: EngineerCardProps) {
  // Helper to get initials from the name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center gap-4">
        {/* CHANGED: Avatar size is now responsive. */}
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${engineer.Engineer_Name}`}
            alt={engineer.Engineer_Name}
          />
          <AvatarFallback>{getInitials(engineer.Engineer_Name)}</AvatarFallback>
        </Avatar>
        <div>
          {/* CHANGED: Set a slightly smaller, more consistent title size. */}
          <CardTitle className="text-lg">{engineer.Engineer_Name}</CardTitle>
          <CardDescription>{engineer.Engineer_ID}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            {/* CHANGED: Made the stat number font size responsive. */}
            <p className="text-xl font-bold sm:text-2xl">
              {engineer.Years_of_Experience}
            </p>
            <p className="text-muted-foreground text-xs">Years Exp.</p>
          </div>
          <div>
            {/* CHANGED: Made the stat number font size responsive. */}
            <p className="text-xl font-bold sm:text-2xl">
              {engineer.Overall_Performance_Score.toFixed(1)}
            </p>
            <p className="text-muted-foreground text-xs">Perf. Score</p>
          </div>
          <div>
            {/* CHANGED: Made the stat number font size responsive. */}
            <p className="text-xl font-bold sm:text-2xl">
              {engineer.Customer_Rating.toFixed(1)}
            </p>
            <p className="text-muted-foreground text-xs">Cust. Rating</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {engineer.Specialization && (
            <Badge variant="outline">
              Specialty: {engineer.Specialization}
            </Badge>
          )}
        </div>
      </CardContent>
      {/* CHANGED: Footer now uses flex-wrap and gap to prevent overflow on small screens. */}
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          variant={engineer.Availability === "Yes" ? "default" : "secondary"}
          className={engineer.Availability === "Yes" ? "bg-green-500" : ""}
        >
          {engineer.Availability === "Yes" ? "Available" : "Unavailable"}
        </Badge>
        <Link href={`/dashboard/engineers/${engineer.Engineer_ID}`}>
          <Button size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
