"use client"

import { useCallback, useState } from "react"
import { Upload, File, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  onUpload: (file: File) => Promise<{ documentId: string } | null>
  disabled?: boolean
}

export function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (!dropped || disabled) return
      setFile(dropped)
      setProgress("uploading")
      setUploading(true)
      try {
        const result = await onUpload(dropped)
        setProgress(result ? "done" : "error")
      } catch {
        setProgress("error")
      } finally {
        setUploading(false)
      }
    },
    [onUpload, disabled]
  )

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (!selected || disabled) return
      setFile(selected)
      setProgress("uploading")
      setUploading(true)
      try {
        const result = await onUpload(selected)
        setProgress(result ? "done" : "error")
      } catch {
        setProgress("error")
      } finally {
        setUploading(false)
      }
    },
    [onUpload, disabled]
  )

  const reset = () => {
    setFile(null)
    setProgress("idle")
    setErrorMsg("")
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-200",
        dragging ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        (disabled || uploading) && "opacity-60 pointer-events-none"
      )}
    >
      <input
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleChange}
        disabled={disabled || uploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {progress === "idle" && !file && (
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

      {progress === "uploading" && (
        <>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Uploading {file?.name}...</p>
          <p className="text-xs text-slate-500 mt-1">We&apos;ll analyze it automatically</p>
        </>
      )}

      {progress === "done" && (
        <>
          <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
          <p className="text-sm font-medium text-green-700">Upload complete!</p>
          <p className="text-xs text-slate-500 mt-1">Check &quot;Recent Analyses&quot; below</p>
          <button onClick={reset} className="mt-3 text-xs text-blue-600 hover:underline">
            Upload another
          </button>
        </>
      )}

      {progress === "error" && (
        <>
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm font-medium text-red-700">Upload failed</p>
          <p className="text-xs text-slate-500 mt-1">{errorMsg || "Please try again"}</p>
          <button onClick={reset} className="mt-3 text-xs text-blue-600 hover:underline">
            Try again
          </button>
        </>
      )}
    </div>
  )
}
