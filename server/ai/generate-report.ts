import { getModel, parseJSON } from './client'
import { SKIN_GURU_PERSONA, STATIC_SKIN_CONTEXT } from './persona'

export interface WeeklyReport {
  period: string
  // Peau
  glass_skin_trend: number     // delta semaine (positif = amélioration)
  best_day: string
  worst_day: string
  top_improvements: string[]
  top_regressions: string[]
  // Nutrition
  avg_protein_g: number
  protein_goal_met_days: number
  nutrition_skin_correlation: string
  // Corrélations détectées
  correlations: Array<{
    factor: string
    impact: string
    confidence: number
    zone?: string
  }>
  // Recommandations
  weekly_recommendations: string[]
  priority_action: string
  // Format WhatsApp (texte condensé)
  whatsapp_summary: string      // 10 lignes max
  // Format PDF (markdown complet)
  pdf_content: string
}

export async function generateWeeklyReport(weekData: {
  analyses: string      // JSON des 7 analyses
  nutrition: string     // JSON nutrition semaine
  factors: string       // JSON facteurs semaine
  profile: string       // profil utilisatrice
}): Promise<WeeklyReport> {
  const model = getModel({
    model: 'gemini-2.0-flash-thinking-exp',
    systemInstruction: SKIN_GURU_PERSONA + '\n\n' + STATIC_SKIN_CONTEXT,
    jsonMode: true,
    maxTokens: 4096,
  })

  const prompt = `
Génère le rapport hebdomadaire de suivi cutané et nutritionnel.

DONNÉES DE LA SEMAINE :

Analyses cutanées :
${weekData.analyses}

Nutrition :
${weekData.nutrition}

Facteurs lifestyle :
${weekData.factors}

Profil :
${weekData.profile}

Analyse les tendances, identifie les corrélations, et génère un rapport complet.
Pour whatsapp_summary : 10 lignes max, direct, chiffres clés, 1 action prioritaire.
Pour pdf_content : markdown complet avec titres, tableaux, analyse détaillée.

Réponds UNIQUEMENT JSON selon l'interface WeeklyReport.
`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return parseJSON<WeeklyReport>(result.response.text())
}
