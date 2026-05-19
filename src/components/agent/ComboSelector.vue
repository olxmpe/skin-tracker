<template>
  <div class="space-y-3">
    <div class="flex gap-2 max-w-xs mx-auto">
      <button
        v-for="t in types"
        :key="t.key"
        @click="activeType = t.key"
        class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
        :class="activeType === t.key ? 'bg-skin-700 text-white' : 'bg-stone-100 text-stone-500'"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="max-w-xs mx-auto space-y-2">
      <div
        v-for="combo in filteredCombos"
        :key="combo.id"
        @click="toggle(combo.id)"
        class="flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors"
        :class="selected.includes(combo.id) ? 'border-skin-400 bg-skin-50' : 'border-stone-100 bg-white'"
      >
        <span class="text-lg">{{ activeType === 'routine' ? '🧴' : '🥗' }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-stone-800 truncate">{{ combo.name }}</p>
          <p v-if="combo.description" class="text-xs text-stone-400 truncate">{{ combo.description }}</p>
        </div>
        <span v-if="selected.includes(combo.id)" class="text-skin-600 text-lg">✓</span>
      </div>

      <p v-if="filteredCombos.length === 0" class="text-center text-stone-400 text-sm py-4">
        Aucun combo {{ activeType === 'routine' ? 'routine' : 'repas' }} enregistré.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCombosStore } from '@/stores/combos'

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number[]): void }>()

const combosStore = useCombosStore()
const activeType = ref<'routine' | 'meal'>('routine')
const selected = ref<number[]>([...props.modelValue])

const types = [
  { key: 'routine' as const, label: 'Routine' },
  { key: 'meal' as const, label: 'Repas' },
]

const filteredCombos = computed(() =>
  combosStore.combos.filter(c => c.type === activeType.value)
)

function toggle(id: number) {
  const next = selected.value.includes(id)
    ? selected.value.filter(x => x !== id)
    : [...selected.value, id]
  selected.value = next
  emit('update:modelValue', next)
}
</script>
