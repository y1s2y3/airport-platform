/**
 * WBS 导入模板（静态文件下载）
 * 需求变更 CR-05：模板固定为《WBS导入模板.xlsx》，随前端静态资源发布，下载即原样输出。
 * 文件位置：public/templates/WBS导入模板.xlsx
 */
export const WBS_IMPORT_TEMPLATE_FILENAME = 'WBS导入模板.xlsx'
export const WBS_IMPORT_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/${WBS_IMPORT_TEMPLATE_FILENAME}`

/** 触发模板下载（浏览器原生下载，不改写文件内容） */
export function downloadWbsImportTemplate() {
  const a = document.createElement('a')
  a.href = WBS_IMPORT_TEMPLATE_URL
  a.download = WBS_IMPORT_TEMPLATE_FILENAME
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
