import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { products, inciIngredients } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { parseInci } from '../ai/parse-inci'

export const productsRouter = Router()

productsRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await db.query.products.findMany({ orderBy: [desc(products.createdAt)] })
  res.json(rows)
})

productsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const product = await db.query.products.findFirst({ where: eq(products.id, id) })
  if (!product) return res.status(404).json({ error: 'Produit introuvable' })
  const ingredients = await db.query.inciIngredients.findMany({
    where: eq(inciIngredients.productId, id),
  })
  res.json({ ...product, ingredients: ingredients.map(i => ({ ...i, functions: JSON.parse(i.functions ?? '[]'), concerns: JSON.parse(i.concerns ?? '[]') })) })
})

productsRouter.post('/', async (req: Request, res: Response) => {
  const { name, brand, category, inciRaw, notes } = req.body as {
    name: string; brand?: string; category?: string; inciRaw?: string; notes?: string
  }
  const [product] = await db.insert(products).values({ name, brand, category: category as typeof products.$inferInsert['category'], inciRaw, notes }).returning()

  // Parser INCI si fourni
  if (inciRaw) {
    const ingredients = await parseInci(inciRaw)
    await Promise.all(ingredients.map(ing =>
      db.insert(inciIngredients).values({
        productId: product.id,
        name: ing.name,
        inci: ing.inci,
        riskLevel: ing.risk_level,
        functions: JSON.stringify(ing.functions),
        concerns: JSON.stringify(ing.concerns),
        comedogenic: ing.comedogenic,
        irritant: ing.irritant,
        allergen: ing.allergen,
      })
    ))
  }

  res.json(product)
})

productsRouter.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { name, brand, isActive, inciRaw } = req.body as {
    name?: string; brand?: string; isActive?: boolean; inciRaw?: string
  }
  const [updated] = await db.update(products).set({
    ...(name && { name }),
    ...(brand !== undefined && { brand }),
    ...(isActive !== undefined && { isActive }),
    ...(inciRaw !== undefined && { inciRaw }),
  }).where(eq(products.id, id)).returning()

  // Re-parser INCI si mis à jour
  if (inciRaw) {
    await db.delete(inciIngredients).where(eq(inciIngredients.productId, id))
    const ingredients = await parseInci(inciRaw)
    await Promise.all(ingredients.map(ing =>
      db.insert(inciIngredients).values({
        productId: id, name: ing.name, inci: ing.inci,
        riskLevel: ing.risk_level, functions: JSON.stringify(ing.functions),
        concerns: JSON.stringify(ing.concerns), comedogenic: ing.comedogenic,
        irritant: ing.irritant, allergen: ing.allergen,
      })
    ))
  }
  res.json(updated)
})

productsRouter.delete('/:id', async (req: Request, res: Response) => {
  await db.delete(products).where(eq(products.id, parseInt(req.params.id as string)))
  res.json({ ok: true })
})
