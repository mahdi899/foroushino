import { describe, expect, it } from "vitest";
import { buildMetadata } from "@/lib/seo";

describe("buildMetadata", () => {
  it("sets a per-page canonical instead of inheriting '/'", () => {
    const meta = buildMetadata({
      title: "دوره‌ها",
      description: "همه‌ی دوره‌ها",
      path: "/courses",
    });
    expect(meta.alternates?.canonical).toBe("/courses");
  });

  it("keeps the root canonical as '/'", () => {
    const meta = buildMetadata({ title: "خانه", description: "x", path: "/" });
    expect(meta.alternates?.canonical).toBe("/");
  });

  it("strips trailing slashes from the canonical", () => {
    const meta = buildMetadata({ title: "t", description: "d", path: "/guides/" });
    expect(meta.alternates?.canonical).toBe("/guides");
  });

  it("builds an absolute OpenGraph url", () => {
    const meta = buildMetadata({ title: "t", description: "d", path: "/resources" });
    const og = meta.openGraph as { url?: string };
    expect(og.url).toMatch(/\/resources$/);
    expect(og.url).toMatch(/^https?:\/\//);
  });

  it("honours noIndex by emitting robots:false", () => {
    const meta = buildMetadata({
      title: "t",
      description: "d",
      path: "/legal/privacy",
      noIndex: true,
    });
    const robots = meta.robots as { index?: boolean };
    expect(robots.index).toBe(false);
  });
});
