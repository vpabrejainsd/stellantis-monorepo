import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)", // all routes except static files
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = req.nextUrl;

  // Redirect away from root route `/`
  if (url.pathname === "/") {
    return NextResponse.redirect(
      new URL(userId ? "/dashboard" : "/sign-in", req.url),
    );
  }

  // Redirect unauthenticated users trying to access protected routes (except /sign-in)
  if (
    !userId &&
    isProtectedRoute(req) &&
    url.pathname !== "/sign-in" &&
    url.pathname !== "/sign-up"
  ) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Prevent signed-in users from seeing /sign-in
  if (userId && (url.pathname === "/sign-in" || url.pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Match all routes (excluding static files)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
