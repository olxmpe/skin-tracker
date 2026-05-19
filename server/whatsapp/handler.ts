import { sendText, sendButtons, sendImage, downloadMedia } from './client'
import { db } from '../db/client'
import { whatsappSessions, entries, skinAnalyses, dailyFactors, nutritionLogs, knownFoods, evolutionProposals } from '../db/schema'
import { eq, gte, desc, sql} from 'drizzle-orm'
import { analyzePhoto } from '../ai/analyze-photo'
import { extractFromVoice } from '../ai/extract-voice'
import { suggestEveningMenu } from '../ai/suggest-menu'
import { detectSignal } from '../ai/signal-detector'
import { checkProteinBalance } from '../utils/protein-check'
import { savePhoto, getPhotoBase64 } from '../storage/photos'
import { generateChartForWhatsApp } from '../storage/charts'
import { format, subDays, addHours } from 'date-fns'

const STEP1_MESSAGE = `Skin Guru : Vocal stp — routine du jour, ce que t'as mangé, facteurs inhabituels. 2 min max.`

// ── Commandes texte ───────────────────────────────────────────────────────────
const COMMANDS = {
  graph: /graphe?|graphique|courbe|évolution|montre.*(résultats|stats)/i,
  evolveYes: /^(oui|yes|ok|valide|confirme)$/i,
  evolveNo: /^(non|no|nope|ignore|annule)$/i,
  report: /rapport|bilan|semaine|résumé/i,
  help: /aide|help|\?$/i,
}

// ── Entrée principale ─────────────────────────────────────────────────────────
export async function handleIncomingMessage(msg: {
  from: string
  type: 'text' | 'image' | 'audio' | 'button_reply' | 'unknown'
  text?: string
  mediaId?: string
  buttonId?: string
}) {
  const session = await db.query.whatsappSessions.findFirst({
    where: eq(whatsappSessions.from, msg.from),
  })

  // Commandes globales (fonctionnent à tout moment)
  if (msg.type === 'text' && msg.text) {
    if (COMMANDS.graph.test(msg.text)) return handleGraphRequest(msg.from, msg.text)
    if (COMMANDS.report.test(msg.text)) return handleReportRequest(msg.from)
    if (COMMANDS.help.test(msg.text)) return handleHelp(msg.from)

    // Réponse à une évolution proposée
    const pendingEvolution = await db.query.evolutionProposals.findFirst({
      where: eq(evolutionProposals.status, 'pending'),
    })
    if (pendingEvolution) {
      if (COMMANDS.evolveYes.test(msg.text)) return handleEvolutionConfirm(msg.from, pendingEvolution.id)
      if (COMMANDS.evolveNo.test(msg.text)) return handleEvolutionReject(msg.from, pendingEvolution.id)
    }
  }

  // Protocole 3 étapes
  if (!session || session.step === 1) {
    if (msg.type === 'image') return handleStep1Photo(msg.from, msg.mediaId!)
    await sendText(msg.from, 'Skin Guru : Envoie ta photo du jour pour commencer.')
    return
  }

  if (session.step === 2) {
    if (msg.type === 'audio') return handleStep2Vocal(msg.from, msg.mediaId!, session)
    if (msg.type === 'button_reply') return handleButtonReply(msg.from, msg.buttonId!, session)
    if (msg.type === 'text' && msg.text) return handleStep2Vocal(msg.from, null, session, msg.text)
    await sendText(msg.from, 'Skin Guru : Envoie un vocal ou réponds aux boutons.')
    return
  }
}

// ── Étape 1 : Photo reçue ────────────────────────────────────────────────────
async function handleStep1Photo(from: string, mediaId: string) {
  // Créer/mettre à jour la session
  await db.delete(whatsappSessions).where(eq(whatsappSessions.from, from))

  const expiresAt = format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm:ss")
  await db.insert(whatsappSessions).values({
    from,
    step: 2,
    photoMediaId: mediaId,
    expiresAt,
  })

  await sendText(from, STEP1_MESSAGE)
}

