import { ref, onUnmounted } from 'vue'

type WSEvent = { event: string; data: unknown; ts: number }

export function useWebSocket(onMessage: (evt: WSEvent) => void) {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect() {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined
    let wsUrl: string

    if (apiUrl) {
      wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws'
    } else {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${location.host}/ws`
    }

    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => { connected.value = true }
    ws.value.onclose = () => {
      connected.value = false
      setTimeout(connect, 3000)
    }
    ws.value.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data as string) as WSEvent) } catch { /* ignore */ }
    }
  }

  connect()
  onUnmounted(() => ws.value?.close())

  return { connected }
}
