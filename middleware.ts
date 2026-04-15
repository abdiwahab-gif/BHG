import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Skip middleware for Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // For public routes, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, we'll check authentication on the client side
  // This is a client-side app, so authentication is handled in the browser
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
