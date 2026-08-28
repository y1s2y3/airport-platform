<script setup>
/**
 * 施工部位管理 — 按实体工程结构树展示
 * 仅分项可挂接施工部位（施工部分）；单位/分部等上级可查询下级已挂部位
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import { ensureWbsScaffold, wbsNodes } from '../../mock/qm.js'
import {
  buildLocationManageEntityTree,
  getLocationById,
  listItemNodes,
  listLocations,
  listLocationsUnderWbs,
  removeLocation,
  resolveLocationPathLabel,
  upsertLocation,
  getLocationDepth,
  MAX_LOCATION_DEPTH,
} from '../../mock/constructionLocation.js'

const TYPE_LABEL = {
  1: '单位工程',
  2: '子单位工程',
  3: '分部工程',
  4: '子分部工程',
  5: '分项工程',
  9: '实体工程',
  loc: '施工部位',
}

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const treeRef = ref(null)
const selectedKey = ref('')
const visible = ref(false)

const form = reactive({
  id: '',
  project_id: '',
  wbs_node_id: '',
  parent_id: '',
  name: '',
  code: '',
  sort_no: 0,
  status: 1,
})

const canMaintain = computed(() => !isHqSelected.value && !!scopeProjectId.value)

const treeData = computed(() => {
  if (!canMaintain.value) return []
  ensureWbsScaffold(scopeProjectId.value)
  return buildLocationManageEntityTree(scopeProjectId.value)
})

/** 解析左侧选中：wbs | loc */
const selectedMeta = computed(() => {
  if (!selectedKey.value) return null
  const loc = getLocationById(selectedKey.value)
  if (loc) {
    return {
      kind: 'loc',
      wbs_node_id: loc.wbs_node_id,
      node: loc,
      canAttach: true,
    }
  }
  const wbs = wbsNodes.find((n) => n.id === selectedKey.value)
  if (!wbs) return null
  const isItem = wbs.node_type === 5
  return {
    kind: 'wbs',
    wbs_node_id: wbs.id,
    node: wbs,
    node_type: wbs.node_type,
    canAttach: isItem,
  }
})

/** 仅分项或其下部位可增删挂接 */
const canAttach = computed(() => !!selectedMeta.value?.canAttach)

const tableRows = computed(() => {
  if (!canMaintain.value || !selectedMeta.value) return []
  const pid = scopeProjectId.value
  const meta = selectedMeta.value

  if (meta.kind === 'loc') {
    return listLocations(pid, meta.wbs_node_id).filter((r) => r.parent_id === meta.node.id)
  }

  if (meta.node_type === 5) {
    // 分项：仅展示直接挂在分项下的根部位
    return listLocations(pid, meta.wbs_node_id).filter((r) => !r.parent_id)
  }

  // 上级实体节点：查询子孙分项下全部部位（含多级）
  return listLocationsUnderWbs(pid, meta.wbs_node_id)
})

/** 上级查询模式：只读列表 */
const isQueryMode = computed(() => {
  const meta = selectedMeta.value
  return !!meta && meta.kind === 'wbs' && meta.node_type !== 5
})

const itemOptions = computed(() => listItemNodes(scopeProjectId.value))

const parentLocOptions = computed(() => {
  if (!form.wbs_node_id) return []
  return listLocations(scopeProjectId.value, form.wbs_node_id).filter((r) => r.id !== form.id)
})

watch(
  () => [canMaintain.value, scopeProjectId.value, treeData.value],
  async () => {
    if (!canMaintain.value) {
      selectedKey.value = ''
      return
    }
    const flat = flattenKeys(treeData.value)
    if (!flat.includes(selectedKey.value)) {
      selectedKey.value = flat[0] || ''
    }
    await nextTick()
    if (selectedKey.value) treeRef.value?.setCurrentKey(selectedKey.value)
  },
  { immediate: true },
)

watch(keyword, (val) => {
  treeRef.value?.filter(val.trim())
})

function flattenKeys(nodes, acc = []) {
  nodes.forEach((n) => {
    acc.push(n.id)
    if (n.children?.length) flattenKeys(n.children, acc)
  })
  return acc
}

function filterTreeNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

function handleNodeClick(data) {
  selectedKey.value = data.id
}

function openCreateSibling() {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  if (!canAttach.value) {
    return ElMessage.warning('仅分项工程可挂接施工部位，请先选择分项或其下部位')
  }
  const meta = selectedMeta.value
  form.id = ''
  form.project_id = scopeProjectId.value
  form.wbs_node_id = meta.wbs_node_id
  form.parent_id = meta.kind === 'loc' ? meta.node.parent_id || '' : ''
  form.name = ''
  form.code = ''
  form.sort_no = 0
  form.status = 1
  visible.value = true
}

/** 行内「新增子节点」：以当前行 id 为 parent_id，归属分项不变；最多三级 */
function openCreateChild(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  if (getLocationDepth(row.id) >= MAX_LOCATION_DEPTH) {
    return ElMessage.warning('同一分项下施工部位最多支持三级，无法继续新增下级')
  }
  form.id = ''
  form.project_id = scopeProjectId.value
  form.wbs_node_id = row.wbs_node_id
  form.parent_id = row.id
  form.name = ''
  form.code = ''
  form.sort_no = 0
  form.status = 1
  visible.value = true
}

function canAddChild(row) {
  return getLocationDepth(row.id) < MAX_LOCATION_DEPTH
}

