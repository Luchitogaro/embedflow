"use client"

import { AlertTriangle, AlertCircle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface RiskFlag {
  clause: string
  risk_level: "HIGH" | "MEDIUM" | "LOW"
  explanation: string
  recommendation: string
}

interface RiskFlagCardProps {
  flag: RiskFlag
  className?: string
}

const config = {
  HIGH: {
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconClass: "text-red-500",
    label: "High Risk",
  },
  MEDIUM: {
    icon: AlertCircle,
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    iconClass: "text-yellow-500",
    label: "Medium Risk",
  },
  LOW: {
    icon: Info,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    iconClass: "text-blue-500",
    label: "Low Risk",
  },
}

export function RiskFlagCard({ flag, className }: RiskFlagCardProps) {
  const { icon: Icon, badgeClass, iconClass, label } = config[flag.risk_level] ?? config.LOW

  return (
    <div className={cn("rounded-xl border p-4 bg-white", className)}>
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 p-1.5 rounded-lg bg-white border", badgeClass)}>
          <Icon className={cn("w-4 h-4", iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", badgeClass)}>
              {label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">{flag.clause}</p>
          <p className="text-sm text-slate-600 mb-2">{flag.explanation}</p>
          <div className="flex items-start gap-1.5 bg-slate-50 rounded-lg p-2.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600">{flag.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
