<template>
  <div class="bg-white rounded-3xl p-4 border border-stone-100">
    <p class="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Dimensions (moyenne 30j)</p>
    <Radar :data="chartData" :options="options" class="max-h-56" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, type ChartData, type ChartOptions
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps<{
  dimensions: {
    acne: (number | null)[]
    hydration: (number | null)[]
    radiance: (number | null)[]
    texture: (number | null)[]
    firmness: (number | null)[]
    evenness: (number | null)[]
    fine_lines: (number | null)[]
    barrier: (number | null)[]
  }
}>()

function avg(arr: (number | null)[]) {
  const vals = arr.filter((v): v is number => v !== null)
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0
}

const chartData = computed<ChartData<'radar'>>(() => ({
  labels: ['Acné', 'Hydratation', 'Éclat', 'Texture', 'Fermeté', 'Uniformité', 'Rides', 'Barrière'],
  datasets: [{
    data: [
      avg(props.dimensions.acne),
      avg(props.dimensions.hydration),
      avg(props.dimensions.radiance),
      avg(props.dimensions.texture),
      avg(props.dimensions.firmness),
      avg(props.dimensions.evenness),
      avg(props.dimensions.fine_lines),
      avg(props.dimensions.barrier),
    ],
    backgroundColor: 'rgba(156,123,90,0.15)',
    borderColor: '#9c7b5a',
    borderWidth: 2,
    pointBackgroundColor: '#9c7b5a',
    pointRadius: 3,
  }],
}))

const options: ChartOptions<'radar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    r: {
      min: 0, max: 10,
      ticks: { stepSize: 2, font: { size: 9 }, backdropColor: 'transparent' },
      pointLabels: { font: { size: 9 } },
      grid: { color: '#f5f5f4' },
    },
  },
}
</script>
