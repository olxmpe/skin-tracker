<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8 space-y-6">
      <div class="mb-2">
        <p class="text-xs text-stone-400 uppercase tracking-widest">Import</p>
        <h1 class="text-2xl font-bold text-stone-800">Importer des données</h1>
        <p class="text-xs text-stone-400 mt-1">Photos, journaux, exports ChatGPT</p>
      </div>

      <!-- ChatGPT history import -->
      <div class="bg-white rounded-3xl border border-stone-100 p-4">
        <p class="text-sm font-semibold text-stone-700 mb-1">Historique ChatGPT</p>
        <p class="text-xs text-stone-400 mb-3">
          Importe ton historique de conversations peau depuis ChatGPT Exporter
          (fichier JSON). Les messages seront ajoutés à ton historique de chat
          et ton profil pré-rempli.
        </p>
        <label class="btn-secondary flex items-center justify-center gap-2 py-3 cursor-pointer text-sm">
          <span>💬</span> Choisir le fichier JSON
          <input
            type="file"
            accept=".json"
            class="hidden"
            :disabled="importing"
            @change="handleChatGPTImport"
          />
        </label>
        <div v-if="chatgptFile" class="mt-3 space-y-2">
          <p class="text-xs text-stone-500">{{ chatgptFile.name }}</p>
          <button
            @click="uploadChatGPT"
            :disabled="importing"
            class="btn-primary w-full py-2 text-sm"
          >
            {{ importing ? 'Import en cours…' : 'Importer' }}
          </button>
        </div>
      </div>

      <!-- Bulk photo import -->
      <div class="bg-white rounded-3xl border border-stone-100 p-4">
        <p class="text-sm font-semibold text-stone-700 mb-1">Photos en masse</p>
        <p class="text-xs text-stone-400 mb-3">Importe des photos avec la date dans le nom (ex: 2024-03-15.jpg)</p>
        <label class="btn-secondary flex items-center justify-center gap-2 py-3 cursor-pointer text-sm">
          <span>📁</span> Choisir des photos
          <input type="file" accept="image/*" multiple class="hidden" @change="handlePhotoImport" />
        </label>
        <div v-if="photoQueue.length" class="mt-3 space-y-2">
          <p class="text-xs text-stone-500">{{ photoQueue.length }} photo(s) sélectionnée(s)</p>
          <button @click="uploadPhotos" :disabled="importing" class="btn-primary w-full py-2 text-sm">
            {{ importing ? `Import en cours (${importProgress}/${photoQueue.length})…` : 'Importer' }}
          </button>
        </div>
      </div>

      <!-- CSV import -->
      <div class="bg-white rounded-3xl border border-stone-100 p-4">
        <p class="text-sm font-semibold text-stone-700 mb-1">Journal CSV</p>
        <p class="text-xs text-stone-400 mb-3">Format : date, voiceText, combos (colonnes séparées par virgule)</p>
        <label class="btn-secondary flex items-center justify-center gap-2 py-3 cursor-pointer text-sm">
          <span>📊</span> Importer un CSV
          <input type="file" accept=".csv" class="hidden" @change="handleCSVImport" />
        </label>
      </div>

      <!-- Results -->
      <div v-if="results.length" class="bg-stone-100 rounded-2xl p-4 space-y-1">
        <p class="text-xs font-semibold text-stone-500 mb-2">Résultats</p>
        <p v-for="(r, i) in results" :key="i" class="text-xs" :class="r.ok ? 'text-green-700' : 'text-red-600'">
          {{ r.ok ? '✓' : '✕' }} {{ r.message }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { apiFetch } from '@/composables/useApi'

const photoQueue = ref<File[]>([])
const chatgptFile = ref<File | null>(null)
const importing = ref(false)
const importProgress = ref(0)
const results = ref<{ ok: boolean; message: string }[]>([])

function handleChatGPTImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) chatgptFile.value = file
}

async function uploadChatGPT() {
  if (!chatgptFile.value) return
  importing.value = true
  results.value = []

  const fd = new FormData()
  fd.append('file', chatgptFile.value)

  try {
    const res = await apiFetch('/api/import/chatgpt', { method: 'POST', body: fd })
    const data = await res.json() as { imported?: number; error?: string }
    if (res.ok && data.imported != null) {
      results.value = [{ ok: true, message: `${data.imported} messages importés. Profil pré-rempli.` }]
      chatgptFile.value = null
    } else {
      results.value = [{ ok: false, message: data.error ?? 'Erreur inconnue' }]
    }
  } catch {
    results.value = [{ ok: false, message: 'Erreur réseau' }]
  }

  importing.value = false
}

function handlePhotoImport(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) photoQueue.value = Array.from(files)
}

async function uploadPhotos() {
  importing.value = true
  importProgress.value = 0
  results.value = []

  for (const file of photoQueue.value) {
    const fd = new FormData()
    fd.append('photo', file)
    fd.append('source', 'import')
    try {
      const res = await apiFetch('/api/checkin', { method: 'POST', body: fd })
      if (res.ok) {
        results.value.push({ ok: true, message: `${file.name} importé` })
      } else {
        results.value.push({ ok: false, message: `${file.name} — erreur serveur` })
      }
    } catch {
      results.value.push({ ok: false, message: `${file.name} — erreur réseau` })
    }
    importProgress.value++
  }

  photoQueue.value = []
  importing.value = false
}

async function handleCSVImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await apiFetch('/api/import/csv', { method: 'POST', body: fd })
    const data = await res.json() as { imported: number; errors: number }
    results.value = [{ ok: true, message: `${data.imported} lignes importées, ${data.errors} erreurs` }]
  } catch {
    results.value = [{ ok: false, message: 'Import CSV échoué' }]
  }
}
</script>
