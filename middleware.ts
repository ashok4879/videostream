import { NextRequest, NextResponse } from "next/server";
import aj, { createMiddleware, detectBot, shield } from "./lib/arcjet";

// Arcjet rules
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

// 👇 Combined Arcjet + Auth logic
export default createMiddleware(validate, async (request: NextRequest) => {
  // Lazy import auth
  const { auth } = await import("@/lib/auth");

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sign-in|assets).*)"],
}; 