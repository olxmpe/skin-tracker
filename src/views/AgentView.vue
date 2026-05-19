<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 pb-4">
      <!-- Header -->
      <div class="mb-6">
        <p class="text-xs text-stone-400 uppercase tracking-widest">{{ greeting }}</p>
        <h1 class="text-2xl font-bold text-stone-800 mt-0.5">Check-in du jour</h1>
        <p class="text-sm text-stone-500 mt-1">{{ formattedToday }}</p>
      </div>

      <!-- Already done today -->
      <div v-if="analysisStore.todayAnalysis && !forceRedo" class="space-y-4">
        <div class="bg-skin-50 rounded-3xl p-4 flex items-center gap-3 border border-skin-100">
          <span class="text-2xl">✦</span>
          <div>
            <p class="text-sm font-semibold text-skin-800">Check-in effectué</p>
            <p class="text-xs text-skin-600">Ton score du jour : {{ analysisStore.todayAnalysis.glassSkinScore ?? '–' }}/10</p>
          </div>
          <button @click="forceRedo = true" class="ml-auto text-xs text-stone-400 underline">Refaire</button>
        </div>
        <AnalysisResult :analysis="analysisStore.todayAnalysis" />
      </div>

      <!-- Check-in form -->
      <div v-else class="space-y-6">
        <!-- Step indicator -->
        <div class="flex gap-1">
          <div v-for="s in 3" :key="s" class="flex-1 h-1 rounded-full" :class="step >= s ? 'bg-skin-500' : 'bg-stone-200'" />
        </div>

        <!-- Step 1: Photo -->
        <div v-if="step === 1" class="space-y-4">
          <div>
            <p class="text-base font-semibold text-stone-700 mb-1">1. Ta photo du jour</p>
            <p class="text-xs text-stone-400 mb-3">Sans maquillage, en pleine lumière</p>
            <PhotoUpload v-model="photo" />
          </div>
          <button @click="step = 2" :disabled="!photo" class="btn-primary w-full py-3 disabled:opacity-40">
            Continuer →
          </button>
        </div>

        <!-- Step 2: Voice / context -->
        <div v-if="step === 2" class="space-y-4">
          <div>
            <p class="text-base font-semibold text-stone-700 mb-1">2. Dis-moi comment tu vas</p>
            <p class="text-xs text-stone-400 mb-3">Alimentation, sommeil, stress, nouveaux produits…</p>
            <VoiceInput v-model="voiceText" />
          </div>

          <div>
            <p class="text-sm font-medium text-stone-600 mb-2">Routine utilisée ?</p>
            <ComboSelector v-model="selectedCombos" />
          </div>

          <div class="flex gap-2">
            <button @click="step = 1" class="btn-secondary flex-1 py-3">← Retour</button>
            <button @click="submit" :disabled="submitting" class="btn-primary flex-1 py-3 disabled:opacity-40">
              {{ submitting ? 'Analyse…' : 'Analyser ✦' }}
            </button>
          </div>
        </div>

        <!-- Step 3: Streaming result -->
        <div v-if="step === 3" class="space-y-4">
          <div v-if="submitting" class="text-center py-12">
            <div class="w-16 h-16 rounded-full bg-skin-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span class="text-2xl">✦</span>
            </div>
            <p class="text-sm font-semibold text-stone-600">{{ streamStatus }}</p>
            <p class="text-xs text-stone-400 mt-1">Le Skin Guru analyse ta peau…</p>
          </div>

          <AnalysisResult v-else-if="analysisStore.todayAnalysis" :analysis="analysisStore.todayAnalysis" />

          <div v-if="submitError" class="bg-red-50 rounded-2xl p-4">
            <p class="text-sm text-red-700">{{ submitError }}</p>
            <button @click="step = 2; submitting = false" class="text-xs text-red-500 underline mt-2">Réessayer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysis'
import { useCombosStore } from '@/stores/combos'
import PhotoUpload from '@/components/agent/PhotoUpload.vue'
import VoiceInput from '@/components/agent/VoiceInput.vue'
import ComboSelector from '@/components/agent/ComboSelector.vue'
import AnalysisResult from '@/components/agent/AnalysisResult.vue'

const analysisStore = useAnalysisStore()
const combosStore = useCombosStore()

const step = ref(1)
const photo = ref<File | null>(null)
const voiceText = ref<string | null>(null)
const selectedCombos = ref<number[]>([])
const submitting = ref(false)
const submitError = ref<string | null>(null)
const streamStatus = ref('Envoi de la photo…')
const forceRedo = ref(false)

const formattedToday = computed(() => new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long'
}))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
})

async function submit() {
  submitting.value = true
  submitError.value = null
  step.value = 3

  try {
    const statuses = ['Envoi de la photo…', 'Analyse en cours…', 'Extraction des données…', 'Finalisation…']
    let si = 0
    const statusInterval = setInterval(() => {
      si = Math.min(si + 1, statuses.length - 1)
      streamStatus.value = statuses[si]
    }, 2000)

    const fd = new FormData()
    fd.append('photo', photo.value!)
    if (voiceText.value) fd.append('voiceText', voiceText.value)
    if (selectedCombos.value.length) fd.append('comboIds', JSON.stringify(selectedCombos.value))
    await analysisStore.submitCheckin(fd)

    clearInterval(statusInterval)
    submitting.value = false
  } catch (e) {
    submitError.value = 'Une erreur est survenue. Réessaie.'
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    analysisStore.fetchToday(),
    combosStore.fetchAll(),
  ])
})
</script>
