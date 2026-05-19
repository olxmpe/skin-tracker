import * as crypto from 'crypto'

const GRAPH_API = 'https://graph.facebook.com/v20.0'

function headers() {
  return {
    Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// ── Envoyer un message texte ──────────────────────────────────────────────────
export async function sendText(to: string, text: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
}

// ── Envoyer une image ─────────────────────────────────────────────────────────
export async function sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, ...(caption ? { caption } : {}) },
    }),
  })
}

// ── Envoyer un document (PDF) ─────────────────────────────────────────────────
export async function sendDocument(to: string, docUrl: string, filename: string, caption?: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: {
        link: docUrl,
        filename,
        ...(caption ? { caption } : {}),
      },
    }),
  })
}

// ── Envoyer des boutons interactifs ───────────────────────────────────────────
export async function sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    }),
  })
}

// ── Télécharger un média (photo/audio) ────────────────────────────────────────
export async function downloadMedia(mediaId: string): Promise<Buffer> {
  // 1. Obtenir l'URL du média
  const urlResp = await fetch(`${GRAPH_API}/${mediaId}`, { headers: headers() })
  const { url } = await urlResp.json() as { url: string }

  // 2. Télécharger le fichier
  const mediaResp = await fetch(url, { headers: headers() })
  const arrayBuffer = await mediaResp.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ── Valider la signature webhook ──────────────────────────────────────────────
export function validateWebhookSignature(rawBody: string, signature: string): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return true   // désactivé si secret non configuré (dev)
  const expected = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

// ── Parser les messages entrants ──────────────────────────────────────────────
export interface IncomingMessage {
  from: string
  type: 'text' | 'image' | 'audio' | 'button_reply' | 'unknown'
  text?: string
  mediaId?: string
  buttonId?: string
  buttonTitle?: string
  messageId: string
}

export function parseWebhookPayload(body: Record<string, unknown>): IncomingMessage | null {
  try {
    const entry = (body.entry as Array<{ changes: Array<{ value: { messages?: unknown[] } }> }>)[0]
    const value = entry.changes[0].value
    const messages = value.messages as Array<Record<string, unknown>>
    if (!messages || messages.length === 0) return null

    const msg = messages[0] as {
      from: string
      id: string
      type: string
      text?: { body: string }
      image?: { id: string }
      audio?: { id: string }
      interactive?: { button_reply?: { id: string; title: string } }
    }

    const base = { from: msg.from, messageId: msg.id }

    if (msg.type === 'text' && msg.text) {
      return { ...base, type: 'text', text: msg.text.body }
    }
    if (msg.type === 'image' && msg.image) {
      return { ...base, type: 'image', mediaId: msg.image.id }
    }
    if (msg.type === 'audio' && msg.audio) {
      return { ...base, type: 'audio', mediaId: msg.audio.id }
    }
    if (msg.type === 'interactive' && msg.interactive?.button_reply) {
      return {
        ...base,
        type: 'button_reply',
        buttonId: msg.interactive.button_reply.id,
        buttonTitle: msg.interactive.button_reply.title,
      }
    }
    return { ...base, type: 'unknown' }
  } catch {
    return null
  }
}
