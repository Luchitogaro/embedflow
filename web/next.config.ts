import type { NextConfig } from "next"

// Uploads use server actions (`uploadDocument`). Default body limit is 1 MB; storage allows 10 MB.
// In Next.js 16 this lives under `experimental.serverActions` (see config schema).
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
} as NextConfig

export default nextConfig
