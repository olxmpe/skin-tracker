<template>
  <div class="flex gap-2" :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">
    <!-- Avatar -->
    <div v-if="msg.role === 'assistant'" class="w-7 h-7 rounded-full bg-skin-100 flex items-center justify-center text-sm flex-shrink-0 mt-1">
      ✦
    </div>

    <div class="max-w-[78%] space-y-1">
      <!-- Photo -->
      <div v-if="msg.type === 'photo'" class="rounded-2xl overflow-hidden">
        <img :src="msg.content" class="max-w-xs rounded-2xl object-cover" />
      </div>

      <!-- Analyse -->
      <div v-else-if="msg.type === 'analysis'" class="space-y-2">
        <div class="bg-skin-50 rounded-2xl px-4 py-3 text-sm text-skin-900 leading-relaxed border border-skin-100">
          {{ msg.content }}
        </div>
        <AnalysisResult v-if="msg.analysis" :analysis="msg.analysis" />
      </div>

      <!-- Texte normal -->
      <div v-else-if="msg.type === 'text' || msg.type === 'audio'"
        class="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
        :class="msg.role === 'user'
          ? 'bg-skin-700 text-white rounded-tr-sm'
          : 'bg-white text-stone-800 border border-stone-100 rounded-tl-sm'"
      >
        <p class="whitespace-pre-line">{{ msg.content }}</p>
      </div>

      <!-- Boutons de suivi -->
      <div v-if="msg.type === 'buttons' || msg.buttons?.length" class="space-y-1.5">
        <p v-if="msg.type === 'buttons'" class="text-xs text-stone-500 px-1">{{ msg.content }}</p>
        <div class="flex flex-col gap-1.5">
          <button
            v-for="btn in msg.buttons"
            :key="btn"
            @click="$emit('button-click', btn)"
            :disabled="answered"
            class="text-left text-sm px-4 py-2 rounded-xl border border-skin-200 bg-white text-skin-800 transition-colors hover:bg-skin-50 disabled:opacity-50"
          >
            {{ btn }}
          </button>
        </div>
      </div>

      <!-- Timestamp -->
      <p class="text-[10px] text-stone-300 px-1" :class="msg.role === 'user' ? 'text-right' : 'text-left'">
        {{ time }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/stores/chat'
import AnalysisResult from '@/components/agent/AnalysisResult.vue'

const props = defineProps<{ msg: ChatMessage; answered?: boolean }>()
defineEmits<{ (e: 'button-click', value: string): void }>()

const time = computed(() => new Date(props.msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
</script>
