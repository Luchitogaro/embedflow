import Link from "next/link"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function ShareNotFound() {
  const { messages } = await getMessagesForRequest()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
      <p className="text-slate-600 text-center max-w-md mb-6">{messages.shareView.invalid}</p>
      <Link href="/" className="text-blue-600 hover:underline text-sm">
        {messages.shareView.poweredBy}
      </Link>
    </div>
  )
}
