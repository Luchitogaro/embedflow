import type { NextConfig } from "next"

// Uploads use server actions (`uploadDocument`). Server Actions default is 1 MB.
// With `src/proxy.ts`, Next buffers the full request for auth + route; default proxy buffer is 10 MB,
// which truncates multipart uploads and causes "Unexpected end of form" for larger PDFs.
// App max file size is UPLOAD_MAX_FILE_BYTES (~35 MB); keep limits above that + multipart overhead.
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    proxyClientMaxBodySize: "40mb",
    serverActions: {
      bodySizeLimit: "40mb",
    },
  },
} as NextConfig

export default nextConfig
