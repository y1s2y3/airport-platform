<script setup>
/**
 * 实体工程分解 — 与验评实体分支下单位工程→分项（node_type 1～5）同源 wbsNodes
 * 本页禁止维护检验批 / 专项 / 竣工；分类节点本页展示为「实体工程」
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ensureWbsScaffold,
  getEntityRootNode,
  removeWbsNode,
  upsertWbsNode,
  WBS_SYSTEM_NODE_TYPES,
  wbsNodes,
} from '../../mock/qm.js'
import { buildEntityBreakdownTree } from '../../mock/constructionLocation.js'

const ENTITY_TYPES = [1, 2, 3, 4, 5]
const TYPE_LABEL = {
  1: '单位工程',
  2: '子单位工程',
  3: '分部工程',
  4: '子分部工程',
  5: '分项工程',
  9: '实体工程',
}

/** 本页分类节点展示名（验评目录树仍用「实体工程验收」） */
function displayNodeName(row) {
  if (!row) return ''
  if (row.node_type === 9) return '实体工程'
  return row.node_name
}

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const treeRef = ref(null)
const selectedNodeId = ref('')
const visible = ref(false)
const form = reactive({
  id: '',
  project_id: '',
  parent_id: '',
  node_type: 1,
  node_name: '',
  location_code: '',
  specialty: '结构',
  sort_no: 0,
})

const canMaintain = computed(() => !isHqSelected.value && !!scopeProjectId.value)

const treeData = computed(() => {
  if (!canMaintain.value) return []
  ensureWbsScaffold(scopeProjectId.value)
  return buildEntityBreakdownTree(scopeProjectId.value)
})

const selectedNode = computed(() => wbsNodes.find((n) => n.id === selectedNodeId.value) || null)

const directChildren = computed(() => {
  if (!selectedNodeId.value) return []
  return wbsNodes
    .filter(
      (n) =>
        n.parent_id === selectedNodeId.value &&
        ENTITY_TYPES.includes(n.node_type),
    )
    .slice()
    .sort((a, b) => (a.sort_no || 0) - (b.sort_no || 0))
})

const tableRows = computed(() => {
  if (!selectedNode.value) return []
  const selfOk =
    ENTITY_TYPES.includes(selectedNode.value.node_type) || selectedNode.value.node_type === 9
  return selfOk ? [selectedNode.value, ...directChildren.value] : directChildren.value
})

const creatableTypeOptions = computed(() => {
  const parent = wbsNodes.find((n) => n.id === form.parent_id)
  let allow = []
  if (!parent || parent.node_type === 9) allow = [1]
  else if (parent.node_type === 1) allow = [2, 3]
  else if (parent.node_type === 2) allow = [3]
  else if (parent.node_type === 3) allow = [4, 5]
  else if (parent.node_type === 4) allow = [5]
  else allow = []
  return allow.map((t) => ({ value: t, label: TYPE_LABEL[t] }))
})

const parentOptions = computed(() =>
  wbsNodes.filter(
    (n) =>
      n.project_id === form.project_id &&
      (n.node_type === 9 || ENTITY_TYPES.includes(n.node_type)) &&
      n.node_type !== 5 &&
      n.id !== form.id,
  ),
)

function isSystemNode(node) {
  return !!node && WBS_SYSTEM_NODE_TYPES.includes(node.node_type)
}

function pickDefaultNode() {
  ensureWbsScaffold(scopeProjectId.value)
  const root = getEntityRootNode(scopeProjectId.value)
  selectedNodeId.value = root?.id || ''
}

function defaultChildType(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  if (!parent || parent.node_type === 9) return 1
  if (parent.node_type === 1) return 3
  if (parent.node_type === 2) return 3
  if (parent.node_type === 3) return 5
  if (parent.node_type === 4) return 5
  return 5
}