// ── Étape 2 : Vocal reçu ─────────────────────────────────────────────────────
async function handleStep2Vocal(
  from: string,
  audioMediaId: string | null,
  session: typeof whatsappSessions.$inferSelect,
  textFallback?: string,
) {
  // Transcription : côté serveur on reçoit l'audio brut — on l'envoie à Gemini pour transcription
  // ou on utilise le texte direct si envoyé par texte
  let transcript = textFallback ?? ''

  if (audioMediaId) {
    // Gemini peut transcrire l'audio directement
    const { getModel } = await import('../ai/client')
    const { downloadMedia: dl } = await import('./client')
    const audioBuffer = await dl(audioMediaId)
    const model = getModel({ model: 'gemini-2.0-flash', maxTokens: 512 })
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcris ce message vocal en français. Renvoie uniquement la transcription, sans commentaire.' },
          { inlineData: { mimeType: 'audio/ogg; codecs=opus', data: audioBuffer.toString('base64') } },
        ],
      }],
    })
    transcript = result.response.text().trim()
  }

  if (!transcript) {
    await sendText(from, 'Skin Guru : Pas compris. Réessaie ou écris-moi directement.')
    return
  }

  // Charger les aliments connus pour le contexte
  const foods = await db.query.knownFoods.findMany()
  const knownFoodsContext = foods
    .slice(0, 30)
    .map(f => `${f.name} (${f.proteinPer100g}g prot/100g)`)
    .join(', ')

  // Extraction parallèle
  const [extraction, photoBase64] = await Promise.all([
    extractFromVoice(transcript, knownFoodsContext),
    session.photoMediaId ? (async () => {
      const { downloadMedia: dl } = await import('./client')
      const buf = await dl(session.photoMediaId!)
      return buf.toString('base64')
    })() : Promise.resolve(null),
  ])

  // Analyse photo
  const today = format(new Date(), 'yyyy-MM-dd')
  const profile = await db.query.userProfile.findFirst()
  const recentAnalyses = await db.query.skinAnalyses.findMany({
    where: gte(skinAnalyses.date, format(subDays(new Date(), 5), 'yyyy-MM-dd')),
    orderBy: [desc(skinAnalyses.date)],
    limit: 5,
  })

  const previousScores = recentAnalyses
    .map(a => `${a.date}: glass_skin=${a.glassSkinScore}, rosacea=${a.rosaceaScore}`)
    .join('\n')

  let analysis = null
  if (photoBase64) {
    // Sauvegarder la photo
    const { savePhoto: sp } = await import('../storage/photos')
    const photoBuffer = Buffer.from(photoBase64, 'base64')
    const photoPath = await sp(photoBuffer)

    // Analyse photo
    analysis = await analyzePhoto({
      photoBase64,
      context: {
        moment: 'morning',
        previousScores,
        referencePhotoAvailable: false,
        factors: JSON.stringify(extraction.factors),
        nutrition: JSON.stringify(extraction.foods),
        sleep: `${extraction.factors.sleep_hours ?? '?'}h`,
      },
    })

    // Sauvegarder en base
    const entry = await db.insert(entries).values({
      date: today,
      moment: 'morning',
      photoPath,
      photoSource: 'whatsapp',
      voiceTranscript: transcript,
      source: 'whatsapp',
    }).returning()

    await db.insert(skinAnalyses).values({
      entryId: entry[0].id,
      date: today,
      ...analysis,
      zones: JSON.stringify(analysis.zones),
      lesionsActive: JSON.stringify(analysis.lesions_active),
      immediateRecos: JSON.stringify(analysis.immediate_recos),
      routineForTonight: JSON.stringify(analysis.routine_for_tonight),
    })

    await db.insert(dailyFactors).values({
      entryId: entry[0].id,
      date: today,
      ...extraction.factors,
    })

    if (extraction.foods.length > 0) {
      const macros = extraction.macros_estimated
      await db.insert(nutritionLogs).values({
        entryId: entry[0].id,
        date: today,
        description: transcript,
        foods: JSON.stringify(extraction.foods),
        proteinG: macros.protein_g,
        carbsG: macros.carbs_g,
        fatG: macros.fat_g,
        calories: macros.calories,
        macrosSource: 'estimated_by_ai',
        macrosConfidence: macros.confidence,
      })
    }

    // Apprendre les nouveaux aliments
    for (const food of extraction.foods) {
      if (!food.name) continue
      await db.insert(knownFoods)
        .values({
          name: food.name.toLowerCase(),
          proteinPer100g: food.quantity_g && food.protein_g ? (food.protein_g / food.quantity_g) * 100 : null,
          carbsPer100g: food.quantity_g && food.carbs_g ? (food.carbs_g / food.quantity_g) * 100 : null,
          fatPer100g: food.quantity_g && food.fat_g ? (food.fat_g / food.quantity_g) * 100 : null,
          caloriesPer100g: food.quantity_g && food.calories ? (food.calories / food.quantity_g) * 100 : null,
        })
        .onConflictDoUpdate({
          target: knownFoods.name,
          set: { timesLogged: sql`${knownFoods.timesLogged} + 1` },
        })
        .catch(() => { /* ignore conflicts */ })
    }
  }

  // Message 1 : Debrief peau
  if (analysis) {
    await sendText(from, `Skin Guru : ${analysis.whatsapp_debrief}`)
  }

  // Message 2 : Bilan protéines si déficit
  if (profile?.weightKg && extraction.macros_estimated.protein_g) {
    const check = checkProteinBalance({
      consumedG: extraction.macros_estimated.protein_g,
      weightKg: profile.weightKg,
      activityLevel: profile.activityLevel ?? 'moderate',
      customGoalG: profile.proteinGoalG ?? undefined,
    })
    if (check.alert) {
      const skinState = analysis?.summary ?? 'état stable'
      const menuSuggestion = await suggestEveningMenu({
        proteinConsumedG: check.consumed_g,
        proteinGoalG: check.goal_g,
        weightKg: profile.weightKg,
        cyclePhase: null,
        skinState,
        knownFoods: knownFoodsContext,
      })
      await sendText(from, `Skin Guru : ${menuSuggestion.message}`)
    }
  }

  // Message 3 : Signal / questions de suivi
  const pendingQ = extraction.missing_fields.slice(0, 2)
  if (pendingQ.length > 0) {
    await db.update(whatsappSessions)
      .set({ step: 2, pendingQuestions: JSON.stringify(pendingQ), questionsAsked: 0 })
      .where(eq(whatsappSessions.from, from))
    await sendFollowUpQuestion(from, pendingQ[0])
    return
  }

  // Détecter un signal (en parallèle, non bloquant)
  detectSignal({
    transcript,
    recentAnalyses: previousScores,
    existingSignals: [],
  }).then(async signal => {
    if (signal.detected && signal.confidence >= 0.7 && signal.signal) {
      await db.insert(evolutionProposals).values({
        trigger: signal.signal,
        description: signal.suggestion ?? signal.signal,
        proposedChanges: signal.suggestion ?? '',
        status: 'pending',
      })
      await sendButtons(from,
        `Skin Guru : Signal détecté — ${signal.signal}\n\nJe peux adapter le suivi pour ça. On le fait ?`,
        [{ id: 'evolve_yes', title: 'Oui' }, { id: 'evolve_no', title: 'Non' }],
      )
    }
  }).catch(() => { /* non bloquant */ })

  // Clore la session
  await db.delete(whatsappSessions).where(eq(whatsappSessions.from, from))
}

