import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  evaluateProtectedRouteAccess,
  isProtectedAppRoute,
  resolveServerSessionWithClient,
  type ServerAuthClientLike,
} from "@/lib/supabase/auth";
import type { Database } from "@/types/database.types";

/**
 * Updates the user's Supabase auth session by reading cookies from the incoming
 * request, writing refreshed token cookies to the outgoing response, and enforcing
 * server-side protection on administrative routes.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const isProtectedArea = isProtectedAppRoute(pathname);

  if (isProtectedArea) {
    const resolution = await resolveServerSessionWithClient(
      supabase as unknown as ServerAuthClientLike
    );
    const decision = evaluateProtectedRouteAccess(pathname, resolution);
    if (decision.action === "redirect") {
      const redirectResponse = NextResponse.redirect(
        new URL(decision.target, request.url)
      );
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
    return response;
  }

  // Validates the JWT and refreshes expired sessions.
  // Using `getUser()` instead of `getSession()` guarantees server-side authenticity.
  await supabase.auth.getUser();

  return response;
}

/**
 * Next.js 16 Proxy entrypoint.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  return await updateSession(request);
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
