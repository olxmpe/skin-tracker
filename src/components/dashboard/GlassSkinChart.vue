<template>
  <div class="bg-white rounded-3xl p-4 border border-stone-100">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Glass Skin Score</p>
    <Line :data="chartData" :options="options" class="max-h-40" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Tooltip, type ChartData, type ChartOptions
} from 'chart.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const props = defineProps<{
  dates: string[]
  values: (number | null)[]
}>()

const labels = computed(() => props.dates.map(d => {
  const [, m, day] = d.split('-')
  return `${parseInt(day)}/${parseInt(m)}`
}))

const chartData = computed<ChartData<'line'>>(() => ({
  labels: labels.value,
  datasets: [{
    data: props.values,
    borderColor: '#9c7b5a',
    backgroundColor: 'rgba(156,123,90,0.08)',
    borderWidth: 2,
    pointRadius: 3,
    pointBackgroundColor: '#9c7b5a',
    fill: true,
    tension: 0.4,
    spanGaps: true,
  }],
}))

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: {
    label: ctx => ` ${ctx.parsed.y}/10`
  }}},
  scales: {
    y: { min: 0, max: 10, ticks: { stepSize: 2, font: { size: 10 } }, grid: { color: '#f5f5f4' } },
    x: { ticks: { font: { size: 9 }, maxTicksLimit: 7 }, grid: { display: false } },
  },
}
</script>
