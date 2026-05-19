<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8">

      <!-- Header mois -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-xs text-stone-400 uppercase tracking-widest">Historique</p>
          <h1 class="text-2xl font-bold text-stone-800 capitalize">{{ monthLabel }}</h1>
        </div>
        <div class="flex gap-1">
          <button @click="prevMonth" class="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">‹</button>
          <button @click="nextMonth" class="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">›</button>
        </div>
      </div>

      <!-- Grille calendrier -->
      <div class="bg-white rounded-3xl border border-stone-100 p-4 mb-4">
        <!-- Jours de la semaine -->
        <div class="grid grid-cols-7 mb-2">
          <div v-for="d in weekDays" :key="d" class="text-center text-[11px] font-medium text-stone-400 py-1">{{ d }}</div>
        </div>

        <!-- Jours du mois -->
        <div class="grid grid-cols-7 gap-y-1">
          <div v-for="(cell, i) in calendarCells" :key="i" class="flex flex-col items-center py-1">
            <button
              v-if="cell.day"
              @click="cell.entry ? selectDate(cell) : null"
              class="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all relative"
              :class="[
                cell.isToday ? 'bg-skin-700 text-white font-semibold' : '',
                cell.isSelected && !cell.isToday ? 'bg-skin-100 text-skin-800 font-semibold' : '',
                !cell.isToday && !cell.isSelected ? 'text-stone-700 hover:bg-stone-100' : '',
                cell.entry ? 'cursor-pointer' : 'cursor-default',
              ]"
            >
              {{ cell.day }}
            </button>
            <span v-if="cell.day" class="mt-0.5 w-1.5 h-1.5 rounded-full" :class="cell.entry ? dotColor(cell.entry) : 'invisible'" />
          </div>
        </div>
      </div>

      <!-- Carte de détail -->
      <Transition name="slide-up">
        <div v-if="selectedCell?.entry" class="bg-white rounded-3xl border border-stone-100 overflow-hidden">
          <div class="flex gap-4 p-4">
            <!-- Photo -->
            <div class="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
              <img
                v-if="selectedCell.entry.photoUrl"
                :src="resolvedPhotoUrl(selectedCell.entry.photoUrl)"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl text-stone-300">📷</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold text-stone-800">{{ formatSelectedDate }}</p>
                  <div class="flex gap-1 mt-1">
                    <span v-if="selectedCell.entry.analysis?.vsYesterday === 'amélioration'" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">↑ Amélio</span>
                    <span v-if="selectedCell.entry.analysis?.vsYesterday === 'dégradation'" class="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700">↓ Dégrad</span>
                  </div>
                </div>
                <div v-if="selectedCell.entry.analysis" class="text-right">
                  <p class="text-2xl font-bold text-skin-700 leading-none">
                    {{ selectedCell.entry.analysis.glassSkinScore?.toFixed(1) ?? '–' }}
                  </p>
                  <p class="text-[9px] text-stone-400 mt-0.5">glass skin</p>
                </div>
              </div>

              <p v-if="selectedCell.entry.analysis?.summary" class="text-xs text-stone-500 mt-2 italic leading-relaxed line-clamp-3">
                "{{ selectedCell.entry.analysis.summary }}"
              </p>
            </div>
          </div>

          <!-- Routine -->
          <div v-if="selectedCell.entry.analysis?.routineForTonight?.length" class="border-t border-stone-50 px-4 py-3">
            <p class="text-[10px] font-medium text-stone-400 uppercase tracking-widest mb-2">Routine du soir</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="item in selectedCell.entry.analysis.routineForTonight"
                :key="item"
                class="text-xs px-2.5 py-1 rounded-full bg-skin-50 text-skin-800 border border-skin-100"
              >{{ item }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- État vide -->
      <div v-if="!loading && entries.length === 0" class="text-center py-12 text-stone-400 text-sm">
        Aucun check-in ce mois-ci.
      </div>
      <div v-if="loading" class="text-center py-12 text-stone-400 text-sm">Chargement…</div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { apiFetch, apiUrl } from '@/composables/useApi'

interface CalendarEntry {
  id: number
  date: string
  photoUrl: string | null
  analysis: {
    glassSkinScore: number | null
    summary: string | null
    vsYesterday: string | null
    routineForTonight: string[]
    rosaceaScore: number | null
  } | null
}

interface CalendarCell {
  day: number | null
  date: string
  entry: CalendarEntry | null
  isToday: boolean
  isSelected: boolean
}

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const entries = ref<CalendarEntry[]>([])
const loading = ref(false)
const selectedCell = ref<CalendarCell | null>(null)

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const monthLabel = computed(() => {
  return new Date(currentYear.value, currentMonth.value - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const entryByDate = computed(() => {
  const map: Record<string, CalendarEntry> = {}
  for (const e of entries.value) map[e.date] = e
  return map
})

const calendarCells = computed((): CalendarCell[] => {
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const todayStr = today.toISOString().slice(0, 10)

  // 0=dimanche → on veut lundi=0
  let startDow = firstDay.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1

  const cells: CalendarCell[] = []
  for (let i = 0; i < startDow; i++) cells.push({ day: null, date: '', entry: null, isToday: false, isSelected: false })

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      date: dateStr,
      entry: entryByDate.value[dateStr] ?? null,
      isToday: dateStr === todayStr,
      isSelected: selectedCell.value?.date === dateStr,
    })
  }

  return cells
})

const formatSelectedDate = computed(() => {
  if (!selectedCell.value?.date) return ''
  const d = new Date(selectedCell.value.date)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
})

function dotColor(entry: CalendarEntry) {
  const score = entry.analysis?.glassSkinScore
  if (score === null || score === undefined) return 'bg-stone-300'
  if (score >= 7) return 'bg-emerald-400'
  if (score >= 5) return 'bg-amber-400'
  return 'bg-red-400'
}

function resolvedPhotoUrl(url: string | null) {
  if (!url) return ''
  return url.startsWith('/api/') ? apiUrl(url) : url
}

function selectDate(cell: CalendarCell) {
  if (selectedCell.value?.date === cell.date) {
    selectedCell.value = null
  } else {
    selectedCell.value = { ...cell, isSelected: true }
  }
}

function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
  selectedCell.value = null
}

function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
  selectedCell.value = null
}

async function fetchMonth() {
  loading.value = true
  try {
    const res = await apiFetch(`/api/entries/calendar?year=${currentYear.value}&month=${currentMonth.value}`)
    entries.value = await res.json() as CalendarEntry[]
  } finally {
    loading.value = false
  }
}

watch([currentYear, currentMonth], fetchMonth)
onMounted(fetchMonth)
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(12px); }
</style>