// ── Boutons interactifs ───────────────────────────────────────────────────────
async function handleButtonReply(from: string, buttonId: string, session: typeof whatsappSessions.$inferSelect) {
  const pending = JSON.parse(session.pendingQuestions ?? '[]') as string[]
  const asked = session.questionsAsked ?? 0

  // Enregistrer la réponse au bouton
  const today = format(new Date(), 'yyyy-MM-dd')
  if (buttonId === 'exercise_yes') {
    await db.update(dailyFactors)
      .set({ exerciseType: 'activité confirmée', exerciseIntensity: 'moderate' })
      .where(eq(dailyFactors.date, today))
  }
  if (buttonId === 'flush_yes') {
    await db.update(dailyFactors)
      .set({ flush: true })
      .where(eq(dailyFactors.date, today))
  }

  // Question suivante ?
  const nextQ = pending[asked + 1]
  if (nextQ && asked + 1 < 2) {
    await db.update(whatsappSessions)
      .set({ questionsAsked: asked + 1 })
      .where(eq(whatsappSessions.from, from))
    await sendFollowUpQuestion(from, nextQ)
    return
  }

  await db.delete(whatsappSessions).where(eq(whatsappSessions.from, from))
  await sendText(from, 'Skin Guru : Noté. À demain.')
}

