import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SkinAnalysis } from '@/types'
import { apiFetch } from '@/composables/useApi'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  type: 'text' | 'photo' | 'audio' | 'analysis' | 'buttons'
  content: string
  mediaPath?: string | null
  buttons: string[]
  analysisId?: number | null
  analysis?: SkinAnalysis
  createdAt: string
  pending?: boolean
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const statusText = ref('')

  async function loadHistory() {
    const res = await apiFetch('/api/chat/history')
    messages.value = await res.json() as ChatMessage[]
  }

  function addPending(msg: Partial<ChatMessage>): ChatMessage {
    const m: ChatMessage = {
      id: Date.now(),
      role: msg.role ?? 'user',
      type: msg.type ?? 'text',
      content: msg.content ?? '',
      buttons: msg.buttons ?? [],
      createdAt: new Date().toISOString(),
      pending: true,
      ...msg,
    }
    messages.value.push(m)
    return m
  }

  async function sendMessage(payload: {
    type: 'text' | 'photo' | 'audio' | 'button'
    text?: string
    file?: File
    buttonValue?: string
  }) {
    sending.value = true
    statusText.value = ''

    const fd = new FormData()
    fd.append('type', payload.type)
    if (payload.text) fd.append('text', payload.text)
    if (payload.file) fd.append('file', payload.file)
    if (payload.buttonValue) fd.append('buttonValue', payload.buttonValue)

    // Optimistic user message
    if (payload.type === 'photo') {
      addPending({ role: 'user', type: 'photo', content: payload.file ? URL.createObjectURL(payload.file) : '' })
    } else if (payload.type !== 'button') {
      addPending({ role: 'user', type: 'text', content: payload.text ?? payload.buttonValue ?? '' })
    }

    const res = await apiFetch('/api/chat/message', { method: 'POST', body: fd })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(line.slice(6)) as {
            type: string
            message?: ChatMessage
            text?: string
            analysis?: SkinAnalysis
          }
          if (evt.type === 'status') statusText.value = evt.text ?? ''
          if (evt.type === 'transcript') {
            const last = [...messages.value].reverse().find(m => m.pending && m.role === 'user')
            if (last) last.content = evt.text ?? ''
          }
          if (evt.type === 'message' && evt.message) {
            messages.value.push({ ...evt.message, pending: false })
          }
          if (evt.type === 'error') {
            messages.value.push({
              id: Date.now(), role: 'assistant', type: 'text',
              content: evt.text ?? 'Erreur du Skin Guru. Réessayez.',
              buttons: [], createdAt: new Date().toISOString(), pending: false,
            })
          }
          if (evt.type === 'done') statusText.value = ''
        } catch { /* ignore */ }
      }
    }

    // Mark all pending as settled
    messages.value.forEach(m => { m.pending = false })
    sending.value = false
  }

  async function clearHistory() {
    await apiFetch('/api/chat/clear', { method: 'POST' })
    messages.value = []
  }

  return { messages, sending, statusText, loadHistory, sendMessage, clearHistory }
})
