import { getModel, parseJSON } from './client'
import { SKIN_GURU_PERSONA } from './persona'

export interface MenuSuggestion {
  deficit_g: number
  message: string          // message WhatsApp court (2-3 lignes)
  suggestion: string       // repas suggéré
  foods_used: string[]     // aliments de known_foods utilisés
}

export async function suggestEveningMenu(params: {
  proteinConsumedG: number
  proteinGoalG: number
  weightKg: number
  cyclePhase: string | null
  skinState: string        // résumé état peau du jour
  knownFoods: string       // liste des aliments habituels
}): Promise<MenuSuggestion> {
  const model = getModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SKIN_GURU_PERSONA,
    jsonMode: true,
    maxTokens: 512,
  })

  const prompt = `
Déficit protéines détecté :
- Consommé aujourd'hui : ${params.proteinConsumedG}g
- Objectif : ${params.proteinGoalG}g
- Déficit : ${params.proteinGoalG - params.proteinConsumedG}g
- Poids : ${params.weightKg}kg
- Phase cycle : ${params.cyclePhase ?? 'inconnue'}
- État peau aujourd'hui : ${params.skinState}

Aliments habituels disponibles :
${params.knownFoods}

Propose un dîner réaliste avec ces aliments pour combler le déficit.
Adapte à la phase du cycle et à l'état de la peau (rosacée = éviter aliments inflammatoires si flambée).
Ton direct, court, concret.

Réponds UNIQUEMENT JSON :
{
  "deficit_g": 0,
  "message": "message WhatsApp 2-3 lignes",
  "suggestion": "description du repas suggéré",
  "foods_used": ["aliment1", "aliment2"]
}
`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return parseJSON<MenuSuggestion>(result.response.text())
}
