import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const plans = [
  { name: "Free", price: "$0", period: "/month", features: ["3 docs/month", "Basic extraction", "No risk flags"], current: false },
  { name: "Starter", price: "$29", period: "/user/mo", features: ["20 docs/month", "Full extraction", "Risk flags", "Pitch generator"], current: true, badge: "Current plan" },
  { name: "Pro", price: "$49", period: "/user/mo", features: ["Unlimited docs", "CRM sync", "Slack alerts", "Priority AI"], current: false },
  { name: "Team", price: "$149", period: "/month", features: ["5 seats included", "Org dashboard", "Custom risk rules", "SSO"], current: false },
]

export default function BillingPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your subscription and usage</p>
        </div>
        <Button>Upgrade Plan</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.current ? "ring-2 ring-blue-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                {plan.badge && <Badge className="text-xs">{plan.badge}</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-blue-500 rounded-full" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.current ? "outline" : "default"} size="sm" className="w-full mt-4">
                {plan.current ? "Current plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-slate-900">3 / 20</p>
              <p className="text-sm text-slate-500">Documents analyzed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">5</p>
              <p className="text-sm text-slate-500">Risk flags found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
