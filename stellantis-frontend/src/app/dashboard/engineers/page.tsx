// src/app/dashboard/engineers/page.tsx
"use client";

import * as React from "react";
import { type EngineerProfile } from "@/lib/types";
import { EngineerCard } from "@/components/dashboard/engineer-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AllEngineersPage() {
  const [engineers, setEngineers] = React.useState<EngineerProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FLASK_API_URL}/engineers`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch engineer data.");
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: EngineerProfile[] = await response.json();
        setEngineers(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
      } finally {
        setIsLoading(false);
      }
    };
    void fetchEngineers();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Engineer Roster</h1>
        <p className="text-muted-foreground">
          Browse all service engineers in the system.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[250px] w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {engineers.map((engineer) => (
            <EngineerCard key={engineer.Engineer_ID} engineer={engineer} />
          ))}
        </div>
      )}
    </div>
  );
}
