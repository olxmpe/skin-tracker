import { jsPDF } from 'jspdf'
import { renderChart } from '../storage/charts'
import { glassLineConfig, radarConfig, barConfig } from './chart-configs'
import type { WeeklyReport } from '../ai/generate-report'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

// Exported for charts.ts
export { renderChart }

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

  async function addChart(config: object, w = 170, h = 60) {
    if (y + h > 270) { doc.addPage(); y = 15 }
    const { createCanvas } = await import('canvas')
    const canvas = createCanvas(w * 3.78, h * 3.78)
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)
    // @ts-expect-error canvas compat
    const chart = new Chart(canvas, config)
    const imgData = canvas.toDataURL('image/png')
    doc.addImage(imgData, 'PNG', 15, y, w, h)
    chart.destroy()
    y += h + 5
  }

  // ── Entête ──
  addTitle(`Rapport Skin Guru — ${report.period}`, 18)
  y += 3
  addText(`Glass Skin Score : tendance ${report.glass_skin_trend >= 0 ? '+' : ''}${report.glass_skin_trend.toFixed(1)} cette semaine`)
  y += 3

  // ── Courbe glass skin ──
  addTitle('Évolution Glass Skin Score', 13)
  await addChart(glassLineConfig({ labels: weekData.labels, scores: weekData.glassSkinScores }), 170, 65)

  // ── Radar dimensions ──
  addTitle('Dimensions cutanées', 13)
  await addChart(radarConfig({ current: weekData.radarCurrent, previous: weekData.radarPrevious }), 120, 120)

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
  if (weekData.labels.length > 0) {
    await addChart(barConfig({
      labels: weekData.labels,
      values: weekData.proteinDays,
      goal: weekData.proteinGoal,
      label: 'Protéines (g)',
    }), 170, 55)
  }
  addText(`Protéines : ${report.avg_protein_g}g/j en moyenne — objectif atteint ${report.protein_goal_met_days}/7 jours`)

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