watch(
  () => [canMaintain.value, scopeProjectId.value, treeData.value],
  async () => {
    if (!canMaintain.value) {
      selectedNodeId.value = ''
      return
    }
    const exists = wbsNodes.some((n) => n.id === selectedNodeId.value)
    if (!exists) pickDefaultNode()
    await nextTick()
    if (selectedNodeId.value) treeRef.value?.setCurrentKey(selectedNodeId.value)
  },
  { immediate: true },
)

watch(keyword, (val) => {
  treeRef.value?.filter(val.trim())
})

function filterTreeNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

function handleNodeClick(data) {
  selectedNodeId.value = data.id
}

function openCreate(parent_id = '') {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  const pid = parent_id || selectedNodeId.value || ''
  const parent = wbsNodes.find((n) => n.id === pid)
  if (parent?.node_type === 5) {
    return ElMessage.warning('分项下请至「施工部位管理」维护部位；检验批请在验评目录树维护')
  }
  if (parent && ![1, 2, 3, 4, 9].includes(parent.node_type)) {
    return ElMessage.warning('该节点下不可在本页添加子节点')
  }
  form.id = ''
  form.project_id = scopeProjectId.value
  form.parent_id = pid || getEntityRootNode(scopeProjectId.value)?.id || ''
  form.node_type = defaultChildType(form.parent_id)
  form.node_name = ''
  form.location_code = ''
  form.specialty = '结构'
  form.sort_no = 0
  visible.value = true
}

function openEdit(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  if (row.node_type === 9) {
    Object.assign(form, {
      id: row.id,
      project_id: row.project_id,
      parent_id: row.parent_id || '',
      node_type: 9,
      node_name: '实体工程',
      location_code: row.location_code || '',
      specialty: row.specialty || '',
      sort_no: row.sort_no || 0,
    })
    visible.value = true
    return
  }
  if (!ENTITY_TYPES.includes(row.node_type)) {
    return ElMessage.warning('本页仅维护单位工程至分项')
  }
  Object.assign(form, {
    id: row.id,
    project_id: row.project_id,
    parent_id: row.parent_id || '',
    node_type: row.node_type,
    node_name: row.node_name,
    location_code: row.location_code || '',
    specialty: row.specialty || '',
    sort_no: row.sort_no || 0,
  })
  visible.value = true
}

function submit() {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  if (form.node_type === 9) {
    const exist = wbsNodes.find((n) => n.id === form.id)
    const r = upsertWbsNode(
      {
        // 底层仍保留验评侧「实体工程验收」命名，本页仅展示为「实体工程」
        node_name: exist?.node_name || '实体工程验收',
        project_id: scopeProjectId.value,
        node_type: 9,
        location_code: form.location_code,
        specialty: form.specialty,
      },
      form.id,
    )
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已更新')
    visible.value = false
    return
  }
  if (!ENTITY_TYPES.includes(Number(form.node_type))) {
    return ElMessage.error('本页仅可维护单位工程～分项')
  }
  const r = upsertWbsNode(
    {
      ...form,
      project_id: scopeProjectId.value,
      batch_type_id: '',
      form_template_id:
        form.node_type === 5
          ? 'ft-item-record'
          : form.node_type === 3 || form.node_type === 4
            ? 'ft-div-record'
            : '',
      is_hidden_work: 0,
      is_critical: 0,
    },
    form.id,
  )
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(form.id ? '节点已更新' : '节点已创建')
  visible.value = false
  if (!form.id && form.parent_id) selectedNodeId.value = form.parent_id
}

