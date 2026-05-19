<template>
  <div class="space-y-3">
    <!-- Preview photo capturée -->
    <div v-if="modelValue" class="relative">
      <img :src="previewUrl" class="w-full rounded-2xl object-cover aspect-square max-w-xs mx-auto block shadow-md" />
      <button
        @click="$emit('update:modelValue', null)"
        class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm"
      >✕</button>
    </div>

    <!-- Zone capture -->
    <div v-else>
      <div v-if="showCamera" class="relative">
        <video ref="videoEl" autoplay playsinline class="w-full rounded-2xl aspect-square object-cover max-w-xs mx-auto block" />
        <button
          @click="captureFromCamera"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl"
        >📸</button>
      </div>

      <div v-else class="flex flex-col gap-2 max-w-xs mx-auto">
        <button
          @click="openCamera"
          class="btn-primary flex items-center justify-center gap-2 py-4 text-base"
        >
          <span>📷</span> Photo du jour
        </button>
        <label class="btn-secondary flex items-center justify-center gap-2 py-3 cursor-pointer">
          <span>🖼</span> Choisir une photo
          <input type="file" accept="image/*" class="hidden" @change="handleFileInput" />
        </label>
      </div>
    </div>

    <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useCamera } from '@/composables/useCamera'

const props = defineProps<{ modelValue: File | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: File | null): void }>()

const videoEl = ref<HTMLVideoElement>()
const showCamera = ref(false)
const { startCamera, capture, stopCamera, error } = useCamera()

const previewUrl = computed(() => props.modelValue ? URL.createObjectURL(props.modelValue) : null)

async function openCamera() {
  showCamera.value = true
  await startCamera(videoEl.value!)
}

async function captureFromCamera() {
  const blob = await capture(videoEl.value!)
  emit('update:modelValue', new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
  showCamera.value = false
}

function handleFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('update:modelValue', file)
}

onUnmounted(() => stopCamera())
</script>
