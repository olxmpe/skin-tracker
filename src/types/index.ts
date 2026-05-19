export interface UserProfile {
  id: number
  age: number | null
  weightKg: number | null
  heightCm: number | null
  proteinGoalG: number | null
  carbsGoalG: number | null
  fatGoalG: number | null
  caloriesGoal: number | null
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  skinConditions: string[]
  cycleLength: number
  lastPeriodDate: string | null
}

export interface SkinAnalysis {
  id: number
  entryId: number
  date: string
  acneScore: number | null
  hydrationScore: number | null
  radianceScore: number | null
  textureScore: number | null
  firmnessScore: number | null
  evennessScore: number | null
  fineLinesScore: number | null
  barrierScore: number | null
  rosaceaScore: number | null
  glassSkinScore: number | null
  zones: Record<string, ZoneAnalysis>
  lesionsActive: { count: number; picking: boolean; infected: boolean; zones: string[] }
  vsYesterday: 'amélioration' | 'stable' | 'dégradation' | null
  summary: string | null
  immediateRecos: string[]
  routineForTonight: string[]
}

export interface ZoneAnalysis {
  score: number
  acne_score?: number
  redness_score?: number
  fine_lines_score?: number
  notes: string
}

export interface Entry {
  id: number
  date: string
  moment: 'morning' | 'evening'
  photoPath: string | null
  photoUrl: string | null
  voiceTranscript: string | null
  source: 'web' | 'whatsapp' | 'import'
  analysis?: SkinAnalysis
}

export interface Combo {
  id: number
  name: string
  type: 'routine' | 'meal'
  description: string | null
  items: unknown[]
  usageCount: number
}

export interface Product {
  id: number
  name: string
  brand: string | null
  category: string | null
  inciRaw: string | null
  isActive: boolean
  ingredients?: InciIngredient[]
}

export interface InciIngredient {
  id: number
  productId: number
  name: string
  inci: string
  riskLevel: number | null
  functions: string[]
  concerns: string[]
  comedogenic: number | null
  irritant: boolean
  allergen: boolean
}

export interface NutritionLog {
  id: number
  date: string
  description: string | null
  foods: FoodItem[]
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  calories: number | null
  macrosSource: string
}

export interface FoodItem {
  name: string
  quantity_g: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  calories: number | null
}

export interface AnalyticsOverview {
  dates: string[]
  glass_skin_score: (number | null)[]
  rosacea_score: (number | null)[]
  dimensions: {
    acne: (number | null)[]
    hydration: (number | null)[]
    radiance: (number | null)[]
    texture: (number | null)[]
    firmness: (number | null)[]
    evenness: (number | null)[]
    fine_lines: (number | null)[]
    barrier: (number | null)[]
  }
  count: number
}

export interface Correlation {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  impactScore: number
  confidence: number
  dataPoints: number
  zone?: string
}

export interface EvolutionProposal {
  id: number
  trigger: string
  description: string
  proposedChanges: string
  status: 'pending' | 'confirmed' | 'executing' | 'applied' | 'rejected'
  prUrl: string | null
  createdAt: string
}
