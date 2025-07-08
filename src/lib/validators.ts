// src/lib/validators.ts
import { z } from "zod";
import { JOB_TYPES, URGENCY_LEVELS } from "./constants";

export const newJobFormSchema = z.object({
  // Car Details
  vin: z.string().min(11, "VIN must be at least 11 characters").max(17),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  mileage: z.coerce
    .number()
    .int()
    .positive("Mileage must be a positive number"),
  urgency: z.enum(URGENCY_LEVELS),
  jobType: z.enum(JOB_TYPES),
  // This field now holds the selected Task IDs
  selectedTasks: z.array(z.string()).optional(),
  description: z.string().optional(),
});
