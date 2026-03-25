export function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  let s = template
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
