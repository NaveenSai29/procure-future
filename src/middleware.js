import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

  // CORS headers for API routes
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    response.headers.set("Access-Control-Max-Age", "86400");
    
    // Handle OPTIONS preflight request
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { 
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    
    return response;
  }

  // Protected route patterns
  const protectedPaths = [
    "/dashboard",
    "/account",
    "/orders",
    "/checkout",
    "/supplier",
    "/admin",
    "/delivery",
  ];

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  // If protected and no token, redirect to login
  if (isProtected && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access auth pages, redirect to home
  const authPaths = ["/login", "/register", "/forgot-password"];
  if (authPaths.includes(pathname) && accessToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};