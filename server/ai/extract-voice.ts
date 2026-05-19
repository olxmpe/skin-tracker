import { getModel, parseJSON } from './client'
import { SKIN_GURU_PERSONA } from './persona'

export interface ExtractedFood {
  name: string
  quantity_g: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  calories: number | null
  confidence: number   // 0-1
}

export interface VoiceExtractionResult {
  // Routine
  routine_products: string[]           // noms des produits mentionnés
  routine_steps: string[]              // étapes décrites
  new_products: string[]               // nouveaux produits jamais vus

  // Nutrition
  foods: ExtractedFood[]
  macros_estimated: {
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    calories: number | null
    confidence: number   // 0-1, basé sur la précision des descriptions
  }

  // Facteurs
  factors: {
    sleep_hours: number | null
    sleep_quality: number | null      // 1-5
    exercise_type: string | null
    exercise_intensity: 'light' | 'moderate' | 'intense' | null
    exercise_duration_min: number | null
    heat_exposure: boolean
    sun_exposure: boolean
    spicy_food: boolean
    alcohol: boolean
    hot_drinks: boolean
    stress: boolean
    flush: boolean
  }

  // Questions manquantes (max 2)
  missing_fields: Array<'inci' | 'exercise' | 'flush' | 'sleep'>

  // Notes libres non structurées
  free_notes: string | null
}

const EXTRACTION_PROMPT = (transcript: string, knownFoodsContext: string) => `
Tu es un extracteur de données structurées. Analyse ce transcript vocal et extrais toutes les informations mentionnées.

TRANSCRIPT :
"${transcript}"

ALIMENTS CONNUS EN BASE (macros pour 100g) :
${knownFoodsContext || 'Aucun aliment enregistré pour l\'instant.'}

RÈGLES D'EXTRACTION :
- Estime les macros depuis les quantités mentionnées ("200g de poulet" → ~46g protéines)
- Si un aliment est dans la base, utilise ses macros connues
- Si quantité non précisée, estime une portion standard
- Pour la routine : extrais tous les produits et étapes mentionnés
- new_products = produits qui semblent nouveaux (pas dans le vocabulaire habituel)
- missing_fields : infos qui seraient utiles mais non mentionnées (max 2, priorité : inci > exercise > flush > sleep)
- confidence globale des macros selon précision des descriptions

Réponds UNIQUEMENT avec ce JSON :
{
  "routine_products": [],
  "routine_steps": [],
  "new_products": [],
  "foods": [
    { "name": "", "quantity_g": null, "protein_g": null, "carbs_g": null, "fat_g": null, "calories": null, "confidence": 0.8 }
  ],
  "macros_estimated": {
    "protein_g": null,
    "carbs_g": null,
    "fat_g": null,
    "calories": null,
    "confidence": 0.7
  },
  "factors": {
    "sleep_hours": null,
    "sleep_quality": null,
    "exercise_type": null,
    "exercise_intensity": null,
    "exercise_duration_min": null,
    "heat_exposure": false,
    "sun_exposure": false,
    "spicy_food": false,
    "alcohol": false,
    "hot_drinks": false,
    "stress": false,
    "flush": false
  },
  "missing_fields": [],
  "free_notes": null
}
`

export async function extractFromVoice(
  transcript: string,
  knownFoodsContext = '',
): Promise<VoiceExtractionResult> {
  const model = getModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SKIN_GURU_PERSONA,
    jsonMode: true,
    maxTokens: 1024,
  })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: EXTRACTION_PROMPT(transcript, knownFoodsContext) }] }],
  })

  return parseJSON<VoiceExtractionResult>(result.response.text())
}
