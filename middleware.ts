import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isHub = req.nextUrl.pathname.startsWith("/hub");

  if (isHub && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/hub/:path*"],
};
