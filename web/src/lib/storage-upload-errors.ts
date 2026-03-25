import type { Messages } from "@/messages/en"

type UploadErrors = Messages["dashboard"]["upload"]["errors"]

/** Map Supabase Storage API errors to localized copy (e.g. project bucket file size cap). */
export function messageForStorageUploadError(
  err: { message?: string; statusCode?: string | number },
  e: UploadErrors
): string {
  const msg = (err.message ?? "").toLowerCase()
  const code = String(err.statusCode ?? "")
  if (
    code === "413" ||
    msg.includes("maximum allowed size") ||
    msg.includes("object exceeded") ||
    msg.includes("payload too large") ||
    msg.includes("file too large")
  ) {
    return e.storageObjectTooLarge
  }
  return e.storageFailed
}
