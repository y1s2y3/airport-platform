const TEMPLATE_PATH = 'templates/监理例会纪要模板.docx'
const TEMPLATE_FILENAME = '监理例会纪要模板.docx'

/** 下载监理例会纪要 Word 模版 */
export function downloadSupervisionMeetingMinutesTemplate() {
  const base = import.meta.env.BASE_URL || '/'
  const url = `${base}${TEMPLATE_PATH}`.replace(/\/+/g, '/').replace(':/', '://')

  const link = document.createElement('a')
  link.href = url
  link.download = TEMPLATE_FILENAME
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
