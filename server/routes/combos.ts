import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { combos } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export const combosRouter = Router()

combosRouter.get('/', async (req: Request, res: Response) => {
  const type = req.query.type as 'routine' | 'meal' | undefined
  const rows = await db.query.combos.findMany({
    where: type ? eq(combos.type, type) : undefined,
    orderBy: [asc(combos.name)],
  })
  res.json(rows.map(c => ({ ...c, items: JSON.parse(c.items) })))
})

combosRouter.post('/', async (req: Request, res: Response) => {
  const { name, type, description, items } = req.body as {
    name: string
    type: 'routine' | 'meal'
    description?: string
    items: unknown[]
  }
  const [combo] = await db.insert(combos).values({
    name, type, description,
    items: JSON.stringify(items),
  }).returning()
  res.json(combo)
})

combosRouter.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { name, description, items } = req.body as { name?: string; description?: string; items?: unknown[] }
  const [updated] = await db.update(combos).set({
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(items && { items: JSON.stringify(items) }),
  }).where(eq(combos.id, id)).returning()
  res.json(updated)
})

combosRouter.delete('/:id', async (req: Request, res: Response) => {
  await db.delete(combos).where(eq(combos.id, parseInt(req.params.id as string)))
  res.json({ ok: true })
})
