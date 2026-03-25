import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000"

const hasAuthCreds = Boolean(
  process.env.E2E_USER_EMAIL?.trim() && process.env.E2E_USER_PASSWORD?.trim()
)

const authStorage = path.resolve(process.cwd(), "playwright/.auth/user.json")

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: hasAuthCreds
    ? [
        {
          name: "setup",
          testMatch: /auth\.setup\.ts/,
        },
        {
          name: "chromium",
          dependencies: ["setup"],
          use: {
            ...devices["Desktop Chrome"],
            storageState: authStorage,
          },
          testIgnore: /auth\.setup\.ts/,
        },
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
          testMatch: /(smoke|auth-gate)\.spec\.ts/,
        },
      ],
})
