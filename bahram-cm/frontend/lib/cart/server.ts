import { cookies } from "next/headers";
import { CART_COOKIE } from "./constants";
import { parseCartSlugs } from "./parse";

export async function getServerCartSlugs(): Promise<string[]> {
  const cookieStore = await cookies();
  return parseCartSlugs(cookieStore.get(CART_COOKIE)?.value);
}
