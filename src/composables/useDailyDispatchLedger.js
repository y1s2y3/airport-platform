import { onScopeDispose, ref, shallowRef } from 'vue'

/** Only the latest read may publish results, errors or loading state. */
export function useDailyDispatchLedger(repository) {
  const summaries = shallowRef([]), loading = ref(false), error = ref('')
  let sequence = 0, disposed = false
  async function load() {
    if (disposed) return
    const current = ++sequence
    loading.value = true
    try {
      const rows = await repository.listLedgerSummaries()
      if (current === sequence) { summaries.value = rows; error.value = '' }
    } catch (failure) {
      if (current === sequence) error.value = failure?.message || '检查记录加载失败，请点击刷新重试'
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  onScopeDispose(() => { disposed = true; sequence++ })
  return { summaries, loading, error, load }
}
