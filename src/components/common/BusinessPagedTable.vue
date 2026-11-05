<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, useAttrs } from 'vue'
import { useClientPagination, sortTableRows } from '../../composables/useClientPagination.js'
defineOptions({ inheritAttrs: false })
const props = defineProps({ data: { type: Array, default: () => [] }, maxHeight: { type: [Number, String], default: null } })
const emit = defineEmits(['sort-change'])
const attrs = useAttrs(), table = ref(null), frame = ref(null), footer = ref(null), availableHeight = ref(360), sort = ref(attrs.defaultSort || attrs['default-sort'] || null)
const ordered = computed(() => sortTableRows(props.data, sort.value))
const tableMaxHeight = computed(() => {
  const limit = Number(props.maxHeight)
  return limit > 0 ? Math.min(limit, availableHeight.value) : props.maxHeight || availableHeight.value
})
const { page, pageSize, total, rows } = useClientPagination(ordered)
// Reset on real source replacement/filtering; row edits retain the current valid page.
const methods = ['clearSelection', 'toggleRowSelection', 'toggleAllSelection', 'getSelectionRows', 'setCurrentRow', 'clearSort', 'clearFilter', 'doLayout', 'sort', 'scrollTo', 'setScrollTop', 'setScrollLeft', 'toggleRowExpansion']
defineExpose({
  ...Object.fromEntries(methods.map(name => [name, (...args) => table.value?.[name]?.(...args)])),
  getPagination: () => {
    const wrap = table.value?.$el.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
    return { page: page.value, pageSize: pageSize.value, scroll: { left: wrap?.scrollLeft || 0, top: wrap?.scrollTop || 0 } }
  },
  async restorePagination(value) {
    if (!value) return
    pageSize.value = [10, 20, 50].includes(value.pageSize) ? value.pageSize : 10
    const last = Math.max(1, Math.ceil(total.value / pageSize.value))
    page.value = Math.max(1, Math.min(Number.isInteger(value.page) ? value.page : 1, last))
    await nextTick()
    table.value?.setScrollLeft(value.scroll?.left || 0)
    table.value?.setScrollTop(value.scroll?.top || 0)
  },
})
let observer, animation
function measure() {
  if (!frame.value) return
  const value = Math.max(160, Math.floor(window.innerHeight - Math.max(0, frame.value.getBoundingClientRect().top) - (footer.value?.offsetHeight || 44) - 24))
  if (availableHeight.value !== value) availableHeight.value = value
}
function scheduleMeasure() { cancelAnimationFrame(animation); animation = requestAnimationFrame(measure) }
function changeSort(value) { sort.value = value; page.value = 1; emit('sort-change', value) }
onMounted(() => { measure(); observer = new ResizeObserver(scheduleMeasure); observer.observe(frame.value); observer.observe(footer.value); window.addEventListener('resize', scheduleMeasure); window.addEventListener('scroll', scheduleMeasure, true) })
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(animation); window.removeEventListener('resize', scheduleMeasure); window.removeEventListener('scroll', scheduleMeasure, true) })
</script>
<template>
  <div ref="frame" class="business-paged-table">
    <el-table ref="table" v-bind="$attrs" :data="rows" :max-height="tableMaxHeight" @sort-change="changeSort">
      <template v-for="(_, name) in $slots" #[name]="slotProps"><slot :name="name" v-bind="slotProps || {}" /></template>
    </el-table>
    <div ref="footer" class="business-table-pagination"><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" :pager-count="5" layout="total, sizes, prev, pager, next, jumper" /></div>
  </div>
</template>
<style scoped>
.business-paged-table { display: flex; flex-direction: column; width: 100%; min-width: 0; }
.business-table-pagination { flex: 0 0 auto; display: flex; justify-content: flex-end; padding-top: 12px; min-width: 0; max-width: 100%; overflow-x: auto; }
.business-table-pagination :deep(.el-pagination) { flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; row-gap: 8px; max-width: 100%; padding-bottom: 2px; }
.business-table-pagination :deep(.el-pagination__sizes .el-select) { width: 128px; min-width: 0; }
</style>
