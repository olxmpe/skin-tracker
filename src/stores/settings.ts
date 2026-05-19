import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserProfile } from '@/types'
import { apiFetch } from '@/composables/useApi'

export const useSettingsStore = defineStore('settings', () => {
  const profile = ref<UserProfile | null>(null)

  async function fetchProfile() {
    const res = await apiFetch('/api/profile')
    profile.value = await res.json() as UserProfile | null
  }

  async function saveProfile(data: Partial<UserProfile>) {
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    profile.value = await res.json() as UserProfile
  }

  return { profile, fetchProfile, saveProfile }
})
