import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { skinAnalyses, nutritionLogs, dailyFactors, entries } from '../db/schema'
import { gte, desc, and, lte } from 'drizzle-orm'
import { format, subDays } from 'date-fns'
import { computeRosaceaTriggerCorrelations } from '../utils/correlations'

export const analyticsRouter = Router()

// GET /api/analytics/overview?period=30d
analyticsRouter.get('/overview', async (req: Request, res: Response) => {
  const days = parseInt((req.query.period as string)?.replace('d', '') || '30')
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const analyses = await db.query.skinAnalyses.findMany({
    where: gte(skinAnalyses.date, since),
    orderBy: [desc(skinAnalyses.date)],
  })

  res.json({
    dates: analyses.map(a => a.date),
    glass_skin_score: analyses.map(a => a.glassSkinScore),
    rosacea_score: analyses.map(a => a.rosaceaScore),
    dimensions: {
      acne: analyses.map(a => a.acneScore),
      hydration: analyses.map(a => a.hydrationScore),
      radiance: analyses.map(a => a.radianceScore),
      texture: analyses.map(a => a.textureScore),
      firmness: analyses.map(a => a.firmnessScore),
      evenness: analyses.map(a => a.evennessScore),
      fine_lines: analyses.map(a => a.fineLinesScore),
      barrier: analyses.map(a => a.barrierScore),
    },
    count: analyses.length,
  })
})

// GET /api/analytics/zones?period=30d
analyticsRouter.get('/zones', async (req: Request, res: Response) => {
  const days = parseInt((req.query.period as string)?.replace('d', '') || '30')
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const analyses = await db.query.skinAnalyses.findMany({
    where: gte(skinAnalyses.date, since),
    orderBy: [desc(skinAnalyses.date)],
  })

  // Agréger les scores par zone
  const zoneAggs: Record<string, { dates: string[]; scores: number[] }> = {}
  for (const a of analyses) {
    if (!a.zones) continue
    const zones = JSON.parse(a.zones) as Record<string, { score: number }>
    for (const [zone, data] of Object.entries(zones)) {
      if (!zoneAggs[zone]) zoneAggs[zone] = { dates: [], scores: [] }
      zoneAggs[zone].dates.push(a.date)
      zoneAggs[zone].scores.push(data.score ?? 0)
    }
  }

  res.json(zoneAggs)
})

// GET /api/analytics/nutrition?period=7d
analyticsRouter.get('/nutrition', async (req: Request, res: Response) => {
  const days = parseInt((req.query.period as string)?.replace('d', '') || '7')
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const logs = await db.query.nutritionLogs.findMany({
    where: gte(nutritionLogs.date, since),
    orderBy: [desc(nutritionLogs.date)],
  })

  res.json(logs.map(l => ({
    date: l.date,
    protein_g: l.proteinG,
    carbs_g: l.carbsG,
    fat_g: l.fatG,
    calories: l.calories,
  })))
})

// GET /api/analytics/consistency?period=90d
analyticsRouter.get('/consistency', async (req: Request, res: Response) => {
  const days = parseInt((req.query.period as string)?.replace('d', '') || '90')
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const rows = await db.query.entries.findMany({
    where: gte(entries.date, since),
  })

  const entryDates = new Set(rows.map(r => r.date))
  const result: Array<{ date: string; has_entry: boolean }> = []

  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    result.push({ date, has_entry: entryDates.has(date) })
  }

  res.json(result)
})

// GET /api/analytics/correlations
analyticsRouter.get('/correlations', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30
  const correlations = await computeRosaceaTriggerCorrelations(days)
  res.json(correlations)
})
