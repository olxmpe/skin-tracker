import { Router, Request, Response } from 'express'
import multer from 'multer'
import { db } from '../db/client'
import { chatMessages, userProfile, entries, skinAnalyses } from '../db/schema'
import { analyzePhoto } from '../ai/analyze-photo'
import { savePhoto } from '../storage/photos'
import { eq } from 'drizzle-orm'

export const importRouter = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

interface ChatGPTMessage {
  role: 'Prompt' | 'Response'
  say: string
  time: string // "DD/MM/YYYY HH:MM:SS"
}

interface ChatGPTExport {
  messages: ChatGPTMessage[]
}

function parseTime(timeStr: string): string {
  // "19/03/2026 09:15:17" → ISO string
  const [datePart, timePart] = timeStr.split(' ')
  const [day, month, year] = datePart.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`
}

const BACKGROUND_CONTEXT = `HISTORIQUE CHATGPT (mars–mai 2026) :
- Rosacée acnéique confirmée par dermatologue (érythème, télangiectasies, flush, papules sans comédons)
- Barrière cutanée compromise depuis ~1 an avant importation
- 27 ans, peau naturellement sèche avec rosacée par-dessus
- Ordonnance dermato : Doxycycline 100mg Tolexine (non prise initialement), Sensifine AR, Azeane, Créaline, Enoliss Regul (non pris)

PRODUITS UTILISÉS (routine consolidée) :
- Matin : Cicaplast Lavant B5 ou Créaline Bioderma (nettoyant) → Sensifine AR SVR → SPF50+ SKIN1004
- Soir 1/2 : Créaline → Sensifine AR → Azeane 15% acide azélaïque → Cicaplast Baume B5
- Soir 1/2 : Créaline → Sensifine AR → Numbuzin B5 Soothing Cream ou Dr. Althea 345 Relief Cream

PRODUITS DISPONIBLES NON UTILISÉS :
- Laneige Water Sleeping Mask, The Ordinary Niacinamide 10% (déconseillé sur rosacée), On The Wild Side crème, spray Sensibio AR+ SOS Bioderma, acide hypochloreux spray

TRIGGERS IDENTIFIÉS : chaleur, soleil, épices, alcool, sport intense, stress
OBJECTIF : glass skin — uniformité, luminosité, contrôle rougeurs, barrière solide`

// ── POST /api/import/chatgpt ──────────────────────────────────────────────────
importRouter.post('/chatgpt', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let data: ChatGPTExport

    if (req.file) {
      data = JSON.parse(req.file.buffer.toString('utf-8')) as ChatGPTExport
    } else if (req.body?.messages) {
      data = req.body as ChatGPTExport
    } else {
      return res.status(400).json({ error: 'Fichier JSON manquant' })
    }

    if (!Array.isArray(data.messages)) {
      return res.status(400).json({ error: 'Format JSON invalide : champ "messages" manquant' })
    }

    // Filter messages with content and map roles
    const toInsert = data.messages
      .filter(m => m.say && m.say.trim().length > 0)
      .map(m => ({
        role: (m.role === 'Prompt' ? 'user' : 'assistant') as 'user' | 'assistant',
        type: 'text' as const,
        content: m.say.trim(),
        createdAt: parseTime(m.time),
        buttons: '[]',
      }))

    if (toInsert.length === 0) {
      return res.status(400).json({ error: 'Aucun message à importer' })
    }

    // Clear existing messages and insert imported ones
    await db.delete(chatMessages)

    // Insert in batches of 50
    for (let i = 0; i < toInsert.length; i += 50) {
      await db.insert(chatMessages).values(toInsert.slice(i, i + 50))
    }

    // Update profile: background context + skin conditions
    const existing = await db.query.userProfile.findFirst()
    const profileValues = {
      backgroundContext: BACKGROUND_CONTEXT,
      skinConditions: JSON.stringify(['Rosacée', 'Peau sensible']),
      sex: 'female' as const,
      age: 27,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await db.update(userProfile).set(profileValues).where(eq(userProfile.id, existing.id))
    } else {
      await db.insert(userProfile).values(profileValues)
    }

    res.json({ imported: toInsert.length, ok: true })
  } catch (err) {
    console.error('ChatGPT import error:', err)
    res.status(500).json({ error: 'Erreur lors de l\'import' })
  }
})

// ── POST /api/import/photo ────────────────────────────────────────────────────
// Accepts: multipart with fields photo (file) + date (YYYY-MM-DD)
importRouter.post('/photo', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo manquante' })

    const date = (req.body.date as string | undefined)?.trim()
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Champ date requis (YYYY-MM-DD)' })
    }

    const photoPath = await savePhoto(req.file.buffer, 'jpg')
    const photoBase64 = req.file.buffer.toString('base64')

    const [entry] = await db.insert(entries).values({
      date,
      moment: 'morning',
      photoPath,
      photoSource: 'import',
      source: 'import',
    }).onConflictDoUpdate({
      target: entries.date,
      set: { photoPath, photoSource: 'import' },
    }).returning()

    const analysis = await analyzePhoto({
      photoBase64,
      context: {
        moment: 'morning',
        previousScores: '',
        referencePhotoAvailable: false,
        factors: '{}',
        nutrition: '[]',
        sleep: 'inconnue',
      },
    })

    await db.insert(skinAnalyses).values({
      entryId: entry.id,
      date,
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

    res.json({ ok: true, date, entryId: entry.id, glassSkinScore: analysis.glass_skin_score })
  } catch (err) {
    console.error('Photo import error:', err)
    res.status(500).json({ error: 'Erreur analyse photo' })
  }
})
