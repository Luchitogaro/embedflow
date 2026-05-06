'use server'

import { notifyGarsaasLeadSignup } from '@/lib/garsaas/notify-lead-signup'

/** Server action: notifies GarSaaS after a successful Supabase signup / magic-link send (dedupe on GarSaaS). */
export async function submitEmbedflowSignupLead(input: { email: string; displayName?: string }) {
  await notifyGarsaasLeadSignup(input)
}
