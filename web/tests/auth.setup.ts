import { test as setup, expect } from "@playwright/test"
import path from "node:path"
import fs from "node:fs"

const authFile = path.resolve(process.cwd(), "playwright/.auth/user.json")

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL?.trim()
  const password = process.env.E2E_USER_PASSWORD?.trim()
  if (!email || !password) {
    throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for auth setup")
  }

  await page.goto("/login")
  await page.getByLabel(/email|correo|e-mail/i).fill(email)
  await page.getByLabel(/password|contraseña|senha/i).fill(password)
  await page.getByRole("button", { name: /sign in|iniciar sesión|entrar/i }).click()

  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 })

  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
