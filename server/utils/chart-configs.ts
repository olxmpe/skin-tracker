// Configs Chart.js partagées frontend (vue-chartjs) et serveur (node-canvas)

export const SKIN_DIMENSIONS = [
  'acne_score', 'hydration_score', 'radiance_score', 'texture_score',
  'firmness_score', 'evenness_score', 'fine_lines_score', 'barrier_score',
] as const

export const DIMENSION_LABELS: Record<string, string> = {
  acne_score: 'Acné',
  hydration_score: 'Hydratation',
  radiance_score: 'Éclat',
  texture_score: 'Texture',
  firmness_score: 'Fermeté',
  evenness_score: 'Uniformité',
  fine_lines_score: 'Rides',
  barrier_score: 'Barrière',
  rosacea_score: 'Rosacée',
  glass_skin_score: 'Glass Skin',
}

const COLORS = {
  primary: '#bfa094',
  primaryLight: 'rgba(191,160,148,0.2)',
  accent: '#977669',
  danger: '#ef4444',
  success: '#22c55e',
  text: '#1f2937',
  grid: 'rgba(0,0,0,0.06)',
}

export function glassLineConfig(data: { labels: string[]; scores: number[] }) {
  return {
    type: 'line' as const,
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Glass Skin Score',
        data: data.scores,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: COLORS.accent,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 10, grid: { color: COLORS.grid } },
        x: { grid: { display: false } },
      },
    },
  }
}

export function radarConfig(data: { current: number[]; previous: number[] }) {
  return {
    type: 'radar' as const,
    data: {
      labels: SKIN_DIMENSIONS.map(d => DIMENSION_LABELS[d]),
      datasets: [
        {
          label: 'Aujourd\'hui',
          data: data.current,
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryLight,
          borderWidth: 2,
          pointBackgroundColor: COLORS.primary,
        },
        {
          label: 'J-30',
          data: data.previous,
          borderColor: COLORS.accent,
          backgroundColor: 'rgba(151,118,105,0.1)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointBackgroundColor: COLORS.accent,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: { stepSize: 2, font: { size: 10 } },
          grid: { color: COLORS.grid },
          pointLabels: { font: { size: 11 } },
        },
      },
    },
  }
}

export function barConfig(data: {
  labels: string[]
  values: number[]
  goal?: number
  label: string
  color?: string
}) {
  return {
    type: 'bar' as const,
    data: {
      labels: data.labels,
      datasets: [
        {
          label: data.label,
          data: data.values,
          backgroundColor: data.color ?? COLORS.primaryLight,
          borderColor: data.color ?? COLORS.primary,
          borderWidth: 1.5,
          borderRadius: 4,
        },
        ...(data.goal ? [{
          label: 'Objectif',
          data: data.labels.map(() => data.goal),
          type: 'line' as const,
          borderColor: COLORS.danger,
          borderWidth: 1.5,
          borderDash: [6, 3],
          pointRadius: 0,
        }] : []),
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' as const } },
      scales: {
        y: { min: 0, grid: { color: COLORS.grid } },
        x: { grid: { display: false } },
      },
    },
  }
}
