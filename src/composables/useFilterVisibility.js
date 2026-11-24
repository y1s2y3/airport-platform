import { reactive, watch } from 'vue'

/**
 * 筛选条件显示设置：按页面持久化到 localStorage。
 * @param {string} storageKey 页面唯一键
 * @param {Array<{key:string,label:string}>} fields 可配置的筛选项
 */
export function useFilterVisibility(storageKey, fields) {
  const defaults = Object.fromEntries(fields.map((f) => [f.key, true]))
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}
  } catch { saved = {} }
  const visible = reactive({ ...defaults })
  for (const field of fields) {
    if (typeof saved[field.key] === 'boolean') visible[field.key] = saved[field.key]
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ ...visible })) } catch { /* 忽略存储失败 */ }
  }
  watch(visible, persist, { deep: true })

  function isVisible(key) {
    return visible[key] !== false
  }

  /** 关闭某项时清理其取值，避免隐藏条件仍在过滤。 */
  function clearHidden(form, defaultsMap = {}) {
    for (const field of fields) {
      if (!isVisible(field.key) && form && field.key in form) {
        form[field.key] = defaultsMap[field.key] !== undefined ? defaultsMap[field.key] : ''
      }
    }
  }

  return { visible, isVisible, clearHidden }
}
