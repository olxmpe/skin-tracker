import { db } from '../db/client'
import { skinAnalyses, dailyFactors, nutritionLogs } from '../db/schema'
import { gte, desc } from 'drizzle-orm'
import { subDays, format } from 'date-fns'

const MIN_OCCURRENCES: Record<string, number> = {
  product_zone: 7,
  inci_zone: 14,
  food_zone: 8,
  trigger_flush: 5,
}
const MIN_CONFIDENCE: Record<string, number> = {
  product_zone: 0.5,
  inci_zone: 0.6,
  food_zone: 0.65,
  trigger_flush: 0.7,
}

export interface Correlation {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  impactScore: number    // delta moyen du score
  confidence: number     // 0-1
  dataPoints: number
  zone?: string
}

export async function computeRosaceaTriggerCorrelations(days = 30): Promise<Correlation[]> {
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const factors = await db.query.dailyFactors.findMany({
    where: gte(dailyFactors.date, since),
    orderBy: [desc(dailyFactors.date)],
  })

  const analyses = await db.query.skinAnalyses.findMany({
    where: gte(skinAnalyses.date, since),
    orderBy: [desc(skinAnalyses.date)],
  })

  const analysisByDate = new Map(analyses.map(a => [a.date, a]))
  const triggerFields = ['alcohol', 'spicyFood', 'hotDrinks', 'heatExposure', 'sunExposure', 'intensiveExercise', 'stress'] as const
  const results: Correlation[] = []

  for (const field of triggerFields) {
    const withTrigger: number[] = []
    const withoutTrigger: number[] = []

    for (const f of factors) {
      const analysis = analysisByDate.get(f.date)
      if (!analysis?.rosaceaScore) continue
      if (f[field]) withTrigger.push(analysis.rosaceaScore)
      else withoutTrigger.push(analysis.rosaceaScore)
    }

    if (withTrigger.length < MIN_OCCURRENCES.trigger_flush) continue

    const avgWith = withTrigger.reduce((a, b) => a + b, 0) / withTrigger.length
    const avgWithout = withoutTrigger.length
      ? withoutTrigger.reduce((a, b) => a + b, 0) / withoutTrigger.length
      : null

    if (avgWithout === null) continue

    const delta = avgWith - avgWithout
    const dataPoints = withTrigger.length

    // Confiance basée sur volume de données
    const confidence = Math.min(0.95, 0.5 + (dataPoints - MIN_OCCURRENCES.trigger_flush) * 0.05)

    if (confidence >= MIN_CONFIDENCE.trigger_flush && Math.abs(delta) > 0.3) {
      results.push({
        factor: field,
        impact: delta < 0 ? 'negative' : 'positive',
        impactScore: delta,
        confidence,
        dataPoints,
      })
    }
  }

  return results.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore))
}
