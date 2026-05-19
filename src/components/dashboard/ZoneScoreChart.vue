<template>
  <div class="bg-white rounded-3xl p-4 border border-stone-100">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Scores par zone (moy.)</p>
    <Bar :data="chartData" :options="options" class="max-h-48" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  Tooltip, type ChartData, type ChartOptions
} from 'chart.js'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps<{
  zoneAverages: Record<string, number>
}>()

const ZONE_LABELS: Record<string, string> = {
  front: 'Front', nose: 'Nez', left_cheek: 'J.G', right_cheek: 'J.D',
  chin: 'Menton', mouth: 'Bouche', eyes: 'Yeux', neck: 'Cou', jaw: 'Mâch.'
}

const chartData = computed<ChartData<'bar'>>(() => {
  const entries = Object.entries(props.zoneAverages)
  return {
    labels: entries.map(([k]) => ZONE_LABELS[k] ?? k),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([, v]) => v >= 8 ? '#bbf7d0' : v >= 6 ? '#fef08a' : '#fca5a5'),
      borderColor: entries.map(([, v]) => v >= 8 ? '#16a34a' : v >= 6 ? '#ca8a04' : '#dc2626'),
      borderWidth: 1,
      borderRadius: 6,
    }],
  }
})

const options: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { min: 0, max: 10, ticks: { stepSize: 2, font: { size: 10 } }, grid: { color: '#f5f5f4' } },
    x: { ticks: { font: { size: 9 } }, grid: { display: false } },
  },
}
</script>
