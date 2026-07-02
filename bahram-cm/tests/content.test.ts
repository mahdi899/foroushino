import { describe, expect, it } from "vitest";
import {
  getCourses,
  getEvents,
  getGuides,
  getInsights,
  getResources,
  getTransformations,
} from "@/lib/content";

describe("content collections meet authoring targets", () => {
  it("has at least 15 insights, sorted newest-first", async () => {
    const insights = await getInsights();
    expect(insights.length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < insights.length; i++) {
      expect(+new Date(insights[i - 1]!.date)).toBeGreaterThanOrEqual(
        +new Date(insights[i]!.date),
      );
    }
  });

  it("has at least 10 transformations", async () => {
    expect((await getTransformations()).length).toBeGreaterThanOrEqual(10);
  });

  it("has at least 10 events", async () => {
    expect((await getEvents()).length).toBeGreaterThanOrEqual(10);
  });

  it("has at least 10 courses with required landing fields", async () => {
    const courses = await getCourses();
    expect(courses.length).toBeGreaterThanOrEqual(10);
    for (const c of courses) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.outcomes.length).toBeGreaterThan(0);
      expect(c.pricing.length).toBeGreaterThan(0);
    }
  });

  it("has at least 10 resources", async () => {
    expect((await getResources()).length).toBeGreaterThanOrEqual(10);
  });

  it("has guides available", async () => {
    expect((await getGuides()).length).toBeGreaterThanOrEqual(6);
  });
});
