<template>
  <div class="grid grid-cols-3 gap-2">
    <div
      v-for="zone in zones"
      :key="zone.key"
      class="rounded-2xl p-3 text-center"
      :style="{ backgroundColor: bgFor(zone.score) }"
    >
      <p class="text-[10px] font-medium text-stone-600 mb-1">{{ zone.label }}</p>
      <p class="text-xl font-bold" :style="{ color: colorFor(zone.score) }">
        {{ zone.score !== null ? zone.score : '–' }}
      </p>
      <p v-if="zone.notes" class="text-[9px] text-stone-500 leading-tight mt-1 line-clamp-2">{{ zone.notes }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ZoneAnalysis } from '@/types'

const props = defineProps<{
  zoneData: Record<string, ZoneAnalysis>
}>()

const ZONE_LABELS: Record<string, string> = {
  front: 'Front',
  nose: 'Nez',
  left_cheek: 'Joue G',
  right_cheek: 'Joue D',
  chin: 'Menton',
  mouth: 'Bouche',
  eyes: 'Yeux',
  neck: 'Cou',
  jaw: 'Mâchoire',
}

const zones = Object.entries(props.zoneData).map(([key, data]) => ({
  key,
  label: ZONE_LABELS[key] ?? key,
  score: data.score ?? null,
  notes: data.notes ?? '',
}))

function bgFor(score: number | null) {
  if (score === null) return '#f5f5f4'
  if (score >= 8) return '#f0fdf4'
  if (score >= 6) return '#fefce8'
  if (score >= 4) return '#fff7ed'
  return '#fef2f2'
}

function colorFor(score: number | null) {
  if (score === null) return '#a8a29e'
  if (score >= 8) return '#16a34a'
  if (score >= 6) return '#ca8a04'
  if (score >= 4) return '#ea580c'
  return '#dc2626'
}
</script>
