import { FileText, Calendar, DollarSign, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiskFlagCard } from "@/components/risk-flag"
import { PitchDisplay } from "@/components/pitch-display"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"

const mockAnalysis = {
  id: "1",
  filename: "Acme_MSA_2024.pdf",
  status: "done",
  created_at: "2026-03-18T14:30:00Z",
  summary: "This is a 3-year annual contract worth $120,000 with standard SaaS terms. Auto-renews with 60-day notice window. One significant risk flag in the liability section requiring legal review.",
  parties: [
    { name: "Acme Corporation", role: "customer" },
    { name: "Embedflow Inc", role: "vendor" },
  ],
  dates: {
    effective: "2024-01-15",
    renewal: "2027-01-15",
    termination_notice_days: 60,
    contract_length_months: 36,
  },
  pricing: {
    total_value: "$120,000",
    billing_cycle: "annual",
    currency: "USD",
  },
  key_terms: {
    auto_renew: true,
    auto_renew_notice_days: 60,
    unlimited_liability: true,
    ip_assignment: false,
    data_portability: true,
  },
  risk_flags: [
    {
      clause: "Section 8.2: Unlimited Liability",
      risk_level: "HIGH" as const,
      explanation: "Neither party has a liability cap, exposing both parties to unlimited damages. This is unusual for SaaS agreements.",
      recommendation: "Negotiate a mutual liability cap at 2x annual contract value, which is standard industry practice.",
    },
    {
      clause: "Section 4.1: Auto-Renewal",
      risk_level: "MEDIUM" as const,
      explanation: "Contract auto-renews for successive 12-month periods unless cancelled 60 days in advance.",
      recommendation: "Set a calendar reminder 75 days before renewal to review and decide on cancellation.",
    },
  ],
  pitch_text: "This is a 3-year annual contract worth $120K. It auto-renews with 60-day notice. One risk flag in the liability section — they have unlimited mutual liability, which is unusual. I'd push back and ask for a cap at 2x annual value. Overall it's a solid deal, I'd move forward with the revision.",
}

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="p-1.5 bg-slate-100 rounded">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  </div>
)

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const a = mockAnalysis

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{a.filename}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Analyzed {formatDate(a.created_at)} · {a.parties.length} parties identified
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — main content */}
        <div className="col-span-2 space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">{a.summary}</p>
            </CardContent>
          </Card>

          {/* Pitch */}
          <PitchDisplay pitch={a.pitch_text} />

          {/* Risk Flags */}
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Risk Flags ({a.risk_flags.length})
            </h3>
            <div className="space-y-3">
              {a.risk_flags.map((flag, i) => (
                <RiskFlagCard key={i} flag={flag} />
              ))}
            </div>
          </div>
        </div>

        {/* Right column — metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow icon={Calendar} label="Effective Date" value={a.dates.effective} />
              <Separator />
              <InfoRow icon={Calendar} label="Renewal Date" value={a.dates.renewal} />
              <Separator />
              <InfoRow icon={DollarSign} label="Contract Value" value={a.pricing.total_value} />
              <Separator />
              <InfoRow icon={Calendar} label="Billing" value={a.pricing.billing_cycle} />
            </CardContent>
          </Card>

          {/* Key Terms */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Key Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(a.key_terms).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <Badge className={value ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                    {value === true ? "Yes" : value === false ? "No" : String(value)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Parties */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {a.parties.map((party) => (
                <div key={party.name} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{party.name}</span>
                  <Badge variant="outline" className="text-xs capitalize">{party.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
