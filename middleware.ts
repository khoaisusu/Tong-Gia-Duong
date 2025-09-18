import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Custom logic can be added here
    // For example, checking role-based access
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only paths
    const adminPaths = ['/nhan-vien', '/bao-cao', '/cai-dat'];
    
    if (adminPaths.some(p => path.startsWith(p))) {
      if (token?.role !== 'Admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|public).*)',
  ],
};