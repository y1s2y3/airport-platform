import heroImg from '../assets/hero.png'

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i
const PDF_EXT_RE = /\.pdf(\?|$)/i

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function demoDocumentPreviewDataUrl(title = '附件预览') {
  const t = escapeHtml(title)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${t}</title>
  <style>
    body{margin:0;padding:32px;font-family:"Microsoft YaHei",sans-serif;color:#303133;background:#f5f7fa}
    .card{max-width:880px;margin:0 auto;background:#fff;border:1px solid #ebeef5;border-radius:12px;padding:28px 32px;box-shadow:0 8px 24px rgba(0,0,0,.04)}
    .brand{color:#91003d;font-size:13px;letter-spacing:.08em;margin-bottom:8px}
    h1{margin:0 0 16px;font-size:22px}
    p{line-height:1.8;margin:0 0 10px;color:#303133}
    .foot{margin-top:24px;color:#909399;font-size:12px}
  </style></head><body><div class="card">
    <div class="brand">智慧工程建设管控一体化平台</div>
    <h1>${t}</h1>
    <p>本页为原型演示附件预览内容，正式环境将展示实际上传文件。</p>
    <div class="foot">演示数据 · 仅供预览展示</div>
  </div></body></html>`
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

/** 识别附件预览类型 */
export function detectAttachmentKind(fileName = '', url = '') {
  const name = String(fileName || '')
  const src = String(url || '')
  if (src.startsWith('data:text/html')) return 'html'
  if (IMAGE_EXT_RE.test(name) || src.startsWith('data:image/') || IMAGE_EXT_RE.test(src)) return 'image'
  if (PDF_EXT_RE.test(name) || src.startsWith('data:application/pdf') || PDF_EXT_RE.test(src)) return 'pdf'
  if (/\.(docx?|xlsx?|pptx?)(\?|$)/i.test(name)) return 'other'
  return 'other'
}

/** 解析可用于预览/下载的地址；无真实 url 时按文件名生成演示内容 */
export function resolveAttachmentPreviewUrl(fileName = '', url = '') {
  const src = String(url || '').trim()
  if (src) return src

  const name = String(fileName || '').trim()
  if (!name) return ''

  if (IMAGE_EXT_RE.test(name)) return heroImg
  if (PDF_EXT_RE.test(name) || /\.(docx?|xlsx?|pptx?)(\?|$)/i.test(name)) {
    return demoDocumentPreviewDataUrl(name)
  }
  return demoDocumentPreviewDataUrl(name)
}

/** 触发浏览器下载（或打开新窗口） */
export function triggerAttachmentDownload(fileName = '', url = '') {
  const name = String(fileName || '').trim() || '附件'
  const src = resolveAttachmentPreviewUrl(name, url)
  if (!src) return false

  const link = document.createElement('a')
  link.href = src
  link.download = name
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return true
}
