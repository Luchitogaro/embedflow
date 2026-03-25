/** Extract bucket object path from a Supabase Storage public/authenticated URL for bucket `contracts`. */
export function contractsObjectPathFromUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null
  try {
    const u = new URL(fileUrl)
    const marker = "/contracts/"
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}
