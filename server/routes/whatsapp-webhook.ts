import { Router, Request, Response } from 'express'
import { validateWebhookSignature, parseWebhookPayload } from '../whatsapp/client'
import { handleIncomingMessage } from '../whatsapp/handler'

export const whatsappRouter = Router()

// Vérification webhook Meta (GET)
whatsappRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('✓ Webhook WhatsApp vérifié')
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

// Réception des messages (POST)
whatsappRouter.post('/', async (req: Request, res: Response) => {
  // Valider la signature
  const signature = req.headers['x-hub-signature-256'] as string
  if (signature && !validateWebhookSignature(JSON.stringify(req.body), signature)) {
    return res.sendStatus(401)
  }

  // Répondre 200 immédiatement (Meta exige < 20s)
  res.sendStatus(200)

  const msg = parseWebhookPayload(req.body as Record<string, unknown>)
  if (!msg) return

  handleIncomingMessage(msg).catch(err => {
    console.error('Erreur handler WhatsApp:', err)
  })
})
