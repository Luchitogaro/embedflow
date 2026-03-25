import Link from "next/link"
import type { Metadata } from "next"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { getSiteUrl } from "@/lib/site-url"

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getMessagesForRequest()
  return {
    title: `${messages.docsApi.title} — Embedflow`,
    description: messages.docsApi.intro,
  }
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm overflow-x-auto my-3">
      <code>{children}</code>
    </pre>
  )
}

export default async function ApiDocsPage() {
  const { messages } = await getMessagesForRequest()
  const d = messages.docsApi
  const base = getSiteUrl()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <p className="text-sm text-slate-500 mb-2">
          <Link href="/" className="text-blue-600 hover:underline">
            Embedflow
          </Link>
        </p>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{d.title}</h1>
        <p className="text-slate-600 mb-2 leading-relaxed">{d.intro}</p>
        <p className="text-slate-500 text-sm mb-12">{d.baseUrlNote}</p>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.healthHeading}</h2>
          <p className="text-slate-600 text-sm mb-1">{d.healthBody}</p>
          <Code>{`curl -sS "${base}/api/v1/health"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.authHeading}</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-2">{d.authBody}</p>
          <h3 className="text-sm font-semibold text-slate-800 mt-4 mb-1">{d.cookiesHeading}</h3>
          <p className="text-slate-600 text-sm">{d.cookiesBody}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.documentsListHeading}</h2>
          <p className="text-slate-600 text-sm">{d.documentsListBody}</p>
          <Code>{`curl -sS -b "your-session-cookie" "${base}/api/documents"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.documentsPostHeading}</h2>
          <p className="text-slate-600 text-sm">{d.documentsPostBody}</p>
          <Code>{`curl -X POST -b "your-session-cookie" -F "file=@./contract.pdf" "${base}/api/documents"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.documentGetHeading}</h2>
          <p className="text-slate-600 text-sm">{d.documentGetBody}</p>
          <Code>{`curl -sS -b "your-session-cookie" "${base}/api/documents/DOCUMENT_ID"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.documentPdfHeading}</h2>
          <p className="text-slate-600 text-sm">{d.documentPdfBody}</p>
          <Code>{`curl -sS -b "your-session-cookie" -o analysis.pdf "${base}/api/documents/DOCUMENT_ID/pdf"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.documentDeleteHeading}</h2>
          <p className="text-slate-600 text-sm">{d.documentDeleteBody}</p>
          <Code>{`curl -X DELETE -b "your-session-cookie" "${base}/api/documents/DOCUMENT_ID"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.analyzeHeading}</h2>
          <p className="text-slate-600 text-sm">{d.analyzeBody}</p>
          <Code>{`curl -X POST -b "your-session-cookie" -H "Content-Type: application/json" \\
  -d '{"documentId":"DOCUMENT_ID"}' "${base}/api/analyze"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.analyzeRefreshHeading}</h2>
          <p className="text-slate-600 text-sm">{d.analyzeRefreshBody}</p>
          <Code>{`curl -X POST -b "your-session-cookie" "${base}/api/analyze/DOCUMENT_ID/refresh"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.shareHeading}</h2>
          <p className="text-slate-600 text-sm">{d.shareBody}</p>
          <Code>{`curl -X POST -b "your-session-cookie" -H "Content-Type: application/json" \\
  -d '{"action":"create"}' "${base}/api/documents/DOCUMENT_ID/share"`}</Code>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.billingHeading}</h2>
          <p className="text-slate-600 text-sm">{d.billingBody}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.webhooksHeading}</h2>
          <p className="text-slate-600 text-sm">{d.webhooksBody}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.workerHeading}</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{d.workerBody}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.rateHeading}</h2>
          <p className="text-slate-600 text-sm">{d.rateBody}</p>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.errorsHeading}</h2>
          <p className="text-slate-600 text-sm">{d.errorsBody}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{d.futureHeading}</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{d.futureBody}</p>
        </section>
      </div>
    </div>
  )
}
