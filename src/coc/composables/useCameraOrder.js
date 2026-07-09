import { ref, computed, watch } from 'vue'
import {
  mergeCameraOrder,
  reorderCameraIds,
  reorderVisibleItems,
  sortCamerasByOrder,
} from '../utils/cameraOrder.js'

export function useCameraOrder(camerasRef) {
  const cameraOrder = ref([])

  watch(
    camerasRef,
    (cameras) => {
      cameraOrder.value = mergeCameraOrder(cameras || [], cameraOrder.value)
    },
    { immediate: true, deep: true },
  )

  const orderedCameras = computed(() =>
    sortCamerasByOrder(camerasRef.value || [], cameraOrder.value),
  )

  function handleCameraReorder(payload) {
    const base = cameraOrder.value.length
      ? cameraOrder.value
      : (camerasRef.value || []).map((camera) => camera.id)

    if (payload.insertIndex !== undefined && payload.visibleIds) {
      cameraOrder.value = reorderVisibleItems(
        base,
        payload.visibleIds,
        payload.dragId,
        payload.insertIndex,
      )
      return
    }

    cameraOrder.value = reorderCameraIds(base, payload.dragId, payload.dropId, payload.dropType)
  }

  function setCameraAsKey(camera) {
    if (!camera || camera.key) return false

    camera.key = true
    const all = camerasRef.value || []
    const base = cameraOrder.value.length ? [...cameraOrder.value] : all.map((c) => c.id)
    const rest = base.filter((id) => id !== camera.id)
    const insertAt = rest.findIndex((id) => !all.find((c) => c.id === id)?.key)
    if (insertAt === -1) rest.push(camera.id)
    else rest.splice(insertAt, 0, camera.id)
    cameraOrder.value = rest
    return true
  }

  function unsetCameraAsKey(camera) {
    if (!camera?.key) return false
    camera.key = false
    return true
  }

  return {
    cameraOrder,
    orderedCameras,
    handleCameraReorder,
    setCameraAsKey,
    unsetCameraAsKey,
  }
}
