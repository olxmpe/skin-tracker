import cron from 'node-cron'
import { db } from '../db/client'
import { skinAnalyses, nutritionLogs, dailyFactors, userProfile } from '../db/schema'
import { gte } from 'drizzle-orm'
import { format, subDays, startOfWeek } from 'date-fns'
import { generateWeeklyReport } from '../ai/generate-report'
import { generateWeeklyPDF } from '../utils/pdf-export'
import { savePhoto, getPhotoUrl } from '../storage/photos'
import { sendEmail } from '../utils/email'

export async function generateAndSendWeeklyReport(to: string): Promise<void> {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const since = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  const [analyses, nutrition, factors, profile] = await Promise.all([
    db.query.skinAnalyses.findMany({ where: gte(skinAnalyses.date, since) }),
    db.query.nutritionLogs.findMany({ where: gte(nutritionLogs.date, since) }),
    db.query.dailyFactors.findMany({ where: gte(dailyFactors.date, since) }),
    db.query.userProfile.findFirst(),
  ])

  if (analyses.length < 3) {
    await sendEmail({
      to,
      subject: 'Skin Guru — pas assez de données cette semaine',
      html: '<p>Pas assez de check-ins cette semaine pour générer un rapport. Continue les check-ins quotidiens !</p>',
    })
    return
  }

  const report = await generateWeeklyReport({
    analyses: JSON.stringify(analyses),
    nutrition: JSON.stringify(nutrition),
    factors: JSON.stringify(factors),
    profile: JSON.stringify(profile),
  })

  // Préparer les données graphiques
  const sorted = [...analyses].sort((a, b) => a.date.localeCompare(b.date))
  const labels = sorted.map(a => a.date.slice(5))
  const glassSkinScores = sorted.map(a => a.glassSkinScore ?? 0)

  // Radar : dernière semaine vs semaine précédente (dummy si pas de données J-14)
  const radarCurrent = [
    analyses[0]?.acneScore, analyses[0]?.hydrationScore, analyses[0]?.radianceScore,
    analyses[0]?.textureScore, analyses[0]?.firmnessScore, analyses[0]?.evennessScore,
    analyses[0]?.fineLinesScore, analyses[0]?.barrierScore,
  ].map(v => v ?? 0)
  const radarPrevious = radarCurrent.map(() => 5)   // baseline si pas de J-30

  const proteinDays = sorted.map(d => {
    const log = nutrition.find(n => n.date === d.date)
    return log?.proteinG ?? 0
  })

  // Générer le PDF
  const pdfBuffer = await generateWeeklyPDF(report, {
    labels,
    glassSkinScores,
    radarCurrent,
    radarPrevious,
    proteinDays,
    proteinGoal: profile?.proteinGoalG ?? 80,
  })

  // Sauvegarder le PDF
  const pdfPath = await savePhoto(pdfBuffer, 'pdf')
  const pdfUrl = await getPhotoUrl(pdfPath, 86400)   // URL valide 24h

  // Envoyer par email avec le PDF en pièce jointe
  await sendEmail({
    to,
    subject: `Skin Guru — Rapport semaine du ${weekStart}`,
    html: buildReportHtml(report.whatsapp_summary, weekStart),
    attachments: [{
      filename: `rapport-skin-${weekStart}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  })
}

function buildReportHtml(summary: string, weekStart: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #292524; }
  h1 { color: #977669; font-size: 22px; }
  .summary { background: #fdf8f6; border-radius: 12px; padding: 16px; line-height: 1.6; white-space: pre-line; }
  .footer { margin-top: 24px; font-size: 11px; color: #a8a29e; }
</style></head>
<body>
  <h1>✦ Skin Guru — Rapport semaine du ${weekStart}</h1>
  <div class="summary">${summary}</div>
  <p class="footer">Le rapport PDF détaillé est en pièce jointe.</p>
</body>
</html>`
}

export function startWeeklyReportCron(): void {
  const cronExpr = process.env.WEEKLY_REPORT_CRON ?? '0 8 * * 1'
  const to = process.env.REPORT_EMAIL ?? process.env.USER_EMAIL

  if (!to) {
    console.log('⚠️  REPORT_EMAIL non configuré — rapport hebdomadaire désactivé')
    return
  }

  cron.schedule(cronExpr, () => {
    console.log('📊 Génération rapport hebdomadaire...')
    generateAndSendWeeklyReport(to).catch(err => console.error('Rapport hebdo error:', err))
  }, { timezone: 'Europe/Paris' })

  console.log(`✓ Rapport hebdomadaire planifié : ${cronExpr} (Europe/Paris)`)
}
