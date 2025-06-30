// src/server/api/routers/job.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { newJobFormSchema } from "@/lib/validators";
import {
  BASIC_TASKS,
  INTERMEDIATE_ADDON_TASKS,
  FULL_SERVICE_ADDON_TASKS,
} from "@/lib/constants";

export const jobRouter = createTRPCRouter({
  create: protectedProcedure
    .input(newJobFormSchema)
    .mutation(async ({ ctx, input }) => {
      // ... (role check and destructuring from input as before) ...
      const {
        vin,
        make,
        model,
        mileage,
        customerName,
        customerContactNumber,
        jobName,
        urgency,
        customTasks,
      } = input;

      let tasksToCreate: string[] = [];

      // Determine the list of tasks based on the jobName
      if (jobName === "Custom Service") {
        // For custom jobs, use the tasks submitted from the form.
        // The Zod refinement ensures customTasks is not empty.
        tasksToCreate = customTasks!;
      } else {
        // For standard jobs, build the list from our constants.
        tasksToCreate = [...BASIC_TASKS];
        if (jobName === "Intermediate Service" || jobName === "Full Service") {
          tasksToCreate.push(...INTERMEDIATE_ADDON_TASKS);
        }
        if (jobName === "Full Service") {
          tasksToCreate.push(...FULL_SERVICE_ADDON_TASKS);
        }
      }

      const jobTasks = tasksToCreate.map((description) => ({ description }));

      // The transaction logic remains the same.
      return ctx.db.$transaction(async (prisma) => {
        const car = await prisma.car.upsert({
          where: { vin },
          update: { mileage }, // Update mileage if car exists
          create: {
            vin,
            make,
            model,
            mileage,
            customerName,
            customerContactNumber,
          },
        });
        const newJob = await prisma.job.create({
          data: {
            jobName,
            urgency,
            status: "Created",
            car: { connect: { id: car.id } },
            tasks: { create: jobTasks },
          },
        });
        return newJob;
      });
    }),
});