async function sendFollowUpQuestion(from: string, question: string) {
  const questions: Record<string, { text: string; buttons: Array<{ id: string; title: string }> }> = {
    exercise: {
      text: "Skin Guru : T'as fait du sport aujourd'hui ?",
      buttons: [{ id: 'exercise_yes', title: 'Oui' }, { id: 'exercise_no', title: 'Non' }],
    },
    flush: {
      text: 'Skin Guru : Flush dans la journée ?',
      buttons: [{ id: 'flush_yes', title: 'Oui' }, { id: 'flush_no', title: 'Non' }],
    },
    inci: {
      text: 'Skin Guru : Nouveau produit détecté. Tu as la liste INCI ?',
      buttons: [{ id: 'inci_yes', title: 'Oui, je l\'envoie' }, { id: 'inci_no', title: 'Pas maintenant' }],
    },
    sleep: {
      text: 'Skin Guru : Combien d\'heures de sommeil ?',
      buttons: [{ id: 'sleep_6', title: '< 6h' }, { id: 'sleep_7', title: '6-8h' }, { id: 'sleep_9', title: '> 8h' }],
    },
  }

  const q = questions[question]
  if (q) {
    await sendButtons(from, q.text, q.buttons)
  }
}

// ── Commandes graph ───────────────────────────────────────────────────────────
async function handleGraphRequest(from: string, message: string) {
  // Parser la période
  const periodMatch = message.match(/(\d+)\s*(jou?r?s?|semaines?|mois?)/i)
  const days = periodMatch ? parseInt(periodMatch[1]) * (periodMatch[2].startsWith('s') ? 7 : periodMatch[2].startsWith('m') ? 30 : 1) : 30

  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const analyses = await db.query.skinAnalyses.findMany({
    where: gte(skinAnalyses.date, since),
    orderBy: [desc(skinAnalyses.date)],
  })

  if (analyses.length < 3) {
    await sendText(from, `Skin Guru : Pas assez de données (${analyses.length} entrées). Il en faut au moins 3.`)
    return
  }

  const labels = analyses.map(a => a.date.slice(5))   // MM-DD
  const scores = analyses.map(a => a.glassSkinScore ?? 0)

  const imageUrl = await generateChartForWhatsApp({
    type: 'glass',
    labels,
    values: scores,
    label: `Glass Skin Score — ${days} jours`,
  })

  const delta = scores[0] - scores[scores.length - 1]
  await sendImage(from, imageUrl, `Skin Guru : Glass Skin ${days}j — ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} au total`)
}

// ── Rapport hebdomadaire ──────────────────────────────────────────────────────
async function handleReportRequest(from: string) {
  await sendText(from, 'Skin Guru : Génération du rapport en cours...')
  const { generateAndSendWeeklyReport } = await import('../jobs/weekly-report')
  await generateAndSendWeeklyReport(from)
}

// ── Évolution ────────────────────────────────────────────────────────────────
async function handleEvolutionConfirm(from: string, proposalId: number) {
  await db.update(evolutionProposals)
    .set({ status: 'confirmed', confirmedAt: new Date().toISOString() })
    .where(eq(evolutionProposals.id, proposalId))
  await sendText(from, 'Skin Guru : PR ouverte. Je t\'envoie le lien.')
  // L'evolution agent est déclenché via la route /api/evolution
}

async function handleEvolutionReject(from: string, proposalId: number) {
  await db.update(evolutionProposals)
    .set({ status: 'rejected' })
    .where(eq(evolutionProposals.id, proposalId))
  await sendText(from, 'Skin Guru : Noté, signal ignoré.')
}

// ── Aide ──────────────────────────────────────────────────────────────────────
async function handleHelp(from: string) {
  await sendText(from, `Skin Guru :
• Envoie une photo → je te demande un vocal
• "graphique peau 30 jours" → courbe
• "mes protéines cette semaine" → bilan
• "rapport" → bilan hebdomadaire complet
• "évolution rosacée 2 mois" → tendance`)
}
