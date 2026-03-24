"use client"

import { Mic, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface PitchDisplayProps {
  pitch: string
}

export function PitchDisplay({ pitch }: PitchDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pitch)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-blue-500 rounded-lg">
          <Mic className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900">10-Second Pitch</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="ml-auto h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <p className="text-slate-700 leading-relaxed">{pitch}</p>
    </div>
  )
}
