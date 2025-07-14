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
        <Avatar className="h-12 w-12">
          {/* In a real app, you might have an image URL */}
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${engineer.Engineer_Name}`}
            alt={engineer.Engineer_Name}
          />
          <AvatarFallback>{getInitials(engineer.Engineer_Name)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{engineer.Engineer_Name}</CardTitle>
          <CardDescription>{engineer.Engineer_ID}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{engineer.Years_of_Experience}</p>
            <p className="text-muted-foreground text-xs">Years Exp.</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {engineer.Overall_Performance_Score.toFixed(1)}
            </p>
            <p className="text-muted-foreground text-xs">Perf. Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
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
      <CardFooter className="flex justify-between">
        <Badge
          variant={engineer.Availability === "Yes" ? "default" : "secondary"}
          className={engineer.Availability === "Yes" ? "bg-green-500" : ""}
        >
          {engineer.Availability === "Yes" ? "Available" : "Unavailable"}
        </Badge>
        <Link href={`/dashboard/engineers/${engineer.Engineer_ID}`}>
          <Button>View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
