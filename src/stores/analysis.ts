import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkinAnalysis, Entry, AnalyticsOverview } from '@/types'
import { apiFetch } from '@/composables/useApi'

export const useAnalysisStore = defineStore('analysis', () => {
  const todayEntry = ref<Entry | null>(null)
  const todayAnalysis = ref<SkinAnalysis | null>(null)
  const isAnalyzing = ref(false)
  const streamBuffer = ref('')
  const overview = ref<AnalyticsOverview | null>(null)

  const glassSkinScore = computed(() => todayAnalysis.value?.glassSkinScore ?? null)

  async function fetchToday() {
    const res = await apiFetch('/api/checkin/today')
    const data = await res.json() as { entry: Entry | null; analysis: SkinAnalysis | null }
    todayEntry.value = data.entry
    todayAnalysis.value = data.analysis
      ? {
          ...data.analysis,
          zones: typeof data.analysis.zones === 'string' ? JSON.parse(data.analysis.zones) : data.analysis.zones,
          immediateRecos: typeof data.analysis.immediateRecos === 'string' ? JSON.parse(data.analysis.immediateRecos) : data.analysis.immediateRecos,
          routineForTonight: typeof data.analysis.routineForTonight === 'string' ? JSON.parse(data.analysis.routineForTonight) : data.analysis.routineForTonight,
          lesionsActive: typeof data.analysis.lesionsActive === 'string' ? JSON.parse(data.analysis.lesionsActive) : data.analysis.lesionsActive,
        }
      : null
  }

  async function fetchOverview(period = '30d') {
    const res = await apiFetch(`/api/analytics/overview?period=${period}`)
    overview.value = await res.json() as AnalyticsOverview
  }

  async function submitCheckin(formData: FormData): Promise<void> {
    isAnalyzing.value = true
    streamBuffer.value = ''
    todayAnalysis.value = null

    const res = await apiFetch('/api/checkin', { method: 'POST', body: formData })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const json = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; analysis?: SkinAnalysis; entryId?: number }
        if (json.chunk) streamBuffer.value += json.chunk
        if (json.done && json.analysis) {
          todayAnalysis.value = json.analysis
        }
      }
    }
    isAnalyzing.value = false
  }

  return { todayEntry, todayAnalysis, isAnalyzing, streamBuffer, overview, glassSkinScore, fetchToday, fetchOverview, submitCheckin }
})
