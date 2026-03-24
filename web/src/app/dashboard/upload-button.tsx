"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { uploadDocument } from "@/app/actions/upload"
import { cn } from "@/lib/utils"

export function UploadButton() {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadDocument(formData)
      setDone(true)
      setTimeout(() => {
        setDone(false)
        router.push(`/dashboard/documents/${result.documentId}`)
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setUploading(false)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
        dragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        uploading && "opacity-60 pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        disabled={uploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {uploading && !done && (
        <>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Uploading & analyzing...</p>
          <p className="text-xs text-slate-500 mt-1">This takes about 10-20 seconds</p>
        </>
      )}

      {done && (
        <>
          <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
          <p className="text-sm font-medium text-green-700">Analysis complete!</p>
          <p className="text-xs text-slate-500 mt-1">Redirecting to results...</p>
        </>
      )}

      {!uploading && !done && (
        <>
          <div className="p-3 bg-blue-100 rounded-full mb-3">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {dragging ? "Drop your contract here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDF, DOCX, or TXT — up to 10MB</p>
        </>
      )}

      {error && (
        <p className="absolute bottom-4 text-sm text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
          {error}
        </p>
      )}
    </div>
  )
}
