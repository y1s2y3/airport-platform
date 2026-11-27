const PHOTO_STORE = 'photos'
let openingDatabase

function openPhotoDatabase() {
  if (!openingDatabase) {
    openingDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open('airport-inspection-rectification-photos', 1)
      request.onupgradeneeded = () => request.result.createObjectStore(PHOTO_STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch(error => {
      openingDatabase = undefined
      throw error
    })
  }
  return openingDatabase
}

async function updatePhotoFiles(update) {
  const db = await openPhotoDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error)
    update(transaction.objectStore(PHOTO_STORE))
  })
}

export async function readRectificationPhoto(photo) {
  if (!photo?.storageKey) return null
  const db = await openPhotoDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction(PHOTO_STORE).objectStore(PHOTO_STORE).get(photo.storageKey)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function storeRectificationPhotos(photos) {
  const files = new Map()
  const references = await Promise.all(photos.map(async (photo, index) => {
    const url = typeof photo === 'string' ? photo : photo?.url
    const isLocalImage = /^(blob:|data:image\/)/.test(url || '')
    const name = (typeof photo === 'string' ? (isLocalImage ? '' : photo) : photo?.name)
      || '整改照片' + (index + 1) + '.jpg'
    if (photo?.storageKey) return { name, storageKey: photo.storageKey }
    if (!isLocalImage) return { name }
    const response = await fetch(url)
    if (!response.ok) throw new Error('整改照片读取失败')
    const blob = await response.blob()
    if (!blob.size) throw new Error('整改照片读取失败')
    const storageKey = crypto.randomUUID()
    files.set(storageKey, blob)
    return { name, storageKey }
  }))
  if (files.size) await updatePhotoFiles(store => {
    for (const [key, blob] of files) store.put(blob, key)
  })
  return {
    references,
    discard: () => files.size ? updatePhotoFiles(store => {
      for (const key of files.keys()) store.delete(key)
    }) : Promise.resolve(),
  }
}

export async function previewRectificationPhotos(photos) {
  const files = await Promise.all(photos.map(async photo => {
    if (typeof photo === 'string') {
      return /^(blob:|data:image\/)/.test(photo) ? { name: '整改照片', url: photo } : { name: photo }
    }
    if (!photo?.storageKey) return { ...photo }
    const blob = await readRectificationPhoto(photo).catch(() => null)
    return { ...photo, blob }
  }))
  return files.map(({ blob, ...photo }) => {
    if (!blob) return photo
    return { ...photo, url: URL.createObjectURL(blob) }
  })
}

export function releaseRectificationPhotoPreview(photo) {
  if (photo?.storageKey && photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url)
}
