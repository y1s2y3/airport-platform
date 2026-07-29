const PARSED_HAZARD_SAMPLES = [
  {
    hazardType: 'safety',
    description: '塔吊作业区警戒标识不足，临边防护缺失',
    hazardLevel: '较大',
    rectifier: '',
    hazardDeadline: '',
    acceptor: '',
  },
  {
    hazardType: 'quality',
    description: '钢筋绑扎间距偏差，保护层厚度不足',
    hazardLevel: '一般',
    rectifier: '',
    hazardDeadline: '',
    acceptor: '',
  },
  {
    hazardType: 'safety',
    description: '材料堆放占用消防通道，文明施工不到位',
    hazardLevel: '一般',
    rectifier: '',
    hazardDeadline: '',
    acceptor: '',
  },
]

/** 仅允许 .doc / .docx */
export function isSupervisionWordFileName(fileName = '') {
  return /\.(doc|docx)$/i.test(String(fileName || '').trim())
}

/** 监理例会纪要：支持 Word / PDF */
export function isSupervisionMinutesFileName(fileName = '') {
  return /\.(doc|docx|pdf)$/i.test(String(fileName || '').trim())
}

export function isSupervisionPdfFileName(fileName = '') {
  return /\.pdf$/i.test(String(fileName || '').trim())
}

/**
 * 模拟解析监理例会纪要 Word 附件，提取会议字段与隐患清单。
 * 正式环境可替换为服务端 OCR / 文档解析接口。
 *
 * 兜底约定（与需求文档一致）：
 * - 上传格式支持 doc/docx/pdf；自动解析目前仅 Word
 * - 解析失败返回 failed，前端须提示并允许手动录入隐患
 * - 解析成功字段（含整改人、整改期限）允许人工修正
 *
 * Mock 触发失败：文件名含「失败」「fail」「error」（便于联调）
 */
export function parseSupervisionMeetingMinutes(fileName, projectName = '') {
  const name = String(fileName || '').trim()
  if (isSupervisionPdfFileName(name)) {
    return {
      parseStatus: 'pending',
      parsedAt: '',
      pmAttendees: '',
      directorAttendees: '',
      hazards: [],
      parseError: '',
      summary: '已上传 PDF 纪要。当前演示环境仅对 Word 自动解析隐患，可手动补录本周隐患。',
    }
  }
  if (!isSupervisionWordFileName(name)) {
    return {
      parseStatus: 'failed',
      parsedAt: '',
      pmAttendees: '',
      directorAttendees: '',
      hazards: [],
      parseError: '仅支持上传 .doc / .docx / .pdf 格式的监理例会纪要',
      summary: '',
    }
  }

  const base = name.replace(/\.(doc|docx)$/i, '')
  const forceFail = /失败|fail|error/i.test(base)
  if (forceFail) {
    return {
      parseStatus: 'failed',
      parsedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      pmAttendees: '',
      directorAttendees: '',
      hazards: [],
      parseError:
        '纪要解析失败：无法识别模版字段或文档已损坏。请重新上传符合模版的 Word，或手动录入隐患清单后保存。',
      summary: '',
    }
  }

  const seed = base.length + String(projectName).length
  const pmAttendees = '张某（项目经理）、李某（项目负责人）'
  const directorAttendees = seed % 2 === 0 ? '王某（项目部长）' : '赵某（项目副部长）'

  const hazardCount = 1 + (seed % 2)
  const hazards = Array.from({ length: hazardCount }, (_, index) => {
    const sample = PARSED_HAZARD_SAMPLES[(seed + index) % PARSED_HAZARD_SAMPLES.length]
    return {
      ...sample,
      remark: '',
      rectifier: '',
      hazardDeadline: '',
      acceptor: '',
      source: '监理解析',
      rectifyStatus: '待整改',
    }
  })

  return {
    parseStatus: 'success',
    parsedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    pmAttendees,
    directorAttendees,
    hazards,
    parseError: '',
    summary: `已从「${fileName}」解析 ${hazards.length} 条隐患记录（默认待整改，可在监理隐患清单中确认关闭）`,
  }
}
