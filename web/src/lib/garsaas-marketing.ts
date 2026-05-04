import type { Locale } from '@/lib/i18n/config'

const base = (process.env.NEXT_PUBLIC_GARSAAS_MARKETING_BASE ?? 'https://garsaas.io').replace(/\/$/, '')

export function garsaasProductPricingUrl(
  locale: Locale,
  product: 'embedflow' | 'babyfirst' | 'agrobrain',
): string {
  return `${base}/${locale}/productos/${product}#product-pricing-title`
}
