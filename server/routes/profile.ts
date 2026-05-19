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
  const data = req.body as Partial<typeof userProfile.$inferInsert>
  const existing = await db.query.userProfile.findFirst()

  if (existing) {
    const [updated] = await db.update(userProfile)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(userProfile.id, existing.id))
      .returning()
    return res.json(updated)
  }

  const [created] = await db.insert(userProfile).values(data).returning()
  res.json(created)
})
