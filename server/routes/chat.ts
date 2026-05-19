import { Router, Request, Response } from 'express'
import multer from 'multer'
import { db } from '../db/client'
import { chatMessages, chatSession, entries, skinAnalyses, dailyFactors, nutritionLogs, knownFoods, evolutionProposals, userProfile } from '../db/schema'
import { analyzePhoto } from '../ai/analyze-photo'
import { extractFromVoice } from '../ai/extract-voice'
import { getModel } from '../ai/client'
import { checkProteinBalance } from '../utils/protein-check'
import { detectSignal } from '../ai/signal-detector'
import { savePhoto, getPhotoUrl } from '../storage/photos'
import { SKIN_GURU_PERSONA } from '../ai/persona'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { format, subDays } from 'date-fns'

export const chatRouter = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// ── Helpers SSE ───────────────────────────────────────────────────────────────
function sseSetup(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
}

function sseWrite(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

async function addMessage(role: 'user' | 'assistant', type: string, content: string, extra: {
  mediaPath?: string; buttons?: string[]; analysisId?: number
} = {}) {
  const [msg] = await db.insert(chatMessages).values({
    role, type: type as typeof chatMessages.$inferInsert['type'],
    content, mediaPath: extra.mediaPath,
    buttons: JSON.stringify(extra.buttons ?? []),
    analysisId: extra.analysisId,
  }).returning()
  return msg
}

async function getOrCreateSession() {
  let session = await db.query.chatSession.findFirst()
  if (!session) {
    [session] = await db.insert(chatSession).values({ step: 'idle' }).returning()
  }
  return session
}

// ── GET /api/chat/history ─────────────────────────────────────────────────────
chatRouter.get('/history', async (_req: Request, res: Response) => {
  const todayStart = format(new Date(), 'yyyy-MM-dd') + ' 00:00:00'
  const messages = await db.query.chatMessages.findMany({
    where: gte(chatMessages.createdAt, todayStart),
    orderBy: [desc(chatMessages.id)],
    limit: 100,
  })
  res.json(messages.reverse().map(m => ({
    ...m,
    buttons: JSON.parse(m.buttons ?? '[]'),
  })))
})

// ── POST /api/chat/message ────────────────────────────────────────────────────
chatRouter.post('/message', upload.single('file'), async (req: Request, res: Response) => {
  sseSetup(res)

  const type = req.body.type as 'text' | 'photo' | 'audio' | 'button'
  const text = req.body.text as string | undefined
  const buttonValue = req.body.buttonValue as string | undefined

  const session = await getOrCreateSession()

  try {
    // ── Photo envoyée ──────────────────────────────────────────────────────────
    if (type === 'photo' && req.file) {
      const photoPath = await savePhoto(req.file.buffer, 'jpg')
      const photoUrl = await getPhotoUrl(photoPath)
      const photoBase64 = req.file.buffer.toString('base64')

      await addMessage('user', 'photo', photoUrl ?? photoPath, { mediaPath: photoPath })

      // Stocker en session pour l'étape 2
      await db.update(chatSession).set({
        step: 'awaiting_context',
        pendingPhotoPath: photoPath,
        pendingPhotoBase64: photoBase64,
        updatedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      }).where(eq(chatSession.id, session.id))

      const guruMsg = await addMessage('assistant', 'text',
        'Photo reçue ✦ Dites-moi maintenant comment vous vous sentez — un message vocal ou quelques mots : routine du jour, ce que vous avez mangé, votre sommeil, votre niveau de stress...'
      )
      sseWrite(res, { type: 'message', message: { ...guruMsg, buttons: [] } })
      sseWrite(res, { type: 'done' })
      return res.end()
    }

    // ── Texte ou audio : contexte du jour ─────────────────────────────────────
    if ((type === 'text' && text) || (type === 'audio' && req.file)) {
      let transcript = text ?? ''

      if (type === 'audio' && req.file) {
        try {
          const model = getModel({ model: 'gemini-2.0-flash', maxTokens: 512 })
          const result = await model.generateContent([
            'Transcris ce message vocal en français. Uniquement la transcription, sans commentaire.',
            { inlineData: { mimeType: 'audio/webm', data: req.file.buffer.toString('base64') } },
          ])
          transcript = result.response.text().trim()
        } catch {
          transcript = ''
        }
        const displayText = transcript || '🎙 Message vocal'
        await addMessage('user', 'audio', displayText)
        sseWrite(res, { type: 'transcript', text: displayText })
      } else {
        await addMessage('user', 'text', transcript)
      }

      // ── Si on a une photo en attente → analyse complète ──────────────────────
      if (session.step === 'awaiting_context' && session.pendingPhotoPath && session.pendingPhotoBase64) {
        const today = format(new Date(), 'yyyy-MM-dd')

        const foods = await db.query.knownFoods.findMany()
        const knownFoodsContext = foods.slice(0, 30).map(f => `${f.name}`).join(', ')

        const [extraction, recentAnalyses, profile] = await Promise.all([
          extractFromVoice(transcript, knownFoodsContext),
          db.query.skinAnalyses.findMany({
            where: gte(skinAnalyses.date, format(subDays(new Date(), 5), 'yyyy-MM-dd')),
            orderBy: [desc(skinAnalyses.date)],
            limit: 5,
          }),
          db.query.userProfile.findFirst(),
        ])

        const previousScores = recentAnalyses
          .map(a => `${a.date}: glass_skin=${a.glassSkinScore}, rosacea=${a.rosaceaScore}`)
          .join('\n')

        sseWrite(res, { type: 'status', text: 'Analyse de ta peau...' })

        const analysis = await analyzePhoto({
          photoBase64: session.pendingPhotoBase64,
          context: {
            moment: 'morning',
            previousScores,
            referencePhotoAvailable: false,
            factors: JSON.stringify(extraction.factors),
            nutrition: JSON.stringify(extraction.foods),
            sleep: `${extraction.factors.sleep_hours ?? '?'}h`,
          },
        })

        // Sauvegarder entrée + analyse
        const [entry] = await db.insert(entries).values({
          date: today,
          moment: 'morning',
          photoPath: session.pendingPhotoPath,
          photoSource: 'web',
          voiceTranscript: transcript,
          source: 'web',
        }).onConflictDoUpdate({
          target: entries.date,
          set: { photoPath: session.pendingPhotoPath, voiceTranscript: transcript },
        }).returning()

        const [savedAnalysis] = await db.insert(skinAnalyses).values({
          entryId: entry.id,
          date: today,
          acneScore: analysis.acne_score,
          hydrationScore: analysis.hydration_score,
          radianceScore: analysis.radiance_score,
          textureScore: analysis.texture_score,
          firmnessScore: analysis.firmness_score,
          evennessScore: analysis.evenness_score,
          fineLinesScore: analysis.fine_lines_score,
          barrierScore: analysis.barrier_score,
          rosaceaScore: analysis.rosacea_score,
          glassSkinScore: analysis.glass_skin_score,
          zones: JSON.stringify(analysis.zones),
          lesionsActive: JSON.stringify(analysis.lesions_active),
          vsYesterday: analysis.vs_yesterday,
          summary: analysis.summary,
          immediateRecos: JSON.stringify(analysis.immediate_recos),
          routineForTonight: JSON.stringify(analysis.routine_for_tonight),
        }).onConflictDoNothing().returning()

        if (extraction.factors) {
          await db.insert(dailyFactors).values({
            entryId: entry.id, date: today, ...extraction.factors,
          }).onConflictDoNothing()
        }

        if (extraction.foods.length > 0) {
          const macros = extraction.macros_estimated
          await db.insert(nutritionLogs).values({
            entryId: entry.id, date: today,
            description: transcript,
            foods: JSON.stringify(extraction.foods),
            proteinG: macros.protein_g,
            carbsG: macros.carbs_g,
            fatG: macros.fat_g,
            calories: macros.calories,
            macrosSource: 'estimated_by_ai',
            macrosConfidence: macros.confidence,
          }).onConflictDoNothing()
        }

        // Apprendre les aliments
        for (const food of extraction.foods) {
          if (!food.name) continue
          await db.insert(knownFoods).values({
            name: food.name.toLowerCase(),
            proteinPer100g: food.quantity_g && food.protein_g ? (food.protein_g / food.quantity_g) * 100 : null,
          }).onConflictDoUpdate({ target: knownFoods.name, set: { timesLogged: sql`${knownFoods.timesLogged} + 1` } })
          .catch(() => {})
        }

        // Reset session
        await db.update(chatSession).set({
          step: 'idle',
          pendingPhotoPath: null,
          pendingPhotoBase64: null,
          updatedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
        }).where(eq(chatSession.id, session.id))

        // Message principal : analyse
        const analysisMsg = await addMessage('assistant', 'analysis', analysis.whatsapp_debrief ?? analysis.summary ?? '', {
          analysisId: savedAnalysis?.id,
        })
        sseWrite(res, { type: 'message', message: { ...analysisMsg, buttons: [], analysis: savedAnalysis } })

        // Alerte protéines
        if (profile?.weightKg && extraction.macros_estimated.protein_g) {
          const check = checkProteinBalance({
            consumedG: extraction.macros_estimated.protein_g,
            weightKg: profile.weightKg,
            activityLevel: profile.activityLevel ?? 'moderate',
          })
          if (check.alert) {
            const protMsg = await addMessage('assistant', 'text',
              `⚡ Protéines : ${check.consumed_g}g consommés / objectif ${check.goal_g}g — déficit de ${check.deficit_g}g.`
            )
            sseWrite(res, { type: 'message', message: { ...protMsg, buttons: [] } })
          }
        }

        // Questions de suivi (max 2)
        const followUps = extraction.missing_fields?.slice(0, 2) ?? []
        if (followUps.length > 0) {
          const btnMsg = await addMessage('assistant', 'buttons',
            'Pour affiner mon analyse, dis-moi :',
            { buttons: followUps }
          )
          sseWrite(res, { type: 'message', message: { ...btnMsg, buttons: followUps } })
        }

        // Détection signal
        const signal = await detectSignal({
          transcript,
          recentAnalyses: previousScores,
          existingSignals: [],
        }).catch(() => null)
        if (signal?.detected) {
          const sigMsg = await addMessage('assistant', 'text', `✦ ${signal.suggestion}`)
          sseWrite(res, { type: 'message', message: { ...sigMsg, buttons: [] } })
        }

        sseWrite(res, { type: 'done', entryId: entry.id })
        return res.end()
      }

      // ── Pas de photo en attente → conversation libre ─────────────────────────
      sseWrite(res, { type: 'status', text: 'Skin Guru répond...' })

      const todayStart = format(new Date(), 'yyyy-MM-dd') + ' 00:00:00'
      const [history, freeChatProfile] = await Promise.all([
        db.query.chatMessages.findMany({
          where: gte(chatMessages.createdAt, todayStart),
          orderBy: [desc(chatMessages.id)],
          limit: 20,
        }),
        db.query.userProfile.findFirst(),
      ])

      const systemInstruction = freeChatProfile?.backgroundContext
        ? `${SKIN_GURU_PERSONA}\n\n${freeChatProfile.backgroundContext}`
        : SKIN_GURU_PERSONA

      const model = getModel({ systemInstruction, maxTokens: 512 })
      const rawHistory = history.reverse().slice(-8).map(m => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: m.content }],
      }))
      // Gemini requires history to start with a 'user' turn
      const firstUserIdx = rawHistory.findIndex(m => m.role === 'user')
      const chatHistory = firstUserIdx > 0 ? rawHistory.slice(firstUserIdx) : rawHistory

      const chat = model.startChat({ history: chatHistory.slice(0, -1) })
      const result = await chat.sendMessage(transcript)
      const reply = result.response.text()

      const replyMsg = await addMessage('assistant', 'text', reply)
      sseWrite(res, { type: 'message', message: { ...replyMsg, buttons: [] } })
      sseWrite(res, { type: 'done' })
      return res.end()
    }

    // ── Réponse à un bouton ───────────────────────────────────────────────────
    if (type === 'button' && buttonValue) {
      await addMessage('user', 'text', buttonValue)
      const model = getModel({ systemInstruction: SKIN_GURU_PERSONA, maxTokens: 256 })
      const result = await model.generateContent(`L'utilisatrice répond "${buttonValue}" à ta question. Donne une réponse courte et actionnable en tant que Skin Guru.`)
      const reply = result.response.text()
      const replyMsg = await addMessage('assistant', 'text', reply)
      sseWrite(res, { type: 'message', message: { ...replyMsg, buttons: [] } })
      sseWrite(res, { type: 'done' })
      return res.end()
    }

    sseWrite(res, { type: 'error', text: 'Type de message non reconnu.' })
    res.end()
  } catch (err: unknown) {
    console.error('Chat error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource exhausted')
    sseWrite(res, {
      type: 'error',
      code: isQuota ? 'quota' : 'generic',
      text: isQuota
        ? 'Quota Gemini épuisé. Réessayez demain ou vérifiez votre clé API.'
        : 'Erreur du Skin Guru. Réessayez.',
    })
    res.end()
  }
})

// ── GET /api/chat/health ──────────────────────────────────────────────────────
chatRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const model = getModel({ maxTokens: 4 })
    await model.generateContent('ok')
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource exhausted')
    res.json({ ok: false, quota: isQuota })
  }
})

// ── POST /api/chat/clear ──────────────────────────────────────────────────────
chatRouter.post('/clear', async (_req: Request, res: Response) => {
  await db.delete(chatMessages)
  await db.update(chatSession).set({ step: 'idle', pendingPhotoPath: null, pendingPhotoBase64: null })
  res.json({ ok: true })
})
