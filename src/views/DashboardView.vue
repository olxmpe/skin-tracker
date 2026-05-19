<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 space-y-4">
      <div class="mb-2">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Dashboard</p>
        <h1 class="text-2xl font-bold text-stone-800">Ta progression</h1>
      </div>

      <!-- Period selector -->
      <div class="flex gap-2">
        <button
          v-for="p in periods"
          :key="p.key"
          @click="period = p.key"
          class="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
          :class="period === p.key ? 'bg-skin-700 text-white' : 'bg-white text-stone-500 border border-stone-200'"
        >{{ p.label }}</button>
      </div>

      <div v-if="loading" class="text-center py-12 text-stone-400">Chargement…</div>

      <template v-else-if="overview">
        <GlassSkinChart :dates="overview.dates" :values="overview.glass_skin_score" />
        <DimensionsRadar :dimensions="overview.dimensions" />

        <div class="grid grid-cols-2 gap-4">
          <!-- Streak -->
          <div class="bg-white rounded-3xl p-4 border border-stone-100 text-center">
            <p class="text-xs text-stone-400 uppercase tracking-widest mb-1">Streak</p>
            <p class="text-4xl font-bold text-skin-700">{{ streak }}</p>
            <p class="text-xs text-stone-400">jours consécutifs</p>
          </div>
          <!-- Best score -->
          <div class="bg-white rounded-3xl p-4 border border-stone-100 text-center">
            <p class="text-xs text-stone-400 uppercase tracking-widest mb-1">Meilleur score</p>
            <p class="text-4xl font-bold text-skin-700">{{ bestScore }}</p>
            <p class="text-xs text-stone-400">glass skin /10</p>
          </div>
        </div>

        <ZoneScoreChart :zone-averages="zoneAverages" />
        <ConsistencyHeatmap :entry-dates="overview.dates" />

        <!-- Correlations -->
        <div v-if="correlations.length" class="bg-white rounded-3xl p-4 border border-stone-100">
          <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Corrélations détectées</p>
          <div class="space-y-2">
            <div v-for="c in correlations.slice(0, 5)" :key="c.factor" class="flex items-center gap-3">
              <span class="text-base">{{ c.impact === 'positive' ? '↑' : c.impact === 'negative' ? '↓' : '→' }}</span>
              <div class="flex-1">
                <p class="text-sm font-medium text-stone-700">{{ c.factor }}</p>
                <p class="text-[10px] text-stone-400">{{ c.dataPoints }} points · confiance {{ Math.round(c.confidence * 100) }}%</p>
              </div>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="{
                  'bg-green-100 text-green-700': c.impact === 'positive',
                  'bg-red-100 text-red-700': c.impact === 'negative',
                  'bg-stone-100 text-stone-500': c.impact === 'neutral',
                }"
              >{{ c.impactScore > 0 ? '+' : '' }}{{ c.impactScore.toFixed(1) }}</span>
            </div>
          </div>
        </div>
      </template>

      <p v-else class="text-center text-stone-400 py-12">
        Effectue au moins un check-in pour voir tes données.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAnalysisStore } from '@/stores/analysis'
import type { Correlation } from '@/types'
import GlassSkinChart from '@/components/dashboard/GlassSkinChart.vue'
import DimensionsRadar from '@/components/dashboard/DimensionsRadar.vue'
import ZoneScoreChart from '@/components/dashboard/ZoneScoreChart.vue'
import ConsistencyHeatmap from '@/components/dashboard/ConsistencyHeatmap.vue'

const analysisStore = useAnalysisStore()
const period = ref('30d')
const loading = ref(false)
const correlations = ref<Correlation[]>([])

const periods = [
  { key: '7d', label: '7j' },
  { key: '30d', label: '30j' },
  { key: '90d', label: '90j' },
]

const overview = computed(() => analysisStore.overview)

const streak = computed(() => {
  if (!overview.value) return 0
  const dates = new Set(overview.value.dates)
  let s = 0
  const d = new Date()
  while (true) {
    const iso = d.toISOString().split('T')[0]
    if (!dates.has(iso)) break
    s++
    d.setDate(d.getDate() - 1)
  }
  return s
})

const bestScore = computed(() => {
  if (!overview.value) return '–'
  const vals = overview.value.glass_skin_score.filter((v): v is number => v !== null)
  return vals.length ? Math.max(...vals) : '–'
})

const zoneAverages = computed<Record<string, number>>(() => {
  return {}
})

async function load() {
  loading.value = true
  await analysisStore.fetchOverview(period.value)
  try {
    const res = await fetch(`/api/analytics/correlations?period=${period.value}`)
    correlations.value = await res.json() as Correlation[]
  } catch { correlations.value = [] }
  loading.value = false
}

watch(period, load)
onMounted(load)
</script>
