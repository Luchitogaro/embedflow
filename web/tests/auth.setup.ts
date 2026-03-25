import { expect, test as setup } from "@playwright/test"
import path from "node:path"
import fs from "node:fs"

const authFile = path.resolve(process.cwd(), "playwright/.auth/user.json")

function urlWithoutQuery(pageUrl: string): string {
  try {
    const u = new URL(pageUrl)
    u.search = ""
    return u.pathname + (u.hash || "")
  } catch {
    const i = pageUrl.indexOf("?")
    return i === -1 ? pageUrl : pageUrl.slice(0, i)
  }
}

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL?.trim()
  const password = process.env.E2E_USER_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for auth setup")
  }

  await page.goto("/login", { waitUntil: "load" })
  await page.locator("#login-email").waitFor({ state: "visible" })
  await page.locator('button[type="submit"]').waitFor({ state: "visible" })

  // Default <form> method is GET; without method="post", a submit before React hydrates
  // navigates to /login?email=…&password=… and never runs onSubmit. Let the client attach handlers.
  await expect(page.locator("form")).toHaveAttribute("method", "post")
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
  )

  await page.locator("#login-email").fill(email)
  await page.locator("#login-password").fill(password)

  await expect(page.locator("#login-email")).toHaveValue(email)
  await expect(page.locator("#login-password")).toHaveValue(password)

  await page.locator('button[type="submit"]').click()

  try {
    await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 60_000 })
  } catch {
    const errText = await page
      .locator("p.text-destructive")
      .first()
      .textContent({ timeout: 2_000 })
      .catch(() => null)
    const where = urlWithoutQuery(page.url())
    throw new Error(
      errText?.trim()
        ? `Login failed: ${errText.trim()}`
        : `Still on ${where} after submit (no inline error). If the URL had ?email=&password= in the query, the form was submitted before React hydrated — ensure <form method="post"> and a short delay before click (already in this test). Otherwise confirm Supabase env and credentials.`
    )
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
