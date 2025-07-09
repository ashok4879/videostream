import { NextRequest, NextResponse } from "next/server";
import aj, { createMiddleware, detectBot, shield } from "./lib/arcjet"; // correct import
import { auth } from "@/lib/auth";

// Arcjet rule setup
const validate = aj
  .withRule(
    shield({
      mode: "LIVE",
    })
  )
  .withRule(
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE", "G00G1E_CRAWLER"],
    })
  );

// Middleware
export default createMiddleware(validate, async (req: NextRequest) => {
  const path = req.nextUrl.pathname;

  // Allowlisted public routes
  const isPublic =
    path === "/sign-in" ||
    path === "/favicon.ico" ||
    path.startsWith("/_next") ||
    path.startsWith("/assets") ||
    path.startsWith("/api");

  if (isPublic) return NextResponse.next();

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

// Matcher config
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets|api|sign-in).*)"],
};
