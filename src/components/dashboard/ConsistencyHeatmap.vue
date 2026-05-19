<template>
  <div class="bg-white rounded-3xl p-4 border border-stone-100">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Régularité (90j)</p>
    <div class="flex flex-wrap gap-1">
      <div
        v-for="cell in cells"
        :key="cell.date"
        :title="`${cell.date}${cell.done ? ' ✓' : ''}`"
        class="w-4 h-4 rounded-sm"
        :class="cell.done ? 'bg-skin-500' : 'bg-stone-100'"
      />
    </div>
    <p class="text-xs text-stone-400 mt-2 text-right">{{ doneCount }}/{{ cells.length }} jours</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  entryDates: string[]
}>()

const cells = computed(() => {
  const set = new Set(props.entryDates)
  const today = new Date()
  return Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (89 - i))
    const iso = d.toISOString().split('T')[0]
    return { date: iso, done: set.has(iso) }
  })
})

const doneCount = computed(() => cells.value.filter(c => c.done).length)
</script>
