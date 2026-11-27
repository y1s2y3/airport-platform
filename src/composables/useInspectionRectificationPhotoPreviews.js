import { onScopeDispose, ref } from 'vue'
import { previewRectificationPhotos, releaseRectificationPhotoPreview } from '../utils/inspectionRectificationPhotos'

export function useInspectionRectificationPhotoPreviews() {
  const loading = ref(false)
  let previews = []
  let request = 0

  function clear() {
    request++
    previews.forEach(releaseRectificationPhotoPreview)
    previews = []
    loading.value = false
  }

  async function load(photos) {
    clear()
    const current = request
    loading.value = true
    try {
      const next = await previewRectificationPhotos(photos)
      if (current !== request) {
        next.forEach(releaseRectificationPhotoPreview)
        return null
      }
      previews = next
      return next
    } finally {
      if (current === request) loading.value = false
    }
  }

  onScopeDispose(clear)
  return { clear, load, loading }
}
