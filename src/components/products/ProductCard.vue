<template>
  <div class="bg-white rounded-2xl border border-stone-100 overflow-hidden">
    <div class="flex items-start gap-3 p-4">
      <!-- Icône catégorie -->
      <div class="w-10 h-10 rounded-xl bg-skin-50 flex items-center justify-center text-lg flex-shrink-0">
        {{ categoryIcon }}
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-stone-800 truncate">{{ product.name }}</p>
            <p v-if="product.brand" class="text-xs text-stone-400">{{ product.brand }}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span v-if="product.category" class="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize">
              {{ categoryLabel }}
            </span>
          </div>
        </div>

        <p v-if="product.notes" class="text-xs text-stone-400 mt-1 italic line-clamp-1">{{ product.notes }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="border-t border-stone-50 flex">
      <button
        v-if="product.inciRaw"
        @click="expanded = !expanded"
        class="flex-1 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
      >
        {{ expanded ? '▲ Masquer INCI' : '▼ Voir analyse INCI' }}
      </button>
      <button
        @click="$emit('toggle')"
        class="px-4 py-2 text-xs transition-colors border-l border-stone-50"
        :class="product.isActive ? 'text-stone-400 hover:text-stone-600' : 'text-skin-600 hover:text-skin-800'"
      >
        {{ product.isActive ? 'Archiver' : 'Réactiver' }}
      </button>
      <button
        @click="$emit('delete')"
        class="px-4 py-2 text-xs text-stone-300 hover:text-red-400 transition-colors border-l border-stone-50"
      >
        ✕
      </button>
    </div>

    <!-- Analyse INCI -->
    <div v-if="expanded" class="border-t border-stone-50 p-4">
      <div v-if="loadingIngredients" class="text-xs text-stone-400 text-center py-2">Chargement…</div>
      <div v-else-if="ingredients.length === 0" class="text-xs text-stone-400 italic">Aucune analyse disponible.</div>
      <div v-else class="space-y-2">
        <div
          v-for="ing in ingredients"
          :key="ing.id"
          class="flex items-start gap-3 py-2 border-b border-stone-50 last:border-0"
        >
          <div class="flex-shrink-0 mt-0.5">
            <span
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              :class="riskClass(ing.riskLevel)"
            >{{ ing.riskLevel ?? '?' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-stone-700">{{ ing.name }}</p>
            <p class="text-[10px] text-stone-400 font-mono">{{ ing.inci }}</p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="fn in ing.functions" :key="fn" class="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{{ fn }}</span>
              <span v-if="ing.comedogenic && ing.comedogenic > 1" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Comédogène {{ ing.comedogenic }}</span>
              <span v-if="ing.irritant" class="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">Irritant</span>
              <span v-if="ing.allergen" class="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">Allergène</span>
            </div>
            <div v-if="ing.concerns?.length" class="mt-1">
              <span v-for="c in ing.concerns" :key="c" class="text-[10px] text-red-400 mr-1">⚠ {{ c }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Product, InciIngredient } from '@/types'
import { apiFetch } from '@/composables/useApi'

const props = defineProps<{ product: Product }>()
defineEmits<{ (e: 'toggle'): void; (e: 'delete'): void }>()

const expanded = ref(false)
const loadingIngredients = ref(false)
const ingredients = ref<InciIngredient[]>([])

const categoryIcons: Record<string, string> = {
  cleanser: '🧼', toner: '💧', serum: '✨', moisturizer: '🌿', spf: '☀️',
  mask: '🎭', exfoliant: '🔮', eye: '👁', oil: '🫙', other: '🧴',
}

const categoryLabels: Record<string, string> = {
  cleanser: 'Nettoyant', toner: 'Lotion', serum: 'Sérum', moisturizer: 'Hydratant',
  spf: 'SPF', mask: 'Masque', exfoliant: 'Exfoliant', eye: 'Contour yeux', oil: 'Huile', other: 'Autre',
}

const categoryIcon = computed(() => categoryIcons[props.product.category ?? ''] ?? '🧴')
const categoryLabel = computed(() => categoryLabels[props.product.category ?? ''] ?? props.product.category ?? '')

function riskClass(level: number | null) {
  if (!level) return 'bg-stone-100 text-stone-400'
  if (level <= 2) return 'bg-emerald-100 text-emerald-700'
  if (level <= 3) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

watch(expanded, async (val) => {
  if (!val || ingredients.value.length > 0) return
  loadingIngredients.value = true
  try {
    const res = await apiFetch(`/api/products/${props.product.id}`)
    const data = await res.json() as Product & { ingredients: InciIngredient[] }
    ingredients.value = data.ingredients ?? []
  } finally {
    loadingIngredients.value = false
  }
})
</script>
