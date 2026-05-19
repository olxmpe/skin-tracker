import { ref } from 'vue'

export function useCamera() {
  const stream = ref<MediaStream | null>(null)
  const capturedBlob = ref<Blob | null>(null)
  const capturedUrl = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function startCamera(videoEl: HTMLVideoElement) {
    try {
      stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 } })
      videoEl.srcObject = stream.value
    } catch (e) {
      error.value = 'Caméra non disponible. Utilise l\'upload de fichier.'
    }
  }

  function capture(videoEl: HTMLVideoElement): Promise<Blob> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas')
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight
      canvas.getContext('2d')!.drawImage(videoEl, 0, 0)
      canvas.toBlob(blob => {
        capturedBlob.value = blob!
        capturedUrl.value = URL.createObjectURL(blob!)
        resolve(blob!)
        stopCamera()
      }, 'image/jpeg', 0.9)
    })
  }

  function stopCamera() {
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = null
  }

  function reset() {
    if (capturedUrl.value) URL.revokeObjectURL(capturedUrl.value)
    capturedBlob.value = null
    capturedUrl.value = null
  }

  return { stream, capturedBlob, capturedUrl, error, startCamera, capture, stopCamera, reset }
}
