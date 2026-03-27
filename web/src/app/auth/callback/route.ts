import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/** Public site origin behind Railway/Cloudflare (req.url is often internal, e.g. http://0.0.0.0:PORT). */
function publicOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim()
    const rawProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    const proto =
      rawProto && /^https?$/i.test(rawProto) ? rawProto.toLowerCase() : "https"
    return `${proto}://${host}`
  }
  return new URL(req.url).origin
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin = publicOrigin(req)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
