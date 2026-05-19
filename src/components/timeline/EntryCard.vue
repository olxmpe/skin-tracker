<template>
  <div class="bg-white rounded-3xl border border-stone-100 overflow-hidden">
    <div class="flex gap-3 p-4">
      <!-- Photo thumbnail -->
      <div class="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
        <img v-if="entry.photoUrl" :src="entry.photoUrl" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full flex items-center justify-center text-2xl text-stone-300">📷</div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-stone-700">{{ formattedDate }}</p>
            <p class="text-xs text-stone-400">{{ entry.moment === 'morning' ? 'Matin' : 'Soir' }}</p>
          </div>
          <div v-if="entry.analysis" class="text-right">
            <p class="text-2xl font-bold text-skin-700 leading-none">{{ entry.analysis.glassSkinScore ?? '–' }}</p>
            <p class="text-[9px] text-stone-400">glass skin</p>
          </div>
        </div>

        <div v-if="entry.analysis" class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="badge in badges"
            :key="badge.label"
            class="text-[10px] px-2 py-0.5 rounded-full"
            :style="{ backgroundColor: badge.bg, color: badge.color }"
          >{{ badge.label }}</span>
        </div>

        <p v-if="entry.analysis?.summary" class="text-xs text-stone-500 mt-1 line-clamp-2 italic">
          "{{ entry.analysis.summary }}"
        </p>
      </div>
    </div>

    <div v-if="expanded && entry.analysis" class="border-t border-stone-50 p-4">
      <AnalysisResult :analysis="entry.analysis" />
    </div>

    <button
      v-if="entry.analysis"
      @click="expanded = !expanded"
      class="w-full py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors border-t border-stone-50"
    >
      {{ expanded ? '▲ Réduire' : '▼ Détails' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Entry } from '@/types'
import AnalysisResult from '@/components/agent/AnalysisResult.vue'

const props = defineProps<{ entry: Entry }>()

const expanded = ref(false)

const formattedDate = computed(() => {
  const d = new Date(props.entry.date)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
})

const badges = computed(() => {
  const a = props.entry.analysis
  if (!a) return []
  const result = []
  if (a.vsYesterday === 'amélioration') result.push({ label: '↑ Amélio', bg: '#dcfce7', color: '#166534' })
  if (a.vsYesterday === 'dégradation') result.push({ label: '↓ Dégrad', bg: '#fee2e2', color: '#991b1b' })
  if ((a.acneScore ?? 10) < 5) result.push({ label: 'Acné', bg: '#fef3c7', color: '#92400e' })
  if ((a.rosaceaScore ?? 10) < 5) result.push({ label: 'Rougeur', bg: '#fee2e2', color: '#9f1239' })
  return result
})
</script>
