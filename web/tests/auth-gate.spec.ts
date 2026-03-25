import { expect, test } from "@playwright/test"

test.describe("protected routes redirect when unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const path of [
    "/dashboard",
    "/dashboard/documents",
    "/dashboard/settings/billing",
    "/dashboard/settings/integrations",
  ]) {
    test(`${path} requires login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
