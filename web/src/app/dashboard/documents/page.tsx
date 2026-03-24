import { FileText, Eye } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate } from "@/lib/utils"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: documents } = await supabase
    .from("documents")
    .select("id, filename, status, created_at, analyses(status, risk_flags)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const docs = documents ?? []

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm mt-1">{docs.length} contracts analyzed</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Upload your first contract from the{" "}
              <Link href="/" className="text-blue-600 hover:underline">Dashboard</Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Risk Flags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const analysis = doc.analyses?.[0]
                const riskFlags = analysis?.risk_flags
                  ? (JSON.parse(analysis.risk_flags as string) as Array<{ risk_level: string }>)
                  : []
                const topRisk = riskFlags.find((f) => f.risk_level === "HIGH") ? "HIGH"
                  : riskFlags.find((f) => f.risk_level === "MEDIUM") ? "MEDIUM"
                  : riskFlags.length > 0 ? "LOW" : null

                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded">
                          <FileText className="w-4 h-4 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{doc.filename}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        doc.status === "done" ? "bg-green-100 text-green-700" :
                        doc.status === "processing" ? "bg-blue-100 text-blue-700" :
                        doc.status === "error" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {topRisk ? (
                        <Badge className={
                          topRisk === "HIGH" ? "bg-red-100 text-red-700" :
                          topRisk === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }>
                          {topRisk}
                        </Badge>
                      ) : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {riskFlags.length > 0 ? `${riskFlags.length} found` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">{formatDate(doc.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        <button className="p-1.5 rounded hover:bg-slate-100 transition-colors">
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
