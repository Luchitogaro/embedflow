import { LoginForm } from "./login-form"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function LoginPage() {
  const { messages } = await getMessagesForRequest()
  return <LoginForm t={messages.auth} consent={messages.aiProcessingConsent} />
}
