<template>
  <div class="flex flex-col bg-stone-50" style="height: calc(100dvh - 3.5rem)">

    <!-- Header -->
    <div class="flex-shrink-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-skin-100 flex items-center justify-center text-lg">✦</div>
      <div>
        <p class="text-sm font-semibold text-stone-800">Skin Guru</p>
        <p class="text-[10px] text-stone-400">{{ chatStore.sending ? chatStore.statusText || 'En train d\'écrire...' : 'En ligne' }}</p>
      </div>
      <button @click="chatStore.clearHistory()" class="ml-auto text-xs text-stone-300 hover:text-stone-500 transition-colors">
        Effacer
      </button>
    </div>

    <!-- Quota banner -->
    <div v-if="quotaExhausted" class="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
      <span>⚠️</span>
      <span>Quota Gemini épuisé — l'IA ne peut pas répondre pour l'instant. Réessayez demain.</span>
    </div>

    <!-- Messages -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-2">
      <!-- Message de bienvenue -->
      <div v-if="chatStore.messages.length === 0" class="text-center py-12 space-y-2">
        <div class="w-16 h-16 rounded-full bg-skin-100 flex items-center justify-center text-3xl mx-auto">✦</div>
        <p class="text-base font-semibold text-stone-700">Skin Guru</p>
        <p class="text-sm text-stone-400 max-w-xs mx-auto leading-relaxed">
          Envoie ta photo du jour pour commencer ton check-in, ou pose-moi n'importe quelle question sur ta peau.
        </p>
      </div>

      <MessageBubble
        v-for="(msg, idx) in chatStore.messages"
        :key="msg.id"
        :msg="msg"
        :answered="isButtonsAnswered(idx)"
        @button-click="handleButtonClick"
      />

      <!-- Typing indicator -->
      <div v-if="chatStore.sending" class="flex gap-2">
        <div class="w-7 h-7 rounded-full bg-skin-100 flex items-center justify-center text-sm">✦</div>
        <div class="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-stone-100 flex gap-1 items-center">
          <span class="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style="animation-delay: 0ms" />
          <span class="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style="animation-delay: 150ms" />
          <span class="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>
      </div>

      <div ref="bottomEl" />
    </div>

    <!-- Input bar -->
    <div class="flex-shrink-0 bg-white border-t border-stone-100 px-3 py-3 safe-area-pb">
      <!-- Preview photo sélectionnée -->
      <div v-if="pendingPhoto" class="mb-2 relative inline-block">
        <img :src="pendingPhotoUrl!" class="h-16 w-16 rounded-xl object-cover" />
        <button
          @click="pendingPhoto = null"
          class="absolute -top-1.5 -right-1.5 bg-stone-700 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
        >✕</button>
      </div>

      <div class="flex items-end gap-2">
        <!-- Attach photo -->
        <label class="flex-shrink-0 w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer hover:bg-stone-200 transition-colors">
          <span class="text-base">📷</span>
          <input type="file" accept="image/*" capture="user" class="hidden" @change="handlePhotoSelect" />
        </label>

        <!-- Voice -->
        <button
          @click="toggleRecord"
          class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          :class="recording ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'"
        >
          <span class="text-base">🎙</span>
        </button>

        <!-- Text input -->
        <textarea
          v-model="inputText"
          :placeholder="recording ? `Enregistrement... ${elapsed}s` : 'Écrire au Skin Guru...'"
          :disabled="recording || chatStore.sending"
          rows="1"
          class="flex-1 bg-stone-100 rounded-2xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-skin-200 max-h-28 disabled:opacity-50"
          @keydown.enter.exact.prevent="sendText"
          @input="autoResize"
        />

        <!-- Send -->
        <button
          @click="pendingPhoto ? sendPhoto() : sendText()"
          :disabled="chatStore.sending || (!inputText.trim() && !pendingPhoto)"
          class="flex-shrink-0 w-9 h-9 rounded-full bg-skin-700 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
        >
          <span class="text-sm">→</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import { apiFetch } from '@/composables/useApi'

const chatStore = useChatStore()
const quotaExhausted = ref(false)
const scrollEl = ref<HTMLElement>()
const bottomEl = ref<HTMLElement>()
const inputText = ref('')
const pendingPhoto = ref<File | null>(null)
const pendingPhotoUrl = ref<string | null>(null)
const recording = ref(false)
const elapsed = ref(0)
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let timer: ReturnType<typeof setInterval> | null = null

function scrollToBottom() {
  nextTick(() => bottomEl.value?.scrollIntoView({ behavior: 'smooth' }))
}

watch(() => chatStore.messages.length, scrollToBottom)
watch(() => chatStore.sending, scrollToBottom)

function handlePhotoSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingPhoto.value = file
  pendingPhotoUrl.value = URL.createObjectURL(file)
}

async function sendPhoto() {
  if (!pendingPhoto.value || chatStore.sending) return
  const file = pendingPhoto.value
  pendingPhoto.value = null
  pendingPhotoUrl.value = null
  await chatStore.sendMessage({ type: 'photo', file })
}

async function sendText() {
  const text = inputText.value.trim()
  if (!text || chatStore.sending) return
  inputText.value = ''
  await chatStore.sendMessage({ type: 'text', text })
}

async function toggleRecord() {
  if (recording.value) {
    mediaRecorder?.stop()
    recording.value = false
    if (timer) clearInterval(timer)
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data)
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
      await chatStore.sendMessage({ type: 'audio', file })
    }
    mediaRecorder.start()
    recording.value = true
    elapsed.value = 0
    timer = setInterval(() => elapsed.value++, 1000)
  } catch {
    alert('Micro non disponible')
  }
}

function handleButtonClick(value: string) {
  chatStore.sendMessage({ type: 'button', buttonValue: value })
}

function isButtonsAnswered(idx: number) {
  const msg = chatStore.messages[idx]
  if (msg.type !== 'buttons') return false
  return chatStore.messages.slice(idx + 1).some(m => m.role === 'user')
}

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 112)}px`
}

onMounted(async () => {
  const [_, health] = await Promise.all([
    chatStore.loadHistory(),
    apiFetch('/api/chat/health').then(r => r.json()).catch(() => ({ ok: true })),
  ])
  quotaExhausted.value = !(health as { ok: boolean }).ok
  scrollToBottom()
})
</script>
