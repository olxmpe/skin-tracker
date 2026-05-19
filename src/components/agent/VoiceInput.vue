<template>
  <div class="space-y-3">
    <div v-if="transcript" class="bg-stone-50 rounded-2xl p-4 text-sm text-stone-700 leading-relaxed">
      {{ transcript }}
      <button @click="clear" class="ml-2 text-stone-400 text-xs underline">Effacer</button>
    </div>

    <div class="flex flex-col gap-2 max-w-xs mx-auto">
      <button
        v-if="!recording"
        @click="startRecording"
        class="btn-primary flex items-center justify-center gap-2 py-4 text-base"
      >
        <span>🎙</span> {{ transcript ? 'Réenregistrer' : 'Vocal' }}
      </button>
      <button
        v-else
        @click="stopRecording"
        class="flex items-center justify-center gap-2 py-4 text-base rounded-2xl bg-red-500 text-white font-semibold animate-pulse"
      >
        <span>⏹</span> Arrêter ({{ elapsed }}s)
      </button>

      <label class="btn-secondary flex items-center justify-center gap-2 py-3 cursor-pointer text-sm">
        <span>📝</span> Écrire à la place
        <input type="text" class="hidden" />
      </label>
    </div>

    <div v-if="textMode" class="max-w-xs mx-auto">
      <textarea
        v-model="manualText"
        placeholder="Dis-moi comment tu vas, ce que tu as mangé, dormi, ressenti..."
        class="w-full rounded-2xl border border-stone-200 p-3 text-sm resize-none h-28 focus:outline-none focus:ring-2 focus:ring-skin-300"
        @input="$emit('update:modelValue', manualText)"
      />
    </div>

    <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const recording = ref(false)
const transcript = ref(props.modelValue ?? '')
const error = ref<string | null>(null)
const textMode = ref(false)
const manualText = ref('')
const elapsed = ref(0)

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []
let timer: ReturnType<typeof setInterval> | null = null

async function startRecording() {
  error.value = null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    chunks = []
    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      transcribeBlob(blob)
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.start()
    recording.value = true
    elapsed.value = 0
    timer = setInterval(() => elapsed.value++, 1000)
  } catch {
    error.value = 'Micro non disponible.'
  }
}

function stopRecording() {
  mediaRecorder?.stop()
  recording.value = false
  if (timer) clearInterval(timer)
}

async function transcribeBlob(blob: Blob) {
  const formData = new FormData()
  formData.append('audio', blob, 'voice.webm')
  try {
    const res = await fetch('/api/checkin/transcribe', { method: 'POST', body: formData })
    const { text } = await res.json() as { text: string }
    transcript.value = text
    emit('update:modelValue', text)
  } catch {
    error.value = 'Transcription échouée. Essaie de noter à la place.'
    textMode.value = true
  }
}

function clear() {
  transcript.value = ''
  emit('update:modelValue', null)
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
  mediaRecorder?.stop()
})
</script>
