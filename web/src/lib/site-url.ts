/** Canonical site URL for OG, sitemap, and share links. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
  if (railway) {
    return railway.startsWith("http")
      ? railway.replace(/\/$/, "")
      : `https://${railway.replace(/\/$/, "")}`
  }
  return "http://localhost:3000"
}