function openEdit(row) {
  Object.assign(form, {
    id: row.id,
    project_id: row.project_id,
    wbs_node_id: row.wbs_node_id,
    parent_id: row.parent_id || '',
    name: row.name,
    code: row.code || '',
    sort_no: row.sort_no || 0,
    status: row.status === 0 ? 0 : 1,
  })
  visible.value = true
}

function submit() {
  const r = upsertLocation({ ...form }, form.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(form.id ? '部位已更新' : '部位已创建')
  visible.value = false
}

async function onRemove(row) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？`, '删除部位', { type: 'warning' })
    const r = removeLocation(row.id)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已删除')
    if (selectedKey.value === row.id) {
      selectedKey.value = row.wbs_node_id
    }
  } catch {
    /* cancel */
  }
}

function itemName(row) {
  return wbsNodes.find((n) => n.id === row.wbs_node_id)?.node_name || '—'
}

function summaryText() {
  const meta = selectedMeta.value
  if (!meta) return ''
  if (meta.kind === 'loc') {
    return `当前部位：${meta.node.name}`
  }
  const type = TYPE_LABEL[meta.node_type] || '节点'
  const name = meta.node_type === 9 ? '实体工程' : meta.node.node_name
  return `当前${type}：${name}`
}

function tagType(data) {
  if (data.node_type === 'loc' || data.is_loc) return 'success'
  if (data.node_type === 5) return 'primary'
  return 'info'
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 施工部位管理</div>
      <h1 class="page-title">施工部位管理</h1>
      <p class="page-tip">
        按实体工程结构树浏览；仅<strong>分项工程</strong>可挂接施工部位（施工部分），上级节点可查询下级已挂部位。当前项目：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="!canMaintain"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目，再维护本项目的施工部位"
      class="mb"
    />

    <div v-else class="layout">
      <aside class="tree-panel">
        <div class="panel-title">实体工程结构</div>
        <el-input v-model="keyword" clearable placeholder="筛选名称" style="margin-bottom: 12px" aria-label="筛选名称"/>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :current-node-key="selectedKey"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterTreeNode"
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <el-tag size="small" :type="tagType(data)" effect="plain">
                {{ data.type_label }}
              </el-tag>
              <span>{{ data.label }}</span>
            </span>
          </template>
        </el-tree>
      </aside>

      <section class="table-panel">
        <div class="toolbar">
          <div v-if="selectedMeta" class="node-summary">
            <span>{{ summaryText() }}</span>
            <el-tag v-if="isQueryMode" size="small" type="warning" effect="plain" class="mode-tag">
              查询下级部位
            </el-tag>
            <el-tag v-else-if="canAttach" size="small" type="success" effect="plain" class="mode-tag">
              可挂接维护
            </el-tag>
            <span v-if="selectedMeta.kind === 'loc'" class="muted">
              （归属分项 {{ itemName({ wbs_node_id: selectedMeta.wbs_node_id }) }}）
            </span>
          </div>
          <div class="btns">
            <el-button type="primary" size="small" :disabled="!canAttach" @click="openCreateSibling">
              新增同级部位
            </el-button>
          </div>
        </div>

        <el-alert
          v-if="isQueryMode"
          type="info"
          :closable="false"
          show-icon
          class="mb"
          title="当前为非分项节点：仅可查询下级分项已挂接的施工部位。请选中分项后再新增挂接。"
        />

        <el-empty
          v-if="!itemOptions.length"
          description="请先在「实体工程分解」或验评目录树维护分项"
        />
        <el-table v-else :data="tableRows" stripe border>
          <el-table-column v-if="isQueryMode" label="归属分项" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ itemName(row) }}</template>
          </el-table-column>
          <el-table-column prop="name" label="部位名称" min-width="140" />
          <el-table-column label="完整路径" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ resolveLocationPathLabel(row.id) }}</template>
          </el-table-column>
          <el-table-column prop="code" label="编码" width="120" />
          <el-table-column prop="sort_no" label="排序" width="70" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <template v-if="!isQueryMode">
                <el-button
                  v-if="canAddChild(row)"
                  link
                  type="primary"
                  @click="openCreateChild(row)"
                >
                  新增子节点
                </el-button>
                <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" @click="onRemove(row)">删除</el-button>
              </template>
              <el-button
                v-else
                link
                type="primary"
                @click="selectedKey = row.wbs_node_id"
              >
                定位分项
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑施工部位' : '新增施工部位'" width="520px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item label="归属分项" required>
          <el-select v-model="form.wbs_node_id" filterable style="width: 100%" :disabled="!!form.id">
            <el-option
              v-for="n in itemOptions"
              :key="n.id"
              :label="n.node_name"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="上级部位">
          <el-select v-model="form.parent_id" clearable filterable style="width: 100%" placeholder="空=挂在分项下" aria-label="空=挂在分项下">
            <el-option
              v-for="n in parentLocOptions"
              :key="n.id"
              :label="n.name"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部位名称" required>
          <el-input v-model="form.name" maxlength="80" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.code" maxlength="40" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_no" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.mb { margin-bottom: 8px; }
.layout { display: flex; gap: 16px; min-height: 520px; flex: 1; }
.tree-panel {
  width: 340px;
  flex-shrink: 0;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  overflow: auto;
}
.panel-title { font-weight: 600; margin-bottom: 8px; }
.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
.toolbar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
.node-summary { font-size: 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.mode-tag { margin-left: 0; }
.muted { color: #909399; font-size: 13px; }
.btns { display: flex; gap: 8px; }
.tree-node { display: inline-flex; align-items: center; gap: 6px; }
</style>
