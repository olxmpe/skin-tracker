<template>
  <div class="bg-white rounded-3xl border border-stone-100 overflow-hidden">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest p-4 pb-2">Comparaison</p>

    <div class="flex gap-2 px-4 pb-2">
      <div v-for="(slot, idx) in slots" :key="idx" class="flex-1">
        <select
          :value="slot.entryId"
          @change="selectEntry(idx, Number(($event.target as HTMLSelectElement).value))"
          class="w-full text-xs rounded-xl border border-stone-200 px-2 py-1.5 focus:outline-none"
        >
          <option value="">Choisir...</option>
          <option v-for="e in entries" :key="e.id" :value="e.id">
            {{ formatDate(e.date) }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex gap-2 p-4 pt-2">
      <div v-for="(slot, idx) in slots" :key="idx" class="flex-1">
        <div class="aspect-square rounded-2xl overflow-hidden bg-stone-100">
          <img v-if="slot.photoUrl" :src="slot.photoUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-stone-300 text-3xl">📷</div>
        </div>
        <div v-if="slot.score !== null" class="text-center mt-1">
          <span class="text-sm font-bold text-skin-700">{{ slot.score }}</span>
          <span class="text-[10px] text-stone-400">/10</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { Entry } from '@/types'

const props = defineProps<{ entries: Entry[] }>()

const slots = reactive([
  { entryId: 0, photoUrl: null as string | null, score: null as number | null },
  { entryId: 0, photoUrl: null as string | null, score: null as number | null },
])

function selectEntry(idx: number, id: number) {
  const entry = props.entries.find(e => e.id === id)
  slots[idx].entryId = id
  slots[idx].photoUrl = entry?.photoUrl ?? null
  slots[idx].score = entry?.analysis?.glassSkinScore ?? null
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
</script>
