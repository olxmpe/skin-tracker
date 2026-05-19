import { Router, Request, Response } from 'express'
import multer from 'multer'
import { db } from '../db/client'
import { entries, skinAnalyses, dailyFactors, nutritionLogs } from '../db/schema'
import { analyzePhotoStream, analyzePhoto } from '../ai/analyze-photo'
import { extractFromVoice } from '../ai/extract-voice'
import { savePhoto } from '../storage/photos'
import { getModel } from '../ai/client'
import { format } from 'date-fns'
import { eq } from 'drizzle-orm'

export const checkinRouter = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// POST /api/transcribe — transcrire un vocal via Gemini
checkinRouter.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio requis' })
    const model = getModel({})
    const result = await model.generateContent([
      'Transcris exactement ce que dit cette personne en français. Retourne uniquement la transcription, sans ajout ni correction.',
      { inlineData: { mimeType: 'audio/webm', data: req.file.buffer.toString('base64') } },
    ])
    const text = result.response.text().trim()
    res.json({ text })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ error: 'Transcription échouée' })
  }
})

// POST /api/checkin — check-in complet (web app)
checkinRouter.post('/', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const { transcript, voiceText, comboId, comboIds, moment = 'morning' } = req.body as {
      transcript?: string
      voiceText?: string
      comboId?: string
      comboIds?: string
      moment?: 'morning' | 'evening'
    }
    const transcriptText = transcript ?? voiceText

    if (!req.file) return res.status(400).json({ error: 'Photo requise' })

    const today = format(new Date(), 'yyyy-MM-dd')
    const photoPath = await savePhoto(req.file.buffer, 'jpg')
    const photoBase64 = req.file.buffer.toString('base64')

    // Extraire le contexte vocal si transcript fourni
    let extraction = null
    if (transcriptText) {
      extraction = await extractFromVoice(transcriptText)
    }

    // Créer l'entrée
    const [entry] = await db.insert(entries).values({
      date: today,
      moment,
      photoPath,
      photoSource: 'web',
      voiceTranscript: transcriptText,
      source: 'web',
    }).onConflictDoUpdate({
      target: entries.date,
      set: { photoPath, voiceTranscript: transcriptText, moment },
    }).returning()

    // Sauvegarder les facteurs extraits
    if (extraction?.factors) {
      await db.insert(dailyFactors).values({
        entryId: entry.id,
        date: today,
        ...extraction.factors,
      }).onConflictDoNothing()
    }

    // Analyse photo en streaming SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    let fullText = ''

    for await (const chunk of analyzePhotoStream({
      photoBase64,
      context: {
        moment,
        previousScores: '',
        referencePhotoAvailable: false,
        factors: extraction ? JSON.stringify(extraction.factors) : '{}',
        nutrition: extraction ? JSON.stringify(extraction.foods) : '[]',
        sleep: extraction?.factors.sleep_hours ? `${extraction.factors.sleep_hours}h` : 'inconnue',
      },
    })) {
      fullText += chunk
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
    }

    // Parser le JSON final et sauvegarder l'analyse
    try {
      const { parseJSON } = await import('../ai/client')
      const analysis = parseJSON<ReturnType<typeof Object>>(fullText) as Awaited<ReturnType<typeof analyzePhoto>>

      await db.insert(skinAnalyses).values({
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
      }).onConflictDoNothing()

      res.write(`data: ${JSON.stringify({ done: true, entryId: entry.id, analysis })}\n\n`)
    } catch {
      res.write(`data: ${JSON.stringify({ done: true, entryId: entry.id })}\n\n`)
    }

    res.end()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ error: 'Erreur analyse' })
  }
})

// GET /api/checkin/today — entrée du jour
checkinRouter.get('/today', async (_req: Request, res: Response) => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const entry = await db.query.entries.findFirst({
    where: eq(entries.date, today),
  })
  const analysis = entry
    ? await db.query.skinAnalyses.findFirst({ where: eq(skinAnalyses.entryId, entry.id) })
    : null

  res.json({ entry, analysis })
})
