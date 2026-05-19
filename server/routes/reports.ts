import { Router, Request, Response } from 'express'
import { generateAndSendWeeklyReport } from '../jobs/weekly-report'

export const reportsRouter = Router()

// POST /api/reports/weekly — déclenche le rapport manuellement
reportsRouter.post('/weekly', async (req: Request, res: Response) => {
  const to = (req.body as { to?: string }).to ?? process.env.USER_WHATSAPP_NUMBER
  if (!to) return res.status(400).json({ error: 'Numéro WhatsApp requis (to)' })

  res.json({ ok: true, message: 'Rapport en cours de génération' })
  generateAndSendWeeklyReport(to).catch(err => console.error('Rapport error:', err))
})
