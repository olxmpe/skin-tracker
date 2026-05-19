import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { nutritionLogs, userProfile } from '../db/schema'
import { eq, desc, gte } from 'drizzle-orm'
import { checkProteinBalance } from '../utils/protein-check'
import { format, subDays } from 'date-fns'

export const nutritionRouter = Router()

nutritionRouter.get('/', async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const rows = await db.query.nutritionLogs.findMany({
    where: gte(nutritionLogs.date, since),
    orderBy: [desc(nutritionLogs.date)],
  })
  res.json(rows.map(r => ({ ...r, foods: JSON.parse(r.foods ?? '[]') })))
})

nutritionRouter.get('/today', async (_req: Request, res: Response) => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const rows = await db.query.nutritionLogs.findMany({ where: eq(nutritionLogs.date, today) })
  const totalProtein = rows.reduce((sum, r) => sum + (r.proteinG ?? 0), 0)
  const profile = await db.query.userProfile.findFirst()

  let proteinCheck = null
  if (profile?.weightKg) {
    proteinCheck = checkProteinBalance({
      consumedG: totalProtein,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel ?? 'moderate',
      customGoalG: profile.proteinGoalG ?? undefined,
    })
  }

  res.json({ logs: rows, totalProtein, proteinCheck })
})

nutritionRouter.post('/', async (req: Request, res: Response) => {
  const { date, description, foods, proteinG, carbsG, fatG, calories, meal } = req.body as {
    date?: string; description?: string; foods?: unknown[]
    proteinG?: number; carbsG?: number; fatG?: number; calories?: number
    meal?: string
  }
  const [log] = await db.insert(nutritionLogs).values({
    date: date ?? format(new Date(), 'yyyy-MM-dd'),
    description,
    foods: JSON.stringify(foods ?? []),
    proteinG, carbsG, fatG, calories,
    meal: meal as typeof nutritionLogs.$inferInsert['meal'],
    macrosSource: 'user_provided',
  }).returning()
  res.json(log)
})
