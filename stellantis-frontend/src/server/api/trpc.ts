/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server"; // <-- MODIFIED: Added TRPCError
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server"; // <-- ADDED: Import auth from Clerk

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // --- MODIFIED CONTEXT ---
  // We get the auth session from Clerk.
  const session = await auth();

  // We then use the session's userId to find our corresponding user in the database.
  // This enriches our context with application-specific data, like the user's role.
  const dbUser = session.userId
    ? await db.user.findUnique({ where: { id: session.userId } })
    : null;

  return {
    db,
    // We add the augmented session object to the context.
    // It now includes both Clerk's auth data and our database user record.
    session: { ...session, dbUser },
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized. This part remains unchanged.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution. Your existing middleware.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure. Your existing procedure.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

// --- ADDED: MIDDLEWARE FOR AUTHENTICATION ---
/**
 * This is the middleware that enforces users are logged in. It checks for a valid
 * session from Clerk and a corresponding user in our database. If either is missing,
 * it throws an UNAUTHORIZED error.
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session.userId || !ctx.session.dbUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // The `next` function continues the procedure, but now TypeScript knows
  // that `ctx.session` and `ctx.session.dbUser` are non-null.
  return next({
    ctx: {
      session: {
        ...ctx.session,
        userId: ctx.session.userId,
        dbUser: ctx.session.dbUser,
      },
    },
  });
});

// --- ADDED: THE PROTECTED PROCEDURE ---
/**
 * Protected (authenticated) procedure.
 *
 * If you want a query or mutation to ONLY be accessible to logged-in users, use this.
 * It chains your existing `timingMiddleware` with our new `enforceUserIsAuthed` middleware.
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed);
