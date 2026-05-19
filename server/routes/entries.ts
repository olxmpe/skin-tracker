import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { entries, skinAnalyses, dailyFactors, nutritionLogs } from '../db/schema'
import { eq, desc, gte, lte, and } from 'drizzle-orm'
import { getPhotoUrl } from '../storage/photos'

export const entriesRouter = Router()

// GET /api/entries — liste paginée
entriesRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0
  const from = req.query.from as string
  const to = req.query.to as string

  const conditions = []
  if (from) conditions.push(gte(entries.date, from))
  if (to) conditions.push(lte(entries.date, to))

  const rows = await db.query.entries.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(entries.date)],
    limit,
    offset,
  })

  // Enrichir avec analyses et URLs photos
  const enriched = await Promise.all(rows.map(async entry => {
    const analysis = await db.query.skinAnalyses.findFirst({
      where: eq(skinAnalyses.entryId, entry.id),
    })
    const photoUrl = entry.photoPath ? await getPhotoUrl(entry.photoPath) : null
    return { ...entry, analysis, photoUrl }
  }))

  res.json(enriched)
})

// GET /api/entries/:id
entriesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const entry = await db.query.entries.findFirst({ where: eq(entries.id, id) })
  if (!entry) return res.status(404).json({ error: 'Entrée introuvable' })

  const [analysis, factors, nutrition] = await Promise.all([
    db.query.skinAnalyses.findFirst({ where: eq(skinAnalyses.entryId, id) }),
    db.query.dailyFactors.findFirst({ where: eq(dailyFactors.entryId, id) }),
    db.query.nutritionLogs.findMany({ where: eq(nutritionLogs.entryId, id) }),
  ])

  const photoUrl = entry.photoPath ? await getPhotoUrl(entry.photoPath) : null
  res.json({ ...entry, photoUrl, analysis, factors, nutrition })
})

// DELETE /api/entries/:id
entriesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  await db.delete(entries).where(eq(entries.id, id))
  res.json({ ok: true })
})
