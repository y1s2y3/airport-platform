/** 重点优先，离线靠后 */
export function compareCamerasDefault(a, b) {
  if (a.key !== b.key) return a.key ? -1 : 1
  if (a.online !== b.online) return a.online ? -1 : 1
  return 0
}

export function buildInitialCameraOrder(cameras) {
  return [...cameras]
    .map((camera, index) => ({ camera, index }))
    .sort((a, b) => {
      const cmp = compareCamerasDefault(a.camera, b.camera)
      return cmp !== 0 ? cmp : a.index - b.index
    })
    .map(({ camera }) => camera.id)
}

export function sortCamerasByOrder(cameras, orderIds = []) {
  if (!orderIds.length) {
    return [...cameras].sort(compareCamerasDefault)
  }
  const rank = new Map(orderIds.map((id, index) => [id, index]))
  return [...cameras].sort((a, b) => {
    const rankA = rank.get(a.id)
    const rankB = rank.get(b.id)
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB
    if (rankA !== undefined) return -1
    if (rankB !== undefined) return 1
    return compareCamerasDefault(a, b)
  })
}

export function mergeCameraOrder(cameras, currentOrder = []) {
  const cameraIds = cameras.map((camera) => camera.id)
  const cameraIdSet = new Set(cameraIds)
  let order = currentOrder.filter((id) => cameraIdSet.has(id))
  const orderedSet = new Set(order)
  const newcomers = cameras.filter((camera) => !orderedSet.has(camera.id))
  if (!order.length) {
    order = buildInitialCameraOrder(cameras)
  } else if (newcomers.length) {
    order = [...order, ...buildInitialCameraOrder(newcomers)]
  }
  return order
}

/** @param {'before'|'after'|'inner'|'prev'|'next'} dropType */
export function reorderCameraIds(orderIds, dragId, dropId, dropType) {
  const ids = [...orderIds]
  const fromIndex = ids.indexOf(dragId)
  const toIndex = ids.indexOf(dropId)
  if (fromIndex === -1 || toIndex === -1 || dragId === dropId) return ids

  ids.splice(fromIndex, 1)
  let insertIndex = ids.indexOf(dropId)
  if (insertIndex === -1) return orderIds

  const placeAfter = dropType === 'after' || dropType === 'next'
  if (placeAfter) insertIndex += 1
  ids.splice(insertIndex, 0, dragId)
  return ids
}

/** 按可见列表中的插入位置重排（支持重点视频筛选） */
export function reorderVisibleItems(orderIds, visibleIds, dragId, insertIndex) {
  const visibleSet = new Set(visibleIds)
  const visible = orderIds.filter((id) => visibleSet.has(id))
  const from = visible.indexOf(dragId)
  if (from === -1) return orderIds

  visible.splice(from, 1)
  let slot = Math.max(0, Math.min(insertIndex, visible.length))
  if (from < slot) slot -= 1
  visible.splice(slot, 0, dragId)

  let cursor = 0
  return orderIds.map((id) => (visibleSet.has(id) ? visible[cursor++] : id))
}
