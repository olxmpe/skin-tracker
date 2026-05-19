import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Combo } from '@/types'
import { apiFetch } from '@/composables/useApi'

export const useCombosStore = defineStore('combos', () => {
  const routineCombos = ref<Combo[]>([])
  const mealCombos = ref<Combo[]>([])

  async function fetchAll() {
    const [r, m] = await Promise.all([
      apiFetch('/api/combos?type=routine').then(r => r.json() as Promise<Combo[]>),
      apiFetch('/api/combos?type=meal').then(r => r.json() as Promise<Combo[]>),
    ])
    routineCombos.value = r
    mealCombos.value = m
  }

  async function create(combo: Omit<Combo, 'id' | 'usageCount'>) {
    const res = await apiFetch('/api/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(combo),
    })
    const created = await res.json() as Combo
    if (combo.type === 'routine') routineCombos.value.push(created)
    else mealCombos.value.push(created)
    return created
  }

  async function remove(id: number) {
    await apiFetch(`/api/combos/${id}`, { method: 'DELETE' })
    routineCombos.value = routineCombos.value.filter(c => c.id !== id)
    mealCombos.value = mealCombos.value.filter(c => c.id !== id)
  }

  return { routineCombos, mealCombos, fetchAll, create, remove }
})
