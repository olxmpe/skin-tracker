import { getModel, parseJSON } from './client'

export interface EvolutionDiff {
  file_changes: Array<{
    path: string
    action: 'create' | 'modify'
    content: string
    description: string
  }>
  schema_changes: Array<{
    table: string
    column: string
    type: string
    nullable: boolean    // toujours true — migrations additives uniquement
    default_value: string | null
  }>
  migration_sql: string
  summary: string
}

export async function generateEvolutionDiffs(proposal: {
  trigger: string
  description: string
  proposedChanges: string
  currentSchema: string
}): Promise<EvolutionDiff> {
  const model = getModel({
    model: 'gemini-2.0-flash-thinking-exp',
    jsonMode: true,
    maxTokens: 8192,
    systemInstruction: 'Tu es un expert en développement TypeScript/Vue/Drizzle ORM. Tu génères des diffs de code précis et des migrations SQLite.',
  })

  const prompt = `
Une utilisatrice a confirmé une proposition d'auto-évolution de son application de suivi cutané.

SIGNAL DÉTECTÉ : ${proposal.trigger}
DESCRIPTION : ${proposal.description}
CHANGEMENTS PROPOSÉS : ${proposal.proposedChanges}

SCHÉMA ACTUEL :
${proposal.currentSchema}

RÈGLES STRICTES :
- Migrations UNIQUEMENT additives (colonnes nullable avec DEFAULT NULL)
- Jamais modifier/supprimer colonnes existantes
- Types TypeScript stricts
- Code minimal, pas de réarchitecture
- Un seul fichier de migration SQL

Génère les diffs nécessaires au format JSON.
`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  return parseJSON<EvolutionDiff>(result.response.text())
}
