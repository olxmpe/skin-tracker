import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { knownFoods } from '../db/schema'
import { eq, like, desc, sql } from 'drizzle-orm'

export const knownFoodsRouter = Router()

knownFoodsRouter.get('/', async (req: Request, res: Response) => {
  const q = req.query.q as string
  const rows = await db.query.knownFoods.findMany({
    where: q ? like(knownFoods.name, `%${q.toLowerCase()}%`) : undefined,
    orderBy: [desc(knownFoods.timesLogged)],
    limit: 50,
  })
  res.json(rows)
})

knownFoodsRouter.post('/', async (req: Request, res: Response) => {
  const data = req.body as typeof knownFoods.$inferInsert
  const [food] = await db.insert(knownFoods).values(data)
    .onConflictDoUpdate({ target: knownFoods.name, set: { timesLogged: sql`${knownFoods.timesLogged} + 1` } })
    .returning()
  res.json(food)
})

knownFoodsRouter.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const [updated] = await db.update(knownFoods).set(req.body as Partial<typeof knownFoods.$inferInsert>)
    .where(eq(knownFoods.id, id)).returning()
  res.json(updated)
})

knownFoodsRouter.delete('/:id', async (req: Request, res: Response) => {
  await db.delete(knownFoods).where(eq(knownFoods.id, parseInt(req.params.id as string)))
  res.json({ ok: true })
})
