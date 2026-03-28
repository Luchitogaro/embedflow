import { SignupForm } from "./signup-form"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function SignupPage() {
  const { messages } = await getMessagesForRequest()
  return <SignupForm t={messages.auth} consent={messages.aiProcessingConsent} />
}
