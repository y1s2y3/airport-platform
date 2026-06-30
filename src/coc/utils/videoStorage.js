const SCREENSHOT_KEY = 'coc-admin-screenshots'

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list))
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function seedIfEmpty() {
  if (!readList(SCREENSHOT_KEY).length) {
    writeList(SCREENSHOT_KEY, [
      {
        id: 'ss-seed-1',
        projectName: '捷运线延长段',
        cameraName: '3号塔吊球机',
        cameraLocation: '塔吊作业区',
        description: '塔吊作业区警戒标识不足，临边防护需加强。',
        rectifier: '张工',
        cameraId: 'cam-t3',
        sourceType: 'live',
        createdAt: '2026-06-15 10:22:18',
        snapshot: '',
      },
      {
        id: 'ss-seed-2',
        projectName: '捷运线延长段',
        cameraName: '基坑全景枪机',
        cameraLocation: '基坑区域',
        description: '基坑周边材料堆放不规范，需立即整改。',
        rectifier: '李工',
        cameraId: 'cam-jk',
        sourceType: 'playback',
        createdAt: '2026-06-14 16:05:42',
        snapshot: '',
      },
    ])
  }
}

seedIfEmpty()

export function getScreenshotRecords() {
  return readList(SCREENSHOT_KEY).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function saveScreenshotRecord(payload) {
  const record = {
    id: createId('ss'),
    docType: payload.docType || 'notice',
    projectName: payload.projectName || '',
    cameraName: payload.cameraName || '',
    cameraLocation: payload.cameraLocation || '',
    description: payload.description || '',
    rectifier: payload.rectifier || '',
    amount: payload.amount || '',
    cameraId: payload.cameraId || '',
    sourceType: payload.sourceType || 'live',
    snapshot: payload.snapshot || '',
    createdAt: payload.createdAt || new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  const list = readList(SCREENSHOT_KEY)
  list.unshift(record)
  writeList(SCREENSHOT_KEY, list)
  return record
}

export function removeScreenshotRecord(id) {
  writeList(SCREENSHOT_KEY, readList(SCREENSHOT_KEY).filter((item) => item.id !== id))
}
