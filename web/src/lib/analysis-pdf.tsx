import React from "react"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45,
  },
  brand: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  title: { fontSize: 15, fontWeight: "bold", marginBottom: 4, color: "#0f172a" },
  meta: { fontSize: 9, color: "#64748b", marginBottom: 20 },
  h2: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#1e293b",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 3,
  },
  body: { marginBottom: 6, color: "#334155" },
  bullet: { marginLeft: 8, marginBottom: 4, color: "#334155", paddingLeft: 4 },
  riskBlock: { marginBottom: 8, padding: 6, backgroundColor: "#f8fafc", borderRadius: 2 },
  riskTitle: { fontSize: 9, fontWeight: "bold", color: "#0f172a" },
  riskMeta: { fontSize: 8, color: "#64748b", marginTop: 2 },
  riskBody: { fontSize: 9, color: "#475569", marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
})

export type AnalysisPdfLabels = {
  execSummary: string
  pitchTitle: string
  keyPoints: string
  risks: string
  disclaimer: string
}

export type AnalysisPdfRisk = {
  clause: string
  risk_level: string
  explanation: string
  recommendation?: string
}

export type AnalysisPdfProps = {
  filename: string
  generatedAt: string
  labels: AnalysisPdfLabels
  summary: string | null
  pitch: string | null
  keyPoints: string[]
  riskFlags: AnalysisPdfRisk[]
}

function truncate(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function AnalysisPdfDocument({
  filename,
  generatedAt,
  labels,
  summary,
  pitch,
  keyPoints,
  riskFlags,
}: AnalysisPdfProps) {
  const risksToShow = riskFlags.slice(0, 12)

  return (
    <Document title={`${filename} — Embedflow`} creator="Embedflow">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Embedflow — Contract analysis</Text>
        <Text style={styles.title}>{truncate(filename, 120)}</Text>
        <Text style={styles.meta}>{generatedAt}</Text>

        <Text style={styles.h2}>{labels.execSummary}</Text>
        <Text style={styles.body}>{summary ? truncate(summary, 3500) : "—"}</Text>

        {keyPoints.length > 0 ? (
          <>
            <Text style={styles.h2}>{labels.keyPoints}</Text>
            {keyPoints.slice(0, 20).map((p, i) => (
              <Text key={i} style={styles.bullet}>
                • {truncate(p, 500)}
              </Text>
            ))}
          </>
        ) : null}

        {pitch ? (
          <>
            <Text style={styles.h2}>{labels.pitchTitle}</Text>
            <Text style={styles.body}>{truncate(pitch, 2000)}</Text>
          </>
        ) : null}

        {risksToShow.length > 0 ? (
          <>
            <Text style={styles.h2}>{labels.risks}</Text>
            {risksToShow.map((r, i) => (
              <View key={i} style={styles.riskBlock} wrap={false}>
                <Text style={styles.riskTitle}>{truncate(r.clause, 200)}</Text>
                <Text style={styles.riskMeta}>{r.risk_level}</Text>
                <Text style={styles.riskBody}>{truncate(r.explanation, 800)}</Text>
                {r.recommendation ? (
                  <Text style={styles.riskBody}>→ {truncate(r.recommendation, 400)}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.footer} fixed>
          {labels.disclaimer}
        </Text>
      </Page>
    </Document>
  )
}
