import { computed, ref, unref, watch } from 'vue'
export function useClientPagination(source) {
  const page = ref(1), pageSize = ref(10)
  const total = computed(() => unref(source)?.length || 0)
  const lastPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  watch(source, () => { page.value = 1 }, { flush: 'sync' })
  watch(pageSize, () => { page.value = 1 }, { flush: 'sync' })
  watch(lastPage, last => { page.value = Math.min(page.value, last) }, { flush: 'sync' })
  const rows = computed(() => (unref(source) || []).slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
  return { page, pageSize, total, rows }
}
export function sortTableRows(rows, sort) {
  if (!sort?.order || !sort.prop || sort.column?.sortable === 'custom') return rows
  const direction = sort.order === 'descending' ? -1 : 1
  const pathValue = (row, key) => typeof key === 'function' ? key(row) : String(key).split('.').reduce((value, part) => value?.[part], row)
  const keys = [].concat(sort.column?.sortBy || sort.prop)
  return rows.map((row, index) => ({ row, index })).sort((a, b) => {
    if (sort.column?.sortMethod) return direction * sort.column.sortMethod(a.row, b.row) || a.index - b.index
    for (const key of keys) { const x = pathValue(a.row, key), y = pathValue(b.row, key); if (x === y) continue; return direction * (x == null ? -1 : y == null ? 1 : x > y ? 1 : -1) }
    return a.index - b.index
  }).map(item => item.row)
}
