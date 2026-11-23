/** Older task records may store task-level inspection photos under `photos`. */
export function getInspectionTaskPhotos(task) {
  if (Array.isArray(task?.normalPhotos) && task.normalPhotos.length) return task.normalPhotos
  return Array.isArray(task?.photos) ? task.photos : []
}
