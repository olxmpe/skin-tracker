import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { userProfile } from '../db/schema'
import { eq } from 'drizzle-orm'

export const profileRouter = Router()

profileRouter.get('/', async (_req: Request, res: Response) => {
  const profile = await db.query.userProfile.findFirst()
  res.json(profile ?? null)
})

profileRouter.put('/', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>

  // Whitelist only editable fields — never let the client overwrite id/backgroundContext/createdAt
  const allowed = ['sex', 'age', 'weightKg', 'heightCm', 'proteinGoalG', 'carbsGoalG', 'fatGoalG',
    'caloriesGoal', 'activityLevel', 'skinConditions', 'cycleLength', 'lastPeriodDate']

  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  // skinConditions must be stored as JSON string, not JS array
  if (Array.isArray(data.skinConditions)) {
    data.skinConditions = JSON.stringify(data.skinConditions)
  }

  const existing = await db.query.userProfile.findFirst()

  if (existing) {
    const [updated] = await db.update(userProfile)
      .set({ ...(data as Partial<typeof userProfile.$inferInsert>), updatedAt: new Date().toISOString() })
      .where(eq(userProfile.id, existing.id))
      .returning()
    return res.json(updated)
  }

  const [created] = await db.insert(userProfile)
    .values(data as typeof userProfile.$inferInsert)
    .returning()
  res.json(created)
})
