import { ref } from 'vue'
import { maskIdCard } from '../utils/mask.js'

/**
 * 列表行证件号脱敏 / 查看明文
 * @param {{ getRaw?: (row: object) => string, onReveal?: (row: object) => void }} [options]
 */
export function useIdCardReveal(options = {}) {
  const { getRaw, onReveal } = options
  const visibleIds = ref(new Set())

  function isVisible(rowId) {
    return visibleIds.value.has(rowId)
  }

  function display(row) {
    const raw = getRaw ? getRaw(row) : row.id_card_raw || row.id_card || row.id_number_raw || row.id_number
    return isVisible(row.id) ? raw : maskIdCard(raw)
  }

  function reveal(row) {
    visibleIds.value = new Set([...visibleIds.value, row.id])
    onReveal?.(row)
  }

  function reset() {
    visibleIds.value = new Set()
  }

  return { isVisible, display, reveal, reset }
}
