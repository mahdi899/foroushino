/** True when pathname is exactly `href`, or nested under it (e.g. /insights/post). */
export function navLinkMatches(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const target = href.replace(/\/+$/, "") || "/";
  if (target === "/") return path === "/";
  return path === target || path.startsWith(`${target}/`);
}
