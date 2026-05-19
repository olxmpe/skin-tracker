import { getModel, parseJSON } from './client'

export interface ParsedIngredient {
  name: string
  inci: string
  risk_level: number        // 1-5
  functions: string[]
  concerns: string[]
  comedogenic: number       // 0-5
  irritant: boolean
  allergen: boolean
  notes: string
}

export async function parseInci(inciList: string): Promise<ParsedIngredient[]> {
  const model = getModel({
    model: 'gemini-2.0-flash',
    jsonMode: true,
    maxTokens: 2048,
    systemInstruction: 'Tu es un expert en cosmétologie et formulation INCI. Tu analyses les listes d\'ingrédients cosmétiques.',
  })

  const prompt = `
Analyse cette liste INCI et évalue chaque ingrédient pour une peau avec rosacée confirmée.

LISTE INCI :
${inciList}

PROFIL PEAU : rosacée, peau sensible, objectif glass skin.

Pour chaque ingrédient, réponds avec ce tableau JSON :
[
  {
    "name": "nom commun",
    "inci": "NOM INCI EXACT",
    "risk_level": 1-5,
    "functions": ["émollient", "humectant", etc.],
    "concerns": ["comédogène", "irritant pour rosacée", etc.],
    "comedogenic": 0-5,
    "irritant": true/false,
    "allergen": true/false,
    "notes": "note spécifique pour ce profil de peau"
  }
]
`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return parseJSON<ParsedIngredient[]>(result.response.text())
}
