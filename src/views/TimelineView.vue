<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8">
      <div class="mb-6">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Historique</p>
        <h1 class="text-2xl font-bold text-stone-800">Tes check-ins</h1>
      </div>

      <PhotoComparator v-if="entries.length >= 2" :entries="entries" class="mb-4" />

      <div v-if="loading" class="text-center py-12 text-stone-400">Chargement…</div>

      <div v-else class="space-y-3">
        <EntryCard v-for="entry in entries" :key="entry.id" :entry="entry" />
        <p v-if="entries.length === 0" class="text-center text-stone-400 py-12">
          Aucun check-in pour l'instant.
        </p>
        <button
          v-if="hasMore"
          @click="loadMore"
          :disabled="loadingMore"
          class="btn-secondary w-full py-3 text-sm"
        >
          {{ loadingMore ? 'Chargement…' : 'Voir plus' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Entry } from '@/types'
import EntryCard from '@/components/timeline/EntryCard.vue'
import PhotoComparator from '@/components/timeline/PhotoComparator.vue'
import { apiFetch } from '@/composables/useApi'

const entries = ref<Entry[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(false)
const page = ref(1)
const PAGE_SIZE = 20

async function fetchEntries(p: number) {
  const res = await apiFetch(`/api/entries?page=${p}&limit=${PAGE_SIZE}`)
  const data = await res.json() as { entries: Entry[]; total: number }
  return data
}

async function load() {
  loading.value = true
  const data = await fetchEntries(1)
  entries.value = data.entries
  hasMore.value = data.total > PAGE_SIZE
  page.value = 1
  loading.value = false
}

async function loadMore() {
  loadingMore.value = true
  const data = await fetchEntries(page.value + 1)
  entries.value = [...entries.value, ...data.entries]
  page.value++
  hasMore.value = entries.value.length < data.total
  loadingMore.value = false
}

onMounted(load)
</script>
