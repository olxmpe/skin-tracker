<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 space-y-6">
      <div class="mb-2">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Profil</p>
        <h1 class="text-2xl font-bold text-stone-800">Mes infos</h1>
      </div>

      <form @submit.prevent="save" class="space-y-4">
        <!-- Infos de base -->
        <div class="bg-white rounded-3xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Sexe</span>
            <select v-model="form.sex" class="flex-1 text-sm text-right focus:outline-none text-stone-800 bg-transparent">
              <option value="female">Femme</option>
              <option value="male">Homme</option>
            </select>
          </div>
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Âge</span>
            <input v-model.number="form.age" type="number" min="10" max="100" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">ans</span>
          </div>
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Poids</span>
            <input v-model.number="form.weightKg" type="number" min="30" max="200" step="0.1" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">kg</span>
          </div>
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Taille</span>
            <input v-model.number="form.heightCm" type="number" min="100" max="220" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">cm</span>
          </div>
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Activité</span>
            <select v-model="form.activityLevel" class="flex-1 text-sm text-right focus:outline-none text-stone-800 bg-transparent">
              <option value="sedentary">Sédentaire</option>
              <option value="light">Légère</option>
              <option value="moderate">Modérée</option>
              <option value="active">Active</option>
              <option value="very_active">Très active</option>
            </select>
          </div>
        </div>

        <!-- Objectifs nutrition -->
        <div>
          <div class="flex items-center justify-between mb-2 px-1">
            <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest">Objectifs nutrition</p>
            <button
              type="button"
              @click="calcNutrition"
              :disabled="!form.weightKg || !form.heightCm || !form.age"
              class="text-xs text-skin-700 font-medium disabled:text-stone-300 disabled:cursor-not-allowed"
            >Calculer automatiquement →</button>
          </div>
          <div class="bg-white rounded-3xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
            <div class="flex items-center px-4 py-3 gap-3">
              <span class="text-stone-400 text-sm w-28 flex-shrink-0">Protéines</span>
              <input v-model.number="form.proteinGoalG" type="number" min="0" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
              <span class="text-xs text-stone-400">g/j</span>
            </div>
            <div class="flex items-center px-4 py-3 gap-3">
              <span class="text-stone-400 text-sm w-28 flex-shrink-0">Calories</span>
              <input v-model.number="form.caloriesGoal" type="number" min="0" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
              <span class="text-xs text-stone-400">kcal</span>
            </div>
          </div>
          <p class="text-xs text-stone-400 px-1 mt-1">Calculé avec Mifflin-St Jeor · protéines 1,6 g/kg</p>
        </div>

        <!-- Conditions cutanées -->
        <div>
          <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">Conditions cutanées connues</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="cond in CONDITIONS"
              :key="cond"
              type="button"
              @click="toggleCondition(cond)"
              class="px-3 py-1.5 rounded-xl text-sm transition-colors"
              :class="form.skinConditions.includes(cond) ? 'bg-skin-700 text-white' : 'bg-white text-stone-500 border border-stone-200'"
            >{{ cond }}</button>
          </div>
          <p class="text-xs text-stone-400 px-1 mt-2">L'IA détectera également des patterns à partir de tes photos.</p>
        </div>

        <button type="submit" :disabled="saving" class="btn-primary w-full py-3">
          {{ saving ? 'Enregistrement…' : 'Sauvegarder' }}
        </button>

        <p v-if="saved" class="text-center text-green-600 text-sm">Profil enregistré ✓</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const CONDITIONS = ['Rosacée', 'Acné', 'Eczéma', 'Peau sensible', 'Peau grasse', 'Peau sèche', 'Taches', 'Rides']

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
}

const settingsStore = useSettingsStore()
const saving = ref(false)
const saved = ref(false)

const form = reactive({
  sex: 'female' as 'female' | 'male',
  age: null as number | null,
  weightKg: null as number | null,
  heightCm: null as number | null,
  proteinGoalG: null as number | null,
  caloriesGoal: null as number | null,
  activityLevel: 'moderate' as string,
  skinConditions: [] as string[],
})

function calcNutrition() {
  if (!form.weightKg || !form.heightCm || !form.age) return
  const w = form.weightKg, h = form.heightCm, a = form.age
  const bmr = form.sex === 'female'
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5
  const tdee = bmr * (ACTIVITY_FACTORS[form.activityLevel] ?? 1.55)
  form.caloriesGoal = Math.round(tdee)
  form.proteinGoalG = Math.round(1.6 * w)
}

function toggleCondition(cond: string) {
  const idx = form.skinConditions.indexOf(cond)
  if (idx >= 0) form.skinConditions.splice(idx, 1)
  else form.skinConditions.push(cond)
}

async function save() {
  saving.value = true
  await settingsStore.saveProfile({ ...form })
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

onMounted(async () => {
  await settingsStore.fetchProfile()
  if (settingsStore.profile) {
    Object.assign(form, settingsStore.profile)
    if (settingsStore.profile.skinConditions) {
      form.skinConditions = typeof settingsStore.profile.skinConditions === 'string'
        ? JSON.parse(settingsStore.profile.skinConditions)
        : settingsStore.profile.skinConditions
    }
  }
})
</script>
