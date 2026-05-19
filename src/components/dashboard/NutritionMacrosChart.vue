<template>
  <div class="bg-white rounded-3xl p-4 border border-stone-100">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Macros (7j)</p>
    <div v-if="hasData">
      <Bar :data="chartData" :options="options" class="max-h-40" />
      <div class="flex justify-around mt-3 text-center">
        <div v-for="macro in macroSummary" :key="macro.key">
          <p class="text-[10px] text-stone-400">{{ macro.label }}</p>
          <p class="text-sm font-bold" :style="{ color: macro.color }">{{ macro.avg }}g</p>
        </div>
      </div>
    </div>
    <p v-else class="text-center text-stone-400 text-sm py-6">Pas encore de données nutrition</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, type ChartData, type ChartOptions
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{
  logs: { date: string; proteinG: number | null; carbsG: number | null; fatG: number | null }[]
}>()

const last7 = computed(() => {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  }).map(date => {
    const log = props.logs.find(l => l.date === date)
    return { date, protein: log?.proteinG ?? null, carbs: log?.carbsG ?? null, fat: log?.fatG ?? null }
  })
})

const hasData = computed(() => last7.value.some(d => d.protein !== null))

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: last7.value.map(d => {
    const [, m, day] = d.date.split('-')
    return `${parseInt(day)}/${parseInt(m)}`
  }),
  datasets: [
    { label: 'Protéines', data: last7.value.map(d => d.protein), backgroundColor: '#86efac', borderRadius: 4 },
    { label: 'Glucides', data: last7.value.map(d => d.carbs), backgroundColor: '#93c5fd', borderRadius: 4 },
    { label: 'Lipides', data: last7.value.map(d => d.fat), backgroundColor: '#fcd34d', borderRadius: 4 },
  ],
}))

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, boxWidth: 10 } } },
  scales: {
    x: { stacked: false, ticks: { font: { size: 9 } }, grid: { display: false } },
    y: { ticks: { font: { size: 10 } }, grid: { color: '#f5f5f4' } },
  },
}

function avg(arr: (number | null)[]) {
  const vals = arr.filter((v): v is number => v !== null)
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

const macroSummary = computed(() => [
  { key: 'protein', label: 'Protéines', avg: avg(last7.value.map(d => d.protein)), color: '#16a34a' },
  { key: 'carbs', label: 'Glucides', avg: avg(last7.value.map(d => d.carbs)), color: '#2563eb' },
  { key: 'fat', label: 'Lipides', avg: avg(last7.value.map(d => d.fat)), color: '#d97706' },
])
</script>
