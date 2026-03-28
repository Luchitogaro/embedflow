"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { uploadDocument } from "@/app/actions/upload"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"
import { interpolate } from "@/lib/i18n/interpolate"
import { UPLOAD_MAX_FILE_BYTES, UPLOAD_MAX_FILE_MB } from "@/lib/upload-limits"
import { mapUnknownUploadError } from "@/lib/upload-client-errors"

type UploadCopy = Messages["dashboard"]["upload"]
type ConsentCopy = Messages["aiProcessingConsent"]

export function UploadButton({
  upload,
  hasAiProcessingConsent,
  consent,
}: {
  upload: UploadCopy
  hasAiProcessingConsent: boolean
  consent: ConsentCopy
}) {
  const router = useRouter()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [aiCheckbox, setAiCheckbox] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError("")
    if (!hasAiProcessingConsent && !aiCheckbox) {
      setError(upload.errors.consentRequired)
      return
    }
    if (file.size > UPLOAD_MAX_FILE_BYTES) {
      setError(interpolate(upload.errors.tooLarge, { maxMb: UPLOAD_MAX_FILE_MB }))
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (!hasAiProcessingConsent && aiCheckbox) {
        formData.append("aiProcessingConsent", "true")
      }
      const result = await uploadDocument(formData)
      if ("error" in result) {
        setError(result.error)
        setUploading(false)
        return
      }
      if (result.enqueueFailed) {
        toast.warning(upload.enqueueWorkerFailed)
      }
      setDone(true)
      setTimeout(() => {
        setDone(false)
        router.push(`/dashboard/documents/${result.documentId}`)
      }, 1200)
    } catch (err) {
      setError(
        mapUnknownUploadError(err instanceof Error ? err.message : "", upload.errors)
      )
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
        dragging ? "border-blue-500 bg-primary/10" : "border-border hover:border-border hover:bg-muted/40",
        uploading && "opacity-60 pointer-events-none",
        !hasAiProcessingConsent && !aiCheckbox && "opacity-70"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        aria-label={upload.click}
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        disabled={uploading || (!hasAiProcessingConsent && !aiCheckbox)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {!hasAiProcessingConsent && (
        <label className="absolute top-3 left-3 right-3 z-10 flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card/95 p-3 text-left shadow-sm backdrop-blur-sm">
          <input
            type="checkbox"
            checked={aiCheckbox}
            onChange={(e) => setAiCheckbox(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{consent.label}</span>
            <span className="block mt-1">{consent.hint}</span>
          </span>
        </label>
      )}

      {uploading && !done && (
        <>
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
          <p className="text-sm font-medium text-foreground">{upload.uploading}</p>
          <p className="text-xs text-muted-foreground mt-1">{upload.uploadSub}</p>
        </>
      )}

      {done && (
        <>
          <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{upload.doneTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{upload.doneSub}</p>
        </>
      )}

      {!uploading && !done && (
        <>
          <div className="p-3 bg-primary/15 rounded-full mb-3">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {dragging ? upload.drop : upload.click}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{upload.fileTypes}</p>
        </>
      )}

      {error && (
        <p className="absolute bottom-4 text-sm text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg">
          {error}
        </p>
      )}
    </div>
  )
}
