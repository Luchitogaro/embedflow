import { expect, test } from "@playwright/test"

test.describe("public pages (logged out)", () => {
  // Run without auth storage so / shows the marketing nav (not redirect to dashboard).
  test.use({ storageState: { cookies: [], origins: [] } })

  test("landing and auth pages render core actions", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /sign in|iniciar sesión|entrar/i })).toBeVisible()

    await page.goto("/login")
    await expect(page.getByRole("button", { name: /sign in|iniciar sesión|entrar/i })).toBeVisible()
    await expect(page.getByLabel(/email|correo|e-mail/i)).toBeVisible()

    await page.goto("/signup")
    await expect(
      page.getByRole("button", { name: /create account|crear cuenta|criar conta/i })
    ).toBeVisible()
    await expect(page.getByLabel(/full name|nombre completo|nome completo/i)).toBeVisible()
  })
})
