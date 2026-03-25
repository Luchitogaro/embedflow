import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"

/** GET: poll worker job status. `id` is the worker job id (from POST /api/analyze). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workerUrl = getWorkerUrl()
  try {
    const response = await fetch(`${workerUrl}/jobs/${jobId}`, {
      method: "GET",
      cache: "no-store",
      headers: workerAuthHeaders(),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || "Failed to fetch job status" },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "Worker unavailable while checking job status" },
      { status: 502 }
    )
  }
}
