import { Chart, registerables } from 'chart.js'
import { createCanvas } from 'canvas'
import { glassLineConfig, radarConfig, barConfig } from '../utils/chart-configs'
import { savePhoto, getPhotoUrl } from './photos'

Chart.register(...registerables)

export async function renderChart(config: object, width = 800, height = 400): Promise<Buffer> {
  const canvas = createCanvas(width, height)
  // @ts-expect-error — canvas n'est pas exactement HTMLCanvasElement mais compatible Chart.js
  const chart = new Chart(canvas, config)
  const buffer = canvas.toBuffer('image/png')
  chart.destroy()
  return buffer
}

export async function generateGlassLineImage(data: {
  labels: string[]
  scores: number[]
}): Promise<string> {
  const buffer = await renderChart(glassLineConfig(data))
  const path = await savePhoto(buffer, 'png')
  return getPhotoUrl(path, 600)   // URL valide 10 min
}

export async function generateRadarImage(data: {
  current: number[]
  previous: number[]
}): Promise<string> {
  const buffer = await renderChart(radarConfig(data), 600, 600)
  const path = await savePhoto(buffer, 'png')
  return getPhotoUrl(path, 600)
}

export async function generateBarImage(data: Parameters<typeof barConfig>[0]): Promise<string> {
  const buffer = await renderChart(barConfig(data))
  const path = await savePhoto(buffer, 'png')
  return getPhotoUrl(path, 600)
}

export async function generateChartForWhatsApp(params: {
  type: 'glass' | 'rosacea' | 'protein' | 'dimension'
  labels: string[]
  values: number[]
  values2?: number[]
  goal?: number
  label: string
}): Promise<string> {
  let url: string

  if (params.type === 'glass') {
    url = await generateGlassLineImage({ labels: params.labels, scores: params.values })
  } else if (params.type === 'rosacea' || params.type === 'dimension') {
    url = await generateGlassLineImage({ labels: params.labels, scores: params.values })
  } else {
    url = await generateBarImage({
      labels: params.labels,
      values: params.values,
      goal: params.goal,
      label: params.label,
    })
  }

  return url
}