async function onRemove(row) {
  if (isSystemNode(row)) return
  try {
    await ElMessageBox.confirm(`确认删除「${displayNodeName(row)}」？`, '删除节点', { type: 'warning' })
    const r = removeWbsNode(row.id)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已删除')
    if (selectedNodeId.value === row.id) pickDefaultNode()
  } catch {
    /* cancel */
  }
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 实体工程分解</div>
      <h1 class="page-title">实体工程分解</h1>
      <p class="page-tip">
        与质量验评实体工程目录同源（单位工程→分项）。检验批请在验评目录树维护。当前项目：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="!canMaintain"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目，再维护本项目的实体工程分解"
      class="mb"
    />

    <div v-else class="layout">
      <aside class="tree-panel">
        <div class="panel-title">实体工程树</div>
        <el-input v-model="keyword" clearable placeholder="筛选节点名称" style="margin-bottom: 12px" aria-label="筛选节点名称"/>
        <el-button type="primary" size="small" style="margin-bottom: 8px" @click="openCreate()">
          新增节点
        </el-button>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :current-node-key="selectedNodeId"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :filter-node-method="filterTreeNode"
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <el-tag size="small" effect="plain" class="type-tag">{{ data.type_label }}</el-tag>
              <span class="tree-name" :title="data.label">{{ data.label }}</span>
            </span>
          </template>
        </el-tree>
      </aside>

      <section class="table-panel">
        <div v-if="selectedNode" class="node-summary">
          当前节点：
          <el-tag size="small" effect="plain">{{ TYPE_LABEL[selectedNode.node_type] || '节点' }}</el-tag>
          <strong>{{ displayNodeName(selectedNode) }}</strong>
          <el-button
            v-if="selectedNode.node_type !== 5"
            type="primary"
            size="small"
            style="margin-left: 12px"
            @click="openCreate(selectedNode.id)"
          >
            添加子节点
          </el-button>
        </div>
        <el-empty v-else description="请在左侧选择节点" :image-size="64" />

        <el-table v-if="selectedNode" :data="tableRows" stripe border height="100%" class="node-table">
          <el-table-column label="节点名称" min-width="220">
            <template #default="{ row, $index }">
              <span class="name-cell">
                <el-tag
                  v-if="$index === 0 && row.id === selectedNodeId"
                  size="small"
                  type="primary"
                  effect="dark"
                  class="type-tag"
                >
                  当前
                </el-tag>
                <el-tag size="small" effect="plain" class="type-tag">
                  {{ TYPE_LABEL[row.node_type] || '—' }}
                </el-tag>
                <span>{{ displayNodeName(row) }}</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="location_code" label="部位编码" width="120" />
          <el-table-column prop="specialty" label="专业" width="90" />
          <el-table-column prop="sort_no" label="排序" width="70" />
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button
                v-if="row.node_type !== 5 && row.node_type !== 9"
                link
                type="primary"
                @click="openCreate(row.id)"
              >
                添加子节点
              </el-button>
              <el-button
                v-if="row.node_type === 9"
                link
                type="primary"
                @click="openCreate(row.id)"
              >
                添加单位工程
              </el-button>
              <el-button v-if="!isSystemNode(row)" link type="danger" @click="onRemove(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑节点' : '新增节点'" width="520px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item v-if="form.node_type !== 9" label="父节点">
          <el-select v-model="form.parent_id" filterable style="width: 100%">
            <el-option
              v-for="n in parentOptions"
              :key="n.id"
              :label="`[${TYPE_LABEL[n.node_type]}] ${n.node_type === 9 ? '实体工程' : n.node_name}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.node_type !== 9" label="节点类型" required>
          <el-select
            v-model="form.node_type"
            style="width: 100%"
            :disabled="!!form.id"
          >
            <el-option
              v-for="opt in creatableTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input
            v-model="form.node_name"
            maxlength="80"
            :disabled="form.node_type === 9"
          />
        </el-form-item>
        <el-form-item label="部位编码">
          <el-input v-model="form.location_code" maxlength="40" />
        </el-form-item>
        <el-form-item label="专业">
          <el-input v-model="form.specialty" maxlength="20" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_no" :min="0" :max="9999" />
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
  width: 320px;
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
.node-summary { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tree-node { display: inline-flex; align-items: center; gap: 6px; }
.tree-name { overflow: hidden; text-overflow: ellipsis; }
.type-tag { flex-shrink: 0; }
.name-cell { display: inline-flex; align-items: center; gap: 6px; }
.node-table { flex: 1; }
</style>
