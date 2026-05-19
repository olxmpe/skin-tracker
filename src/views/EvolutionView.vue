<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 space-y-4">
      <div class="mb-2">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Auto-évolution</p>
        <h1 class="text-2xl font-bold text-stone-800">Propositions</h1>
        <p class="text-xs text-stone-400 mt-1">Le Skin Guru adapte l'app à tes patterns.</p>
      </div>

      <div v-if="loading" class="text-center py-12 text-stone-400">Chargement…</div>

      <div v-else class="space-y-3">
        <div
          v-for="p in proposals"
          :key="p.id"
          class="bg-white rounded-3xl border border-stone-100 p-4"
        >
          <div class="flex items-start gap-3">
            <span class="text-2xl mt-0.5">{{ statusIcon(p.status) }}</span>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  :class="statusClass(p.status)">{{ p.status }}</span>
                <span class="text-[10px] text-stone-400">{{ formatDate(p.createdAt) }}</span>
              </div>
              <p class="text-sm font-semibold text-stone-800">{{ p.description }}</p>
              <p class="text-xs text-stone-500 mt-1">Déclencheur : {{ p.trigger }}</p>

              <details v-if="p.proposedChanges" class="mt-2">
                <summary class="text-xs text-stone-400 cursor-pointer">Voir les changements proposés</summary>
                <pre class="text-[10px] bg-stone-50 rounded-xl p-3 mt-2 overflow-auto max-h-40 text-stone-600 whitespace-pre-wrap">{{ p.proposedChanges }}</pre>
              </details>

              <a v-if="p.prUrl" :href="p.prUrl" target="_blank" class="text-xs text-skin-600 underline mt-2 inline-block">
                Voir la PR GitHub
              </a>
            </div>
          </div>

          <div v-if="p.status === 'pending'" class="flex gap-2 mt-3 pt-3 border-t border-stone-50">
            <button
              @click="execute(p.id)"
              :disabled="executing === p.id"
              class="btn-primary flex-1 py-2 text-sm"
            >
              {{ executing === p.id ? 'En cours…' : 'Exécuter' }}
            </button>
            <button @click="reject(p.id)" class="btn-secondary flex-1 py-2 text-sm">Rejeter</button>
          </div>
        </div>

        <p v-if="proposals.length === 0" class="text-center text-stone-400 py-12">
          Aucune proposition pour l'instant.<br/>
          <span class="text-xs">Le Skin Guru proposera des améliorations après 30 jours de données.</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiFetch } from '@/composables/useApi'
import type { EvolutionProposal } from '@/types'

const proposals = ref<EvolutionProposal[]>([])
const loading = ref(false)
const executing = ref<number | null>(null)

async function load() {
  loading.value = true
  const res = await apiFetch('/api/evolution')
  proposals.value = await res.json() as EvolutionProposal[]
  loading.value = false
}

async function execute(id: number) {
  executing.value = id
  await apiFetch(`/api/evolution/${id}/execute`, { method: 'POST' })
  await load()
  executing.value = null
}

async function reject(id: number) {
  await apiFetch(`/api/evolution/${id}/reject`, { method: 'POST' })
  await load()
}

function statusIcon(status: string) {
  const icons: Record<string, string> = {
    pending: '◌', confirmed: '◎', executing: '◷', applied: '✦', rejected: '✕'
  }
  return icons[status] ?? '?'
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    executing: 'bg-purple-100 text-purple-700',
    applied: 'bg-green-100 text-green-700',
    rejected: 'bg-stone-100 text-stone-500',
  }
  return classes[status] ?? ''
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

onMounted(load)
</script>
