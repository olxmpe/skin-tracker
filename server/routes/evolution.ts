import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { evolutionProposals } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { generateEvolutionDiffs } from '../ai/evolution-agent'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

export const evolutionRouter = Router()

// GET /api/evolution — liste des propositions
evolutionRouter.get('/', async (_req: Request, res: Response) => {
  const proposals = await db.query.evolutionProposals.findMany({
    orderBy: [desc(evolutionProposals.createdAt)],
  })
  res.json(proposals)
})

// POST /api/evolution/:id/execute — appliquer une évolution confirmée
evolutionRouter.post('/:id/execute', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const proposal = await db.query.evolutionProposals.findFirst({
    where: eq(evolutionProposals.id, id),
  })

  if (!proposal || proposal.status !== 'confirmed') {
    return res.status(400).json({ error: 'Proposition non trouvée ou non confirmée' })
  }

  await db.update(evolutionProposals).set({ status: 'executing' }).where(eq(evolutionProposals.id, id))

  try {
    // Lire le schéma actuel
    const schemaPath = path.join(process.cwd(), 'server/db/schema.ts')
    const currentSchema = fs.readFileSync(schemaPath, 'utf-8')

    // Générer les diffs
    const diffs = await generateEvolutionDiffs({
      trigger: proposal.trigger,
      description: proposal.description,
      proposedChanges: proposal.proposedChanges,
      currentSchema,
    })

    // Créer une branche git
    const branchName = `evolution/${Date.now()}`
    execSync(`git checkout -b ${branchName}`)

    // Appliquer les changements fichier
    for (const change of diffs.file_changes) {
      const filePath = path.join(process.cwd(), change.path)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, change.content)
    }

    // Appliquer la migration SQL
    if (diffs.migration_sql) {
      const migDir = path.join(process.cwd(), 'server/db/migrations')
      fs.mkdirSync(migDir, { recursive: true })
      const migFile = path.join(migDir, `${Date.now()}_evolution.sql`)
      fs.writeFileSync(migFile, diffs.migration_sql)
    }

    // Commit + PR
    execSync('git add -A')
    execSync(`git commit -m "evolution: ${proposal.description.slice(0, 72)}"`)

    let prUrl = ''
    try {
      const result = execSync(
        `gh pr create --title "Auto-évolution: ${proposal.description.slice(0, 50)}" --body "${diffs.summary}" --head ${branchName}`,
        { encoding: 'utf-8' }
      )
      prUrl = result.trim().split('\n').pop() ?? ''
    } catch {
      prUrl = `branch:${branchName}`
    }

    await db.update(evolutionProposals).set({
      status: 'applied',
      prUrl,
      appliedAt: new Date().toISOString(),
    }).where(eq(evolutionProposals.id, id))

    // Notifier WhatsApp si configuré
    if (process.env.USER_WHATSAPP_NUMBER && process.env.META_WHATSAPP_TOKEN) {
      const { sendText } = await import('../whatsapp/client')
      await sendText(process.env.USER_WHATSAPP_NUMBER, `Skin Guru : PR ouverte → ${prUrl}`)
    }

    res.json({ ok: true, prUrl, diffs })
  } catch (err) {
    await db.update(evolutionProposals).set({ status: 'confirmed' }).where(eq(evolutionProposals.id, id))
    console.error('Evolution error:', err)
    res.status(500).json({ error: 'Erreur lors de l\'évolution' })
  }
})

// POST /api/evolution/:id/reject
evolutionRouter.post('/:id/reject', async (req: Request, res: Response) => {
  await db.update(evolutionProposals)
    .set({ status: 'rejected' })
    .where(eq(evolutionProposals.id, parseInt(req.params.id as string)))
  res.json({ ok: true })
})
