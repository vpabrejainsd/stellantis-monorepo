import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ALL_TASKS } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getTaskIdsFromNames(taskNames: string[]): string[] {
  const nameToIdMap = Object.entries(ALL_TASKS).reduce(
    (acc, [taskId, task]) => {
      acc[task.name] = taskId;
      return acc;
    },
    {} as Record<string, string>,
  );

  return taskNames
    .map((name) => nameToIdMap[name])
    .filter((id): id is string => id !== undefined);
}
