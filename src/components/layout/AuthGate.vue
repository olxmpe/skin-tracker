<template>
  <slot v-if="authenticated" />

  <div v-else class="fixed inset-0 bg-stone-50 flex flex-col items-center justify-center px-8 z-[100]">
    <div class="w-full max-w-xs space-y-8">
      <!-- Logo -->
      <div class="text-center space-y-2">
        <div class="w-16 h-16 rounded-full bg-skin-100 flex items-center justify-center text-3xl mx-auto">✦</div>
        <h1 class="text-xl font-bold text-stone-800">Skin Tracker</h1>
        <p class="text-sm text-stone-400">Entrez votre mot de passe pour accéder à vos données.</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="space-y-3">
        <input
          v-model="password"
          type="password"
          placeholder="Mot de passe"
          autocomplete="current-password"
          autofocus
          class="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-skin-300 bg-white"
          :class="{ 'border-red-300 ring-2 ring-red-100': error }"
        />
        <p v-if="error" class="text-xs text-red-500 text-center">{{ error }}</p>
        <button
          type="submit"
          :disabled="!password || checking"
          class="btn-primary w-full py-3 text-sm disabled:opacity-40"
        >
          {{ checking ? 'Vérification…' : 'Accéder' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { setStoredToken, getStoredToken, clearStoredToken, apiFetch } from '@/composables/useApi'

const authenticated = ref(false)
const password = ref('')
const error = ref('')
const checking = ref(false)

async function verify(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/profile`, {
      headers: { 'X-App-Token': token },
    })
    return res.status !== 401
  } catch {
    return true // réseau indisponible : laisser passer, l'app gérera les erreurs
  }
}

async function submit() {
  if (!password.value || checking.value) return
  checking.value = true
  error.value = ''
  const ok = await verify(password.value)
  if (ok) {
    setStoredToken(password.value)
    authenticated.value = true
  } else {
    error.value = 'Mot de passe incorrect.'
    password.value = ''
  }
  checking.value = false
}

function onLogout() {
  authenticated.value = false
  password.value = ''
  error.value = ''
}

onMounted(async () => {
  const stored = getStoredToken()
  if (stored) {
    const ok = await verify(stored)
    if (ok) {
      authenticated.value = true
    } else {
      clearStoredToken()
    }
  }
  window.addEventListener('auth:logout', onLogout)
})

onUnmounted(() => window.removeEventListener('auth:logout', onLogout))
</script>
