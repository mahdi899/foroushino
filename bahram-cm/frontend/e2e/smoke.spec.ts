import { expect, test } from "@playwright/test";

test.describe("public pages smoke", () => {
  test("homepage renders with primary navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/بهرام رستمی/);
    await expect(page.locator("#main-content")).toBeVisible();
  });

  test("courses index lists course cards linking to detail", async ({ page }) => {
    await page.goto("/courses");
    const firstCourse = page.getByRole("link", { name: /مشاهده‌ی دوره/ }).first();
    await expect(firstCourse).toBeVisible();
  });

  test("sitemap is served", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("/courses");
  });

  test("legal pages are reachable", async ({ page }) => {
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/data-request"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
