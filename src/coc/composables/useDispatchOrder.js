import { ref, computed, watch } from 'vue'
import {
  mergeCameraOrder,
  reorderVisibleItems,
  sortCamerasByOrder,
} from '../utils/cameraOrder.js'

export function useDispatchOrder(devicesRef) {
  const dispatchOrder = ref([])

  watch(
    devicesRef,
    (devices) => {
      dispatchOrder.value = mergeCameraOrder(devices || [], dispatchOrder.value)
    },
    { immediate: true, deep: true },
  )

  const orderedDevices = computed(() =>
    sortCamerasByOrder(devicesRef.value || [], dispatchOrder.value),
  )

  function handleDispatchReorder(payload) {
    const base = dispatchOrder.value.length
      ? dispatchOrder.value
      : (devicesRef.value || []).map((device) => device.id)

    if (payload.insertIndex !== undefined && payload.visibleIds) {
      dispatchOrder.value = reorderVisibleItems(
        base,
        payload.visibleIds,
        payload.dragId,
        payload.insertIndex,
      )
    }
  }

  return {
    dispatchOrder,
    orderedDevices,
    handleDispatchReorder,
  }
}
