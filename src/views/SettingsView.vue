<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 space-y-6">
      <div class="mb-2">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Profil</p>
        <h1 class="text-2xl font-bold text-stone-800">Mes infos</h1>
      </div>

      <form @submit.prevent="save" class="space-y-4">
        <div class="bg-white rounded-3xl border border-stone-100 overflow-hidden divide-y divide-stone-50">
          <!-- Age -->
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Âge</span>
            <input v-model.number="form.age" type="number" min="10" max="100" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">ans</span>
          </div>
          <!-- Weight -->
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Poids</span>
            <input v-model.number="form.weightKg" type="number" min="30" max="200" step="0.1" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">kg</span>
          </div>
          <!-- Height -->
          <div class="flex items-center px-4 py-3 gap-3">
            <span class="text-stone-400 text-sm w-28 flex-shrink-0">Taille</span>
            <input v-model.number="form.heightCm" type="number" min="100" max="220" class="flex-1 text-sm text-right focus:outline-none text-stone-800" placeholder="–" />
            <span class="text-xs text-stone-400">cm</span>
          </div>
          <!-- Activity level -->
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

        <!-- Nutrition goals -->
        <div>
          <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">Objectifs nutrition</p>
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
        </div>

        <!-- Skin conditions -->
        <div>
          <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">Conditions cutanées</p>
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
        </div>

        <!-- WhatsApp -->
        <div>
          <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 px-1">WhatsApp</p>
          <div class="bg-white rounded-3xl border border-stone-100 p-4">
            <p class="text-sm text-stone-600">Pour recevoir tes analyses sur WhatsApp, envoie une photo au numéro :</p>
            <p class="text-base font-bold text-skin-700 mt-1">{{ whatsappNumber }}</p>
            <p class="text-xs text-stone-400 mt-2">Le Skin Guru te guidera automatiquement.</p>
          </div>
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

const settingsStore = useSettingsStore()
const saving = ref(false)
const saved = ref(false)

const whatsappNumber = import.meta.env.VITE_WHATSAPP_DISPLAY_NUMBER ?? '+33 X XX XX XX XX'

const form = reactive({
  age: null as number | null,
  weightKg: null as number | null,
  heightCm: null as number | null,
  proteinGoalG: null as number | null,
  caloriesGoal: null as number | null,
  activityLevel: 'moderate' as string,
  skinConditions: [] as string[],
})

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
  }
})
</script>
