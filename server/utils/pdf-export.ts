import { jsPDF } from 'jspdf'
import type { WeeklyReport } from '../ai/generate-report'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

export async function generateWeeklyPDF(report: WeeklyReport, weekData: {
  labels: string[]
  glassSkinScores: number[]
  radarCurrent: number[]
  radarPrevious: number[]
  proteinDays: number[]
  proteinGoal: number
}): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  let y = 15

  function addTitle(text: string, size = 16) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(97, 68, 58)
    doc.text(text, 15, y)
    y += size * 0.6
  }

  function addText(text: string, size = 10) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    const lines = doc.splitTextToSize(text, W - 30)
    doc.text(lines, 15, y)
    y += lines.length * size * 0.45 + 2
  }

  function addScoreRow(label: string, value: number | string) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
    doc.text(`  ${label} : ${value}`, 15, y)
    y += 6
  }

  // ── Entête ──
  addTitle(`Rapport Skin Guru — ${report.period}`, 18)
  y += 3
  addText(`Glass Skin Score : tendance ${report.glass_skin_trend >= 0 ? '+' : ''}${report.glass_skin_trend.toFixed(1)} cette semaine`)
  y += 3

  // ── Scores Glass Skin ──
  addTitle('Évolution Glass Skin Score', 13)
  if (weekData.labels.length > 0) {
    for (let i = 0; i < weekData.labels.length; i++) {
      addScoreRow(weekData.labels[i], weekData.glassSkinScores[i]?.toFixed(1) ?? '-')
    }
  }
  y += 3

  // ── Dimensions cutanées ──
  const DIMENSIONS = ['Hydratation', 'Éclat', 'Texture', 'Élasticité', 'Rosacée (inv)', 'Pores', 'Cernes', 'Brillance']
  addTitle('Dimensions cutanées (semaine courante)', 13)
  for (let i = 0; i < DIMENSIONS.length; i++) {
    const curr = weekData.radarCurrent[i]?.toFixed(1) ?? '-'
    const prev = weekData.radarPrevious[i]?.toFixed(1) ?? '-'
    addScoreRow(DIMENSIONS[i], `${curr} (préc. ${prev})`)
  }
  y += 3

  // ── Corrélations ──
  if (report.correlations.length > 0) {
    addTitle('Corrélations détectées', 13)
    for (const c of report.correlations.slice(0, 5)) {
      addText(`• ${c.factor} → ${c.impact} (confiance ${Math.round(c.confidence * 100)}%)`)
    }
    y += 3
  }

  // ── Nutrition ──
  addTitle('Nutrition', 13)
  addText(`Protéines : ${report.avg_protein_g}g/j en moyenne — objectif atteint ${report.protein_goal_met_days}/7 jours`)
  if (weekData.labels.length > 0) {
    for (let i = 0; i < weekData.labels.length; i++) {
      addScoreRow(weekData.labels[i], `${weekData.proteinDays[i] ?? 0}g / objectif ${weekData.proteinGoal}g`)
    }
  }
  y += 3

  // ── Recommandations ──
  if (y + 40 > 270) { doc.addPage(); y = 15 }
  addTitle('Recommandations', 13)
  addText(`Action prioritaire : ${report.priority_action}`)
  for (const r of report.weekly_recommendations) {
    addText(`• ${r}`)
  }

  // ── Pied de page ──
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(`Généré par Skin Guru — ${new Date().toLocaleDateString('fr-FR')}`, 15, 285)

  return Buffer.from(doc.output('arraybuffer'))
}

export async function savePDFTemp(buffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir()
  const filename = `skintracker-report-${crypto.randomBytes(4).toString('hex')}.pdf`
  const filePath = path.join(tmpDir, filename)
  fs.writeFileSync(filePath, buffer)
  return filePath
}
