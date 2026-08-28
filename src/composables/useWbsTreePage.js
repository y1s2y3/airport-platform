import { computed, nextTick, ref, watch } from 'vue'
import { useQmProjectScope } from './useCurrentProject'

export function filterWbsTreeNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

export function flattenTreeKeys(nodes, acc = []) {
  nodes.forEach((n) => {
    acc.push(n.id)
    if (n.children?.length) flattenTreeKeys(n.children, acc)
  })
  return acc
}

/**
 * WBS 树表页通用 scope + 选中 + 筛选逻辑。
 * @param {{ resolveSelectedExists?: (key: string) => boolean, getDefaultSelectedKey?: () => string }} options
 */
export function useWbsTreePage(options = {}) {
  const { resolveSelectedExists, getDefaultSelectedKey } = options
  const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
  const keyword = ref('')
  const treeRef = ref(null)
  const selectedKey = ref('')

  const canMaintain = computed(() => !isHqSelected.value && !!scopeProjectId.value)

  watch(keyword, (val) => {
    treeRef.value?.filter(val.trim())
  })

  async function syncTreeHighlight() {
    await nextTick()
    if (selectedKey.value) treeRef.value?.setCurrentKey(selectedKey.value)
  }

  function syncSelectionFromTree(treeData) {
    if (!canMaintain.value) {
      selectedKey.value = ''
      return
    }
    const exists = resolveSelectedExists
      ? resolveSelectedExists(selectedKey.value)
      : flattenTreeKeys(treeData).includes(selectedKey.value)
    if (!exists) {
      selectedKey.value = getDefaultSelectedKey?.() || flattenTreeKeys(treeData)[0] || ''
    }
  }

  async function setSelectedKey(key) {
    selectedKey.value = key
    await syncTreeHighlight()
  }

  function handleNodeClick(data) {
    selectedKey.value = data.id
  }

  return {
    isHqSelected,
    scopeProjectId,
    scopeProjectLabel,
    keyword,
    treeRef,
    selectedKey,
    canMaintain,
    filterWbsTreeNode,
    syncSelectionFromTree,
    syncTreeHighlight,
    setSelectedKey,
    handleNodeClick,
    flattenTreeKeys,
  }
}
