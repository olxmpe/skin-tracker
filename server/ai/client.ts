import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY manquante — voir .env.example')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export function getModel(opts: {
  model?: 'gemini-2.0-flash' | 'gemini-2.0-flash-thinking-exp' | 'gemini-1.5-flash'
  systemInstruction?: string
  jsonMode?: boolean
  maxTokens?: number
}): GenerativeModel {
  const generationConfig: GenerationConfig = {
    maxOutputTokens: opts.maxTokens ?? 2048,
    ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
  }

  return genAI.getGenerativeModel({
    model: opts.model ?? 'gemini-2.0-flash',
    ...(opts.systemInstruction ? { systemInstruction: opts.systemInstruction } : {}),
    generationConfig,
  })
}

export function parseJSON<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    // Gemini parfois entoure le JSON de backticks markdown
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1]) as T
    throw new Error(`Réponse IA non parseable: ${text.slice(0, 200)}`)
  }
}
