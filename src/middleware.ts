// src/middleware.ts

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the routes that are protected and require authentication.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)", // Protects /dashboard and all its sub-routes
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
