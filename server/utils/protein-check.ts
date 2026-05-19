const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.4,
  moderate: 1.6,
  active: 1.8,
  very_active: 2.0,
}

export function computeProteinGoal(weightKg: number, activityLevel: string): number {
  const factor = ACTIVITY_FACTOR[activityLevel] ?? 1.6
  return Math.round(weightKg * factor)
}

export interface ProteinCheckResult {
  consumed_g: number
  goal_g: number
  deficit_g: number
  met: boolean
  alert: boolean   // alerte si déficit > 20g
}

export function checkProteinBalance(params: {
  consumedG: number
  weightKg: number
  activityLevel: string
  customGoalG?: number
}): ProteinCheckResult {
  const goal = params.customGoalG ?? computeProteinGoal(params.weightKg, params.activityLevel)
  const deficit = Math.max(0, goal - params.consumedG)

  return {
    consumed_g: params.consumedG,
    goal_g: goal,
    deficit_g: deficit,
    met: deficit === 0,
    alert: deficit >= 20,
  }
}
