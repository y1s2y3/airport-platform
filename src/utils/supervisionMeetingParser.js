/** 仅允许 .doc / .docx */
export function isSupervisionWordFileName(fileName = '') {
  return /\.(doc|docx)$/i.test(String(fileName || '').trim())
}

/** 监理例会纪要：支持 Word / PDF（仅附件上传，不再自动解析） */
export function isSupervisionMinutesFileName(fileName = '') {
  return /\.(doc|docx|pdf)$/i.test(String(fileName || '').trim())
}

export function isSupervisionPdfFileName(fileName = '') {
  return /\.pdf$/i.test(String(fileName || '').trim())
}
