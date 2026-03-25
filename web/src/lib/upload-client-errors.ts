import type { Messages } from "@/messages/en"

type UploadErrors = Messages["dashboard"]["upload"]["errors"]

/**
 * Turn low-level fetch/Next errors into localized copy (e.g. truncated multipart body).
 */
export function mapUnknownUploadError(message: string, errors: UploadErrors): string {
  const m = message.toLowerCase()
  if (
    m.includes("unexpected end of form") ||
    m.includes("request body exceeded") ||
    m.includes("body exceeded")
  ) {
    return errors.bodyTruncated
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
    return errors.network
  }
  if (message.trim()) return message
  return errors.generic
}
