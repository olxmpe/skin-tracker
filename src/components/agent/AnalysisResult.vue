<template>
  <div class="space-y-4">
    <!-- Glass skin score -->
    <div class="bg-gradient-to-br from-skin-50 to-stone-50 rounded-3xl p-5 text-center">
      <p class="text-xs font-medium text-stone-400 uppercase tracking-widest mb-1">Glass Skin Score</p>
      <p class="text-6xl font-bold text-skin-700">{{ analysis.glassSkinScore ?? '–' }}</p>
      <p class="text-xs text-stone-500 mt-1">/10</p>
      <div v-if="analysis.vsYesterday" class="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
        :class="{
          'bg-green-100 text-green-700': analysis.vsYesterday === 'amélioration',
          'bg-stone-100 text-stone-500': analysis.vsYesterday === 'stable',
          'bg-red-100 text-red-700': analysis.vsYesterday === 'dégradation',
        }">
        {{ trendIcon }} {{ analysis.vsYesterday }}
      </div>
    </div>

    <!-- Summary -->
    <div v-if="analysis.summary" class="bg-white rounded-2xl p-4 border border-stone-100">
      <p class="text-sm text-stone-700 leading-relaxed italic">"{{ analysis.summary }}"</p>
    </div>

    <!-- 8 dimensions -->
    <div class="grid grid-cols-2 gap-2">
      <div v-for="dim in dimensions" :key="dim.key" class="bg-white rounded-2xl p-3 border border-stone-100">
        <p class="text-[10px] text-stone-400 uppercase tracking-wider">{{ dim.label }}</p>
        <div class="flex items-center gap-2 mt-1">
          <div class="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :style="{ width: `${((dim.value ?? 0) / 10) * 100}%`, backgroundColor: colorForScore(dim.value) }"
            />
          </div>
          <span class="text-sm font-semibold text-stone-700">{{ dim.value ?? '–' }}</span>
        </div>
      </div>
    </div>

    <!-- Zones -->
    <div v-if="hasZones">
      <p class="text-xs font-medium text-stone-400 uppercase tracking-widest mb-2">Zones</p>
      <ZoneScoreGrid :zone-data="analysis.zones" />
    </div>

    <!-- Immediate recos -->
    <div v-if="analysis.immediateRecos?.length" class="bg-amber-50 rounded-2xl p-4">
      <p class="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Ce soir</p>
      <ul class="space-y-1">
        <li v-for="(r, i) in analysis.immediateRecos" :key="i" class="flex gap-2 text-sm text-amber-800">
          <span class="text-amber-400 mt-0.5">▸</span>
          <span>{{ r }}</span>
        </li>
      </ul>
    </div>

    <!-- Routine for tonight -->
    <div v-if="analysis.routineForTonight?.length" class="bg-skin-50 rounded-2xl p-4">
      <p class="text-xs font-semibold text-skin-700 uppercase tracking-wider mb-2">Routine du soir</p>
      <ol class="space-y-1">
        <li v-for="(step, i) in analysis.routineForTonight" :key="i" class="flex gap-2 text-sm text-skin-800">
          <span class="font-bold text-skin-400">{{ i + 1 }}.</span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SkinAnalysis } from '@/types'
import ZoneScoreGrid from './ZoneScoreGrid.vue'

const props = defineProps<{ analysis: SkinAnalysis }>()

const trendIcon = computed(() => {
  if (props.analysis.vsYesterday === 'amélioration') return '↑'
  if (props.analysis.vsYesterday === 'dégradation') return '↓'
  return '→'
})

const dimensions = computed(() => [
  { key: 'acne', label: 'Acné', value: props.analysis.acneScore },
  { key: 'hydration', label: 'Hydratation', value: props.analysis.hydrationScore },
  { key: 'radiance', label: 'Éclat', value: props.analysis.radianceScore },
  { key: 'texture', label: 'Texture', value: props.analysis.textureScore },
  { key: 'firmness', label: 'Fermeté', value: props.analysis.firmnessScore },
  { key: 'evenness', label: 'Uniformité', value: props.analysis.evennessScore },
  { key: 'fine_lines', label: 'Rides', value: props.analysis.fineLinesScore },
  { key: 'barrier', label: 'Barrière', value: props.analysis.barrierScore },
])

const hasZones = computed(() => Object.keys(props.analysis.zones ?? {}).length > 0)

function colorForScore(score: number | null) {
  if (score === null) return '#d6d3d1'
  if (score >= 8) return '#22c55e'
  if (score >= 6) return '#eab308'
  if (score >= 4) return '#f97316'
  return '#ef4444'
}
</script>
