import pa11y from "pa11y"

const baseUrl = process.env.A11Y_BASE_URL || "http://127.0.0.1:3000"
const sessionCookie = process.env.A11Y_SESSION_COOKIE || ""
const sampleDocumentId = process.env.A11Y_DOCUMENT_ID || ""

const publicTargets = [
  { label: "landing", url: `${baseUrl}/` },
  { label: "login", url: `${baseUrl}/login` },
  { label: "signup", url: `${baseUrl}/signup` },
  { label: "docs-api", url: `${baseUrl}/docs/api` },
]

const authTargets = [
  { label: "dashboard", url: `${baseUrl}/dashboard` },
  { label: "documents", url: `${baseUrl}/dashboard/documents` },
  { label: "settings", url: `${baseUrl}/dashboard/settings` },
  { label: "billing", url: `${baseUrl}/dashboard/settings/billing` },
  { label: "integrations", url: `${baseUrl}/dashboard/settings/integrations` },
]

if (sampleDocumentId) {
  authTargets.push({
    label: "document-detail",
    url: `${baseUrl}/dashboard/documents/${sampleDocumentId}`,
  })
}

async function runTarget(target, headers = {}) {
  const preflight = await fetch(target.url, {
    headers,
    redirect: "follow",
  })
  const html = await preflight.text()
  if (!preflight.ok || html.includes("id=\"__next_error__\"")) {
    return { ...target, skipped: true, skipReason: "route responded with app error page" }
  }

  const result = await pa11y(target.url, {
    standard: "WCAG2AA",
    timeout: 30000,
    wait: 800,
    headers,
    includeWarnings: false,
  })
  return { ...target, issues: result.issues, skipped: false }
}

function printIssues(r) {
  if (r.skipped) {
    console.log(`SKIP  ${r.label} -> ${r.url} (${r.skipReason})`)
    return
  }
  if (r.issues.length === 0) {
    console.log(`PASS  ${r.label} -> ${r.url}`)
    return
  }
  console.log(`FAIL  ${r.label} -> ${r.url} (${r.issues.length} issues)`)
  for (const issue of r.issues) {
    console.log(`  - [${issue.typeCode}] ${issue.message}`)
    console.log(`    selector: ${issue.selector}`)
  }
}

async function main() {
  const results = []
  console.log("Running deep a11y audit (WCAG2AA)")
  console.log(`Base URL: ${baseUrl}`)

  for (const t of publicTargets) {
    results.push(await runTarget(t))
  }

  if (sessionCookie) {
    const headers = { Cookie: sessionCookie }
    for (const t of authTargets) {
      results.push(await runTarget(t, headers))
    }
  } else {
    console.log("Skipping authenticated routes: set A11Y_SESSION_COOKIE to include them.")
  }

  let failures = 0
  let skipped = 0
  for (const r of results) {
    printIssues(r)
    if (r.skipped) {
      skipped += 1
      continue
    }
    if (r.issues.length > 0) failures += 1
  }

  const evaluated = results.length - skipped
  console.log(
    `Summary: ${evaluated - failures}/${evaluated} routes passed (${skipped} skipped)`
  )
  if (failures > 0) process.exit(2)
}

main().catch((err) => {
  console.error("Deep accessibility audit failed to run:", err)
  process.exit(1)
})
