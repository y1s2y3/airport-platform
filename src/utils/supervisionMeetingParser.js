/** 仅允许 .doc / .docx */
export function isSupervisionWordFileName(fileName = '') {
  return /\.(doc|docx)$/i.test(String(fileName || '').trim())
}

/** 监理例会纪要：按系统附件 file 档位 */
export function isSupervisionMinutesFileName(fileName = '') {
  return /\.(pdf|jpe?g|png|docx?|xlsx?|pptx?)$/i.test(String(fileName || '').trim())
}

export function isSupervisionPdfFileName(fileName = '') {
  return /\.pdf$/i.test(String(fileName || '').trim())
}
