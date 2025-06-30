import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(({ ctx }) => {
    return ctx.session.dbUser;
  }),
});
