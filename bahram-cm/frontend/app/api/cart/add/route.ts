import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildCartUrl } from "@/lib/cart/url";
import { CART_COOKIE, CART_MAX_AGE_SECONDS } from "@/lib/cart/constants";
import { parseCartSlugs, serializeCartSlugs } from "@/lib/cart/parse";

/** Persists `?add=<slug>` to the cart cookie and redirects to /cart. */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.redirect(buildCartUrl(request.nextUrl.origin));
  }

  const cookieStore = await cookies();
  const current = parseCartSlugs(cookieStore.get(CART_COOKIE)?.value);
  const next = [...new Set([...current, slug])];

  const response = NextResponse.redirect(buildCartUrl(request.nextUrl.origin));
  response.cookies.set(CART_COOKIE, serializeCartSlugs(next), {
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS,
    sameSite: "lax",
  });

  return response;
}
