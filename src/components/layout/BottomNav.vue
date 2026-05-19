<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 safe-area-pb z-50">
    <div class="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
        :class="[$route.path === item.to ? 'text-skin-700' : 'text-stone-400']"
      >
        <span class="text-xl leading-none">{{ item.icon }}</span>
        <span class="text-[10px] font-medium">{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const $route = useRoute()

const items = [
  { to: '/chat', icon: '✦', label: 'Chat' },
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/timeline', icon: '▦', label: 'Calendrier' },
  { to: '/products', icon: '◉', label: 'Produits' },
  { to: '/settings', icon: '◎', label: 'Profil' },
]
</script>
