import { NextResponse } from "next/server";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;

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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};