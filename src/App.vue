<template>
  <div class="min-h-screen bg-stone-50">
    <RouterView />
    <BottomNav />
  </div>
</template>

<script setup lang="ts">
import BottomNav from '@/components/layout/BottomNav.vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAnalysisStore } from '@/stores/analysis'

const analysisStore = useAnalysisStore()

useWebSocket((evt) => {
  if (evt.event === 'analysis:updated') {
    analysisStore.fetchToday()
  }
})
</script>
