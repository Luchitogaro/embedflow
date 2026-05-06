import { z } from "zod"

/** Tipos de documento admitidos en el MVP (DIAN / cliente final típico). */
export const BILLING_TAX_ID_TYPES = ["NIT", "CC", "CE", "PA", "TI"] as const
export type BillingTaxIdType = (typeof BILLING_TAX_ID_TYPES)[number]

function normalizeDigits(s: string): string {
  return s.replace(/[\s.]/g, "")
}

function normalizePhone(s: string): string {
  return s.trim().replace(/\s+/g, " ")
}

/** Schema Zod para perfil fiscal organización (EmbedFlow). */
export function createOrgInvoiceProfileSchema() {
  return z
    .object({
      billingTaxIdType: z.enum(BILLING_TAX_ID_TYPES, {
        errorMap: () => ({ message: "errors.taxIdTypeInvalid" }),
      }),
      billingTaxId: z.string().trim().min(1, "errors.taxIdRequired").max(32, "errors.taxIdMax"),
      billingLegalName: z.string().trim().min(2, "errors.legalNameMin").max(200, "errors.legalNameMax"),
      billingInvoiceEmail: z
        .string()
        .trim()
        .email({ message: "errors.emailInvalid" })
        .max(255, "errors.emailMax"),
      billingPhone: z.string().trim().min(8, "errors.phoneMin").max(40, "errors.phoneMax"),
      billingCountry: z.literal("CO"),
      billingAddressLine: z.string().trim().min(5, "errors.addressMin").max(255, "errors.addressMax"),
    })
    .superRefine((data, ctx) => {
      const idNorm = normalizeDigits(data.billingTaxId)
      const phoneNorm = normalizePhone(data.billingPhone)

      if (data.billingTaxIdType === "NIT") {
        if (!/^\d{8,11}$/.test(idNorm)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.nitFormat", path: ["billingTaxId"] })
        }
      } else if (data.billingTaxIdType === "CC" || data.billingTaxIdType === "TI") {
        if (!/^\d{6,11}$/.test(idNorm)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.ccFormat", path: ["billingTaxId"] })
        }
      } else if (data.billingTaxIdType === "CE" || data.billingTaxIdType === "PA") {
        if (data.billingTaxId.trim().length < 4) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.foreignIdMin", path: ["billingTaxId"] })
        }
      }

      const phoneDigits = phoneNorm.replace(/\D/g, "")
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.phoneFormat", path: ["billingPhone"] })
      }
    })
    .transform((data) => ({
      ...data,
      billingTaxId: normalizeDigits(data.billingTaxId),
      billingPhone: normalizePhone(data.billingPhone),
    }))
}

export type OrgInvoiceProfileInput = z.infer<ReturnType<typeof createOrgInvoiceProfileSchema>>

export function translateOrgInvoiceProfileError(
  t: (key: string) => string,
  zodError: z.ZodError
): string {
  const issue = zodError.issues[0]
  const msg = issue?.message ?? "errors.generic"
  if (msg.startsWith("errors.")) {
    return t(msg)
  }
  return t("errors.generic")
}
