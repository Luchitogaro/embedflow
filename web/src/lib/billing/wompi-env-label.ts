export function getWompiEnvLabel(): string {
  const w = process.env.WOMPI_ENV?.toLowerCase()
  if (w === "production" || w === "prod") return "prod"
  if (w === "sandbox" || w === "test" || !w) return "test"
  return w.slice(0, 8)
}
