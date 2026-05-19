import { getModel, parseJSON } from './client'

export interface DetectedSignal {
  detected: boolean
  signal: string | null        // description du signal
  suggestion: string | null    // suggestion d'évolution
  confidence: number           // 0-1
}

export async function detectSignal(params: {
  transcript: string
  recentAnalyses: string    // résumé des 7 dernières analyses
  existingSignals: string[] // signaux déjà trackés
}): Promise<DetectedSignal> {
  const model = getModel({
    model: 'gemini-2.0-flash',
    jsonMode: true,
    maxTokens: 256,
  })

  const prompt = `
Tu es un détecteur de signaux dans les habitudes de suivi cutané.

MESSAGE VOCAL AUJOURD'HUI :
"${params.transcript}"

TENDANCES RÉCENTES (7 jours) :
${params.recentAnalyses}

SIGNAUX DÉJÀ TRACKÉS :
${params.existingSignals.join(', ') || 'Aucun'}

Détecte si l'utilisatrice mentionne un pattern récurrent ou une corrélation nouvelle qui n'est pas encore trackée.
Ex : "chaque fois que je mentionne X, Y empire", "nouveau facteur jamais signalé", "comportement répété X fois".

Réponds UNIQUEMENT JSON :
{
  "detected": false,
  "signal": null,
  "suggestion": null,
  "confidence": 0.0
}
`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return parseJSON<DetectedSignal>(result.response.text())
}
