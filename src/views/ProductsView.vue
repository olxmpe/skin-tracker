<template>
  <div class="min-h-screen bg-stone-50 pb-20">
    <div class="max-w-lg mx-auto px-4 pt-8">

      <div class="flex items-start justify-between mb-6">
        <div>
          <p class="text-xs text-stone-400 uppercase tracking-widest">Ma routine</p>
          <h1 class="text-2xl font-bold text-stone-800">Produits</h1>
        </div>
        <button @click="showForm = true" class="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
          <span>+</span> Ajouter
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12 text-stone-400 text-sm">Chargement…</div>

      <!-- Sections active / inactive -->
      <template v-if="!loading">
        <template v-for="section in ['active', 'inactive']" :key="section">
          <div v-if="grouped[section].length" class="mb-6">
            <p class="text-xs text-stone-400 uppercase tracking-widest mb-3 px-1">
              {{ section === 'active' ? 'En cours d\'utilisation' : 'Archivés' }}
            </p>
            <div class="space-y-2">
              <ProductCard
                v-for="p in grouped[section]"
                :key="p.id"
                :product="p"
                @toggle="toggleActive(p)"
                @delete="deleteProduct(p.id)"
              />
            </div>
          </div>
        </template>

        <div v-if="products.length === 0" class="text-center py-12 text-stone-400 text-sm">
          Aucun produit ajouté. Commencez par ajouter votre routine.
        </div>
      </template>

    </div>
  </div>

  <!-- Modal ajout produit -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showForm" class="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" @click.self="showForm = false">
        <div class="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10 overflow-y-auto max-h-[90dvh]">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-stone-800">Nouveau produit</h2>
            <button @click="showForm = false" class="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
          </div>

          <form @submit.prevent="submitProduct" class="space-y-4">
            <div>
              <label class="text-xs font-medium text-stone-500 uppercase tracking-widest">Nom *</label>
              <input v-model="form.name" required placeholder="ex: Crème hydratante"
                class="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-skin-300" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-stone-500 uppercase tracking-widest">Marque</label>
                <input v-model="form.brand" placeholder="ex: La Roche-Posay"
                  class="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-skin-300" />
              </div>
              <div>
                <label class="text-xs font-medium text-stone-500 uppercase tracking-widest">Catégorie</label>
                <select v-model="form.category"
                  class="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-skin-300 bg-white">
                  <option value="">—</option>
                  <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-medium text-stone-500 uppercase tracking-widest">Liste INCI</label>
              <p class="text-[11px] text-stone-400 mt-0.5 mb-1">Collez la liste d'ingrédients telle qu'elle figure sur l'emballage.</p>
              <textarea v-model="form.inciRaw" rows="4" placeholder="Aqua, Glycerin, Niacinamide..."
                class="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-skin-300" />
              <p class="text-[11px] text-stone-400 mt-1">L'IA analysera automatiquement chaque ingrédient.</p>
            </div>

            <div>
              <label class="text-xs font-medium text-stone-500 uppercase tracking-widest">Notes personnelles</label>
              <textarea v-model="form.notes" rows="2" placeholder="Texture, ressenti, fréquence d'utilisation..."
                class="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-skin-300" />
            </div>

            <div v-if="submitError" class="text-red-500 text-xs">{{ submitError }}</div>

            <button type="submit" :disabled="submitting"
              class="btn-primary w-full py-3 text-sm disabled:opacity-50">
              {{ submitting ? 'Analyse INCI en cours…' : 'Enregistrer' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { apiFetch } from '@/composables/useApi'
import type { Product } from '@/types'
import ProductCard from '@/components/products/ProductCard.vue'

const products = ref<Product[]>([])
const loading = ref(false)
const showForm = ref(false)
const submitting = ref(false)
const submitError = ref('')

const form = ref({ name: '', brand: '', category: '', inciRaw: '', notes: '' })

const categories = [
  { value: 'cleanser', label: 'Nettoyant' },
  { value: 'toner', label: 'Lotion' },
  { value: 'serum', label: 'Sérum' },
  { value: 'moisturizer', label: 'Hydratant' },
  { value: 'spf', label: 'SPF' },
  { value: 'mask', label: 'Masque' },
  { value: 'exfoliant', label: 'Exfoliant' },
  { value: 'eye', label: 'Contour yeux' },
  { value: 'oil', label: 'Huile' },
  { value: 'other', label: 'Autre' },
]

const grouped = computed(() => ({
  active: products.value.filter(p => p.isActive),
  inactive: products.value.filter(p => !p.isActive),
}))

async function fetchProducts() {
  loading.value = true
  try {
    const res = await apiFetch('/api/products')
    products.value = await res.json() as Product[]
  } finally {
    loading.value = false
  }
}

async function toggleActive(p: Product) {
  await apiFetch(`/api/products/${p.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: !p.isActive }),
  })
  p.isActive = !p.isActive
}

async function deleteProduct(id: number) {
  if (!confirm('Supprimer ce produit ?')) return
  await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
  products.value = products.value.filter(p => p.id !== id)
}

async function submitProduct() {
  if (!form.value.name.trim()) return
  submitting.value = true
  submitError.value = ''
  try {
    const res = await apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    if (!res.ok) throw new Error('Erreur serveur')
    const created = await res.json() as Product
    products.value.unshift(created)
    form.value = { name: '', brand: '', category: '', inciRaw: '', notes: '' }
    showForm.value = false
  } catch {
    submitError.value = 'Une erreur est survenue. Réessayez.'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchProducts)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
