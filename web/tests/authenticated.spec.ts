import { expect, test } from "@playwright/test"

test.describe("authenticated dashboard", () => {
  test("dashboard home loads", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("documents list loads", async ({ page }) => {
    await page.goto("/dashboard/documents")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("billing settings: heading and permission copy", async ({ page }) => {
    await page.goto("/dashboard/settings/billing")
    await expect(page).not.toHaveURL(/\/login/)
    // EN: Billing · ES: Facturación · PT: Cobrança (not "faturamento")
    await expect(
      page.getByRole("heading", { level: 1, name: /billing|facturación|cobrança|faturamento/i })
    ).toBeVisible()
    await expect(
      page.getByText(
        /Only organization owners|Subscribe to a paid plan|Solo propietarios|Somente proprietários|Manage subscription|Gestionar|Gerenciar|gestionar la facturación|portal Stripe|assinatura|plano pago|cobrança/i
      )
    ).toBeVisible()
  })

  test("integrations settings: heading and Slack section", async ({ page }) => {
    await page.goto("/dashboard/settings/integrations")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { level: 1, name: /integrations|integraciones|integrações/i })).toBeVisible()
    await expect(page.getByText("Slack", { exact: true })).toBeVisible()
  })
})
