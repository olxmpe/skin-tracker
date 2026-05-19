import { barConfig } from '../utils/chart-configs'

// Canvas removed — server-side chart generation not available.
// Charts are rendered client-side via Chart.js in the browser.

export async function renderChart(_config: object, _width = 800, _height = 400): Promise<Buffer> {
  return Buffer.alloc(0)
}

export async function generateGlassLineImage(_data: { labels: string[]; scores: number[] }): Promise<string> {
  return ''
}

export async function generateRadarImage(_data: { current: number[]; previous: number[] }): Promise<string> {
  return ''
}

export async function generateBarImage(_data: Parameters<typeof barConfig>[0]): Promise<string> {
  return ''
}

export async function generateChartForWhatsApp(_params: {
  type: 'glass' | 'rosacea' | 'protein' | 'dimension'
  labels: string[]
  values: number[]
  values2?: number[]
  goal?: number
  label: string
}): Promise<string> {
  return ''
}
