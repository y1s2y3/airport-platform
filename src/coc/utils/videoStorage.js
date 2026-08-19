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
        docType: 'notice',
        projectName: '捷运线延长段',
        cameraName: '3号塔吊球机',
        cameraLocation: '塔吊作业区',
        workType: '安全',
        workRequirement: '塔吊作业区警戒标识不足，临边防护需加强。',
        executor: '项目经理',
        executeDept: '项目经理',
        deadline: '2026-06-22',
        remark: '',
        description: '塔吊作业区警戒标识不足，临边防护需加强。',
        rectifier: '项目经理',
        cameraId: 'cam-t3',
        sourceType: 'live',
        createdAt: '2026-06-15 10:22:18',
        snapshot: '',
      },
      {
        id: 'ss-seed-2',
        docType: 'safety',
        projectName: '捷运线延长段',
        cameraName: '基坑全景枪机',
        cameraLocation: '基坑区域',
        description: '基坑周边材料堆放不规范，需立即整改。',
        rectifier: '李工',
        hazardLevel: '较大',
        hazardDeadline: '2026-06-21',
        cameraId: 'cam-jk',
        sourceType: 'playback',
        createdAt: '2026-06-14 16:05:42',
        snapshot: '',
      },
      {
        id: 'ss-seed-4',
        docType: 'quality',
        projectName: '三跑道扩建',
        cameraName: '西区球机',
        cameraLocation: '结构施工区',
        description: '混凝土养护时间不足，局部出现干缩裂纹。',
        rectifier: '周质量',
        hazardLevel: '一般',
        hazardDeadline: '2026-06-25',
        cameraId: 'cam-west',
        sourceType: 'live',
        createdAt: '2026-06-15 09:18:06',
        snapshot: '',
      },
      {
        id: 'ss-seed-3',
        docType: 'penalty',
        projectName: '飞行区5号通道',
        cameraName: '通道全景枪机',
        cameraLocation: '车辆通道',
        workType: '安全',
        penaltyReason: '安全',
        penaltyContent: '通道口建材堆放占用消防通道，未设置警示标识。',
        description: '通道口建材堆放占用消防通道，未设置警示标识。',
        cameraId: 'cam-ch5',
        sourceType: 'live',
        createdAt: '2026-06-13 11:08:30',
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
    workType: payload.workType || payload.penaltyReason || '',
    workRequirement: payload.workRequirement || '',
    executor: payload.executor || payload.executeDept || '',
    assignee: payload.assignee || payload.executor || '',
    executeDept: payload.executeDept || payload.executor || '',
    deadline: payload.deadline || '',
    remark: payload.remark || '',
    matterDescription: payload.matterDescription || '',
    penaltyReason: payload.workType || payload.penaltyReason || '',
    penaltyContent: payload.penaltyContent || '',
    hazardLevel: payload.hazardLevel || '',
    hazardDeadline: payload.hazardDeadline || '',
    cameraId: payload.cameraId || '',
    sourceType: payload.sourceType || 'live',
    snapshot: payload.snapshot || '',
    createdAt: payload.createdAt || new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  const list = readList(SCREENSHOT_KEY)
  list.unshift(record)
  writeList(SCREENSHOT_KEY, list)

  if (record.docType === 'safety' || record.docType === 'quality') {
    import('../../utils/dispatchHazardStorage.js')
      .then((mod) => mod.upsertDispatchHazardFromScreenshot(record))
      .catch(() => {})
  }

  return record
}

export function removeScreenshotRecord(id) {
  writeList(SCREENSHOT_KEY, readList(SCREENSHOT_KEY).filter((item) => item.id !== id))
}
