import { ref, onUnmounted } from 'vue'

type WSEvent = { event: string; data: unknown; ts: number }

export function useWebSocket(onMessage: (evt: WSEvent) => void) {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws.value = new WebSocket(`${protocol}//${location.host}/ws`)

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
