import { getModel, parseJSON } from './client'
import { SKIN_GURU_PERSONA, STATIC_SKIN_CONTEXT } from './persona'

export interface ZoneAnalysis {
  score: number          // 0-10
  acne_score?: number
  redness_score?: number
  notes: string
}

export interface PhotoAnalysisResult {
  acne_score: number
  hydration_score: number
  radiance_score: number
  texture_score: number
  firmness_score: number
  evenness_score: number
  fine_lines_score: number
  barrier_score: number
  rosacea_score: number
  glass_skin_score: number
  zones: Record<string, ZoneAnalysis>
  lesions_active: {
    count: number
    picking: boolean
    infected: boolean
    zones: string[]
  }
  vs_yesterday: 'amélioration' | 'stable' | 'dégradation'
  summary: string
  immediate_recos: string[]
  routine_for_tonight: string[]
  whatsapp_debrief: string   // 3-4 lignes max pour WhatsApp
}

const ANALYSIS_PROMPT = (context: {
  moment: 'morning' | 'evening'
  previousScores: string
  referencePhotoAvailable: boolean
  factors: string
  nutrition: string
  sleep: string
}) => `
${STATIC_SKIN_CONTEXT}

CONTEXTE DU JOUR :
- Moment : ${context.moment}
- Facteurs : ${context.factors}
- Nutrition : ${context.nutrition}
- Sommeil : ${context.sleep}

HISTORIQUE RÉCENT :
${context.previousScores}

${context.referencePhotoAvailable ? 'Note : une photo de référence J-7 est fournie pour comparaison.' : ''}

TÂCHE : Analyse la photo fournie et renvoie UNIQUEMENT ce JSON (pas de texte autour) :
{
  "acne_score": 0-10,
  "hydration_score": 0-10,
  "radiance_score": 0-10,
  "texture_score": 0-10,
  "firmness_score": 0-10,
  "evenness_score": 0-10,
  "fine_lines_score": 0-10,
  "barrier_score": 0-10,
  "rosacea_score": 0-10,
  "glass_skin_score": 0-10,
  "zones": {
    "front": { "score": 0-10, "redness_score": 0-10, "notes": "..." },
    "joue_gauche": { "score": 0-10, "acne_score": 0-10, "redness_score": 0-10, "notes": "..." },
    "joue_droite": { "score": 0-10, "acne_score": 0-10, "redness_score": 0-10, "notes": "..." },
    "nez": { "score": 0-10, "redness_score": 0-10, "notes": "..." },
    "menton": { "score": 0-10, "acne_score": 0-10, "notes": "..." },
    "mâchoire_gauche": { "score": 0-10, "acne_score": 0-10, "notes": "..." },
    "mâchoire_droite": { "score": 0-10, "acne_score": 0-10, "notes": "..." },
    "contour_yeux_gauche": { "score": 0-10, "fine_lines_score": 0-10, "notes": "..." },
    "contour_yeux_droit": { "score": 0-10, "fine_lines_score": 0-10, "notes": "..." }
  },
  "lesions_active": {
    "count": 0,
    "picking": false,
    "infected": false,
    "zones": []
  },
  "vs_yesterday": "amélioration|stable|dégradation",
  "summary": "1 phrase factuelle sur l'état global",
  "immediate_recos": ["reco 1", "reco 2"],
  "routine_for_tonight": ["étape 1", "étape 2"],
  "whatsapp_debrief": "Glass skin : X/10 (+/-Y vs hier)\\nPoint fort : ...\\nPoint faible : ...\\nCe soir : ..."
}
`

export async function analyzePhoto(params: {
  photoBase64: string
  mimeType?: string
  referencePhotoBase64?: string
  context: Parameters<typeof ANALYSIS_PROMPT>[0]
}): Promise<PhotoAnalysisResult> {
  const model = getModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SKIN_GURU_PERSONA,
    jsonMode: true,
    maxTokens: 2048,
  })

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: ANALYSIS_PROMPT(params.context) },
    {
      inlineData: {
        mimeType: params.mimeType ?? 'image/jpeg',
        data: params.photoBase64,
      },
    },
  ]

  if (params.referencePhotoBase64) {
    parts.push({ text: 'Photo de référence J-7 :' })
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: params.referencePhotoBase64,
      },
    })
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
  })

  return parseJSON<PhotoAnalysisResult>(result.response.text())
}

export async function* analyzePhotoStream(params: Parameters<typeof analyzePhoto>[0]) {
  const model = getModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SKIN_GURU_PERSONA,
    maxTokens: 2048,
  })

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: ANALYSIS_PROMPT(params.context) },
    { inlineData: { mimeType: params.mimeType ?? 'image/jpeg', data: params.photoBase64 } },
  ]

  if (params.referencePhotoBase64) {
    parts.push({ text: 'Photo de référence J-7 :' })
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: params.referencePhotoBase64 } })
  }

  const stream = await model.generateContentStream({
    contents: [{ role: 'user', parts }],
  })

  for await (const chunk of stream.stream) {
    yield chunk.text()
  }
}
