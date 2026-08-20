<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  engineeringChildTypeMap,
  engineeringTypeLabels,
  getLibraryConfig,
  libraryStatusOptions,
} from '../../config/engineeringLibraryConfig'
import {
  buildEngineeringTree,
  cloneLibraryData,
  findEngineeringNode,
  getDefaultEngineeringNodeId,
  getDirectChildren,
  getParentOptions,
  statusTagClass,
} from '../../mock/engineeringLibrary'

const libraryData = ref(cloneLibraryData())
const treeRef = ref(null)
const treeData = computed(() => buildEngineeringTree(libraryData.value))
const selectedNodeId = ref(getDefaultEngineeringNodeId(libraryData.value))
const keyword = ref('')
const filters = ref({ code: '', name: '', status: '', bimCode: '' })
const formVisible = ref(false)
const historyVisible = ref(false)
const editingId = ref(null)
const formType = ref('unit')
const historyRows = ref([])
const formRef = ref(null)

const formData = ref({
  code: '',
  name: '',
  parentCode: '',
  projectId: '',
  bimCode: '',
  bimModelId: '',
  remark: '',
})

const isProjectNode = computed(() => selectedNode.value?.type === 'project')

const selectedNode = computed(() => findEngineeringNode(treeData.value, selectedNodeId.value))
const selectedTypeLabel = computed(() => engineeringTypeLabels[selectedNode.value?.type] || '')
const childType = computed(() => engineeringChildTypeMap[selectedNode.value?.type] || null)
const childTypeLabel = computed(() => engineeringTypeLabels[childType.value] || '')

const directChildren = computed(() => {
  if (!selectedNode.value) return []
  return getDirectChildren(libraryData.value, selectedNode.value)
})

const filteredChildren = computed(() => {
  return directChildren.value.filter((row) => {
    if (filters.value.code && !row.code.includes(filters.value.code.trim())) return false
    if (filters.value.name && !row.name.includes(filters.value.name.trim())) return false
    if (filters.value.status && row.status !== filters.value.status) return false
    if (filters.value.bimCode && !row.bimCode.includes(filters.value.bimCode.trim())) return false
    return true
  })
})

const stats = computed(() => ({
  total: directChildren.value.length,
  enabled: directChildren.value.filter((r) => r.status === '已启用').length,
  disabled: directChildren.value.filter((r) => r.status === '已停用').length,
  draft: directChildren.value.filter((r) => r.status === '草稿').length,
}))

const parentOptions = computed(() => getParentOptions(formType.value))

const formRules = {
  code: [{ required: true, message: '请输入编号' }],
  name: [{ required: true, message: '请输入名称' }],
}

const formConfig = computed(() => getLibraryConfig(formType.value))

watch(treeData, (tree) => {
  if (!findEngineeringNode(tree, selectedNodeId.value)) {
    selectedNodeId.value = getDefaultEngineeringNodeId()
  }
})

watch(keyword, (val) => {
  treeRef.value?.filter(val.trim())
})

function handleNodeClick(data) {
  selectedNodeId.value = data.id
  filters.value = { code: '', name: '', status: '', bimCode: '' }
}

function handleReset() {
  keyword.value = ''
  filters.value = { code: '', name: '', status: '', bimCode: '' }
}

function resolveProjectContext(typeOverride) {
  const node = selectedNode.value
  if (typeOverride === 'unit' && node?.type === 'project') {
    return { projectId: node.id, projectName: node.raw.projectName }
  }
  if (node?.type === 'unit') {
    return { projectId: node.raw.projectId, projectName: node.raw.projectName }
  }
  if (node?.type === 'project') {
    return { projectId: node.id, projectName: node.raw.projectName }
  }
  return { projectId: '', projectName: '' }
}

function openForm(row, typeOverride) {
  const type = typeOverride || row?.type || selectedNode.value?.type || 'unit'
  if (type === 'project') return
  formType.value = type
  const projectCtx = row?.projectId
    ? { projectId: row.projectId, projectName: row.projectName }
    : resolveProjectContext(typeOverride)
  if (row) {
    editingId.value = row.id
    formData.value = {
      code: row.code,
      name: row.name,
      parentCode: row.parentCode || '',
      projectId: row.projectId || projectCtx.projectId,
      bimCode: row.bimCode,
      bimModelId: row.bimModelId,
      remark: row.remark,
    }
  } else {
    editingId.value = null
    formData.value = {
      code: '',
      name: '',
      parentCode: type === 'unit' ? '' : selectedNode.value?.code || '',
      projectId: type === 'unit' ? projectCtx.projectId : '',
      bimCode: '',
      bimModelId: '',
      remark: '',
    }
  }
  formVisible.value = true
}

function openAddChild() {
  if (!childType.value) return
  openForm(null, childType.value)
}

async function handleSubmit() {
  await formRef.value.validate()
  const config = formConfig.value
  const parent = parentOptions.value.find((p) => p.code === formData.value.parentCode)
  const list = libraryData.value[formType.value]
  const projectCtx = resolveProjectContext(formType.value)

  if (editingId.value) {
    const target = list.find((r) => r.id === editingId.value)
    if (target) {
      Object.assign(target, {
        ...formData.value,
        parentName: parent?.name || '',
        projectId: formData.value.projectId || target.projectId,
        projectName: target.projectName || projectCtx.projectName,
        updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        updatedBy: '当前用户',
      })
      target.history.unshift({
        version: target.version,
        action: '编辑',
        operator: '当前用户',
        time: target.updatedAt,
        note: '更新基础信息',
      })
    }
    ElMessage.success('编辑成功')
  } else {
    const nextNum = list.length + 1
    const projectId = formType.value === 'unit'
      ? formData.value.projectId || projectCtx.projectId
      : ''
    list.unshift({
      id: `${formType.value}-${Date.now()}`,
      code: formData.value.code || `${config.codePrefix}-${String(nextNum).padStart(3, '0')}`,
      name: formData.value.name,
      projectId,
      projectName: projectCtx.projectName,
      version: 'V1.0',
      status: '草稿',
      bimCode: formData.value.bimCode,
      bimModelId: formData.value.bimModelId,
      parentCode: formType.value === 'unit' ? '' : formData.value.parentCode || selectedNode.value?.code || '',
      parentName: parent?.name || '',
      referenced: false,
      effectiveDate: '',
      updatedBy: '当前用户',
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      remark: formData.value.remark,
      history: [{
        version: 'V1.0',
        action: '创建草稿',
        operator: '当前用户',
        time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        note: '',
      }],
    })
    ElMessage.success('新增成功，当前为草稿状态')
  }
  formVisible.value = false
}

async function handleDisable(row) {
  if (row.status === '已停用') {
    ElMessage.info('该数据已处于停用状态')
    return
  }
  await ElMessageBox.confirm(
    `确认停用「${row.name}」？已生效或已被引用的数据不可删除，仅支持停用。`,
    '停用确认',
    { type: 'warning' },
  )
  row.status = '已停用'
  row.history.unshift({
    version: row.version,
    action: '停用',
    operator: '当前用户',
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    note: '手动停用',
  })
  ElMessage.success('已停用')
}

async function handlePublish(row) {
  if (row.status === '草稿') {
    row.status = '已启用'
    row.effectiveDate = new Date().toISOString().slice(0, 10)
    row.referenced = true
    row.history.unshift({
      version: row.version,
      action: '发布生效',
      operator: '当前用户',
      time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      note: '首次发布',
    })
    ElMessage.success('发布成功')
    return
  }
  const { value: note } = await ElMessageBox.prompt('请输入新版本变更说明', '发布新版本', {
    confirmButtonText: '发布',
    inputPlaceholder: '变更说明',
  }).catch(() => ({ value: null }))
  if (note === null) return
  const [major] = row.version.replace('V', '').split('.')
  row.version = `V${Number(major) + 1}.0`
  row.status = '已启用'
  row.effectiveDate = new Date().toISOString().slice(0, 10)
  row.history.unshift({
    version: row.version,
    action: '发布新版本',
    operator: '当前用户',
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    note: note || '版本升级',
  })
  ElMessage.success(`已发布 ${row.version}`)
}

function openHistory(row) {
  historyRows.value = row.history
  historyVisible.value = true
}

async function handleDelete(row) {
  if (row.referenced || row.status === '已启用') {
    ElMessage.warning('已生效或已被引用的数据禁止删除，请使用停用或发布新版本')
    return
  }
  if (row.status !== '草稿') {
    ElMessage.warning('仅草稿状态且未被引用的数据可删除')
    return
  }
  await ElMessageBox.confirm(`确认删除草稿「${row.name}」？`, '删除确认', { type: 'warning' })
  const typeKey = childType.value || selectedNode.value?.type
  libraryData.value[typeKey] = libraryData.value[typeKey].filter((r) => r.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="lib-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 工程划分库</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">工程划分库</h1>
          <span class="level-tag">树形维护</span>
        </div>
        <div class="page-actions" />
      </div>
      <div class="page-desc">
        以项目为第一级节点，其下维护单位工程、子单位工程、分部工程、子分部工程、分项工程；支持版本管理、BIM 关联及停用控制。
      </div>
    </div>

    <div class="lib-layout">
      <aside class="tree-panel">
        <div class="panel-head">
          <span class="panel-title">工程结构树</span>
        </div>
        <el-input
          v-model="keyword"
          placeholder="搜索项目 / 编号 / 名称"
          clearable
          :prefix-icon="Search"
          class="tree-search" aria-label="搜索项目 / 编号 / 名称"/>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedNodeId"
          :expand-on-click-node="false"
          :filter-node-method="(value, data) => !value || data.label.includes(value)"
          class="eng-tree"
          @node-click="handleNodeClick"
        />
      </aside>

      <section class="detail-panel">
        <div class="panel-head detail-head">
          <div>
            <span class="panel-title">{{ selectedNode?.label || '请选择节点' }}</span>
            <el-tag v-if="selectedTypeLabel" size="small" effect="plain" class="type-tag">{{ selectedTypeLabel }}</el-tag>
          </div>
          <div class="head-actions">
            <el-button
              v-if="selectedNode && !isProjectNode"
              link
              type="primary"
              @click="openForm(selectedNode.raw, selectedNode.type)"
            >
              编辑当前节点
            </el-button>
            <el-button
              v-if="childType"
              class="ap-btn-primary"
              type="primary"
              :icon="Plus"
              @click="openAddChild"
            >
              新增{{ childTypeLabel }}
            </el-button>
          </div>
        </div>

        <div v-if="selectedNode && isProjectNode" class="node-summary">
          <span>项目编号 {{ selectedNode.raw.projectCode }}</span>
          <span>项目经理 {{ selectedNode.raw.manager }}</span>
          <span>项目状态 {{ selectedNode.raw.projectStatus }}</span>
          <span>建设性质 {{ selectedNode.raw.buildNature }}</span>
        </div>

        <div v-else-if="selectedNode" class="node-summary">
          <span>编号 {{ selectedNode.raw.code }}</span>
          <span>版本 {{ selectedNode.raw.version }}</span>
          <span class="ap-status-tag" :class="statusTagClass(selectedNode.raw.status)">{{ selectedNode.raw.status }}</span>
          <span>BIM {{ selectedNode.raw.bimCode || '-' }}</span>
        </div>

        <div v-if="childType" class="stats-row">
          <div class="stat-card"><span class="stat-label">下级{{ childTypeLabel }}</span><span class="stat-value">{{ stats.total }}</span></div>
          <div class="stat-card"><span class="stat-label">已启用</span><span class="stat-value enabled">{{ stats.enabled }}</span></div>
          <div class="stat-card"><span class="stat-label">已停用</span><span class="stat-value">{{ stats.disabled }}</span></div>
          <div class="stat-card"><span class="stat-label">草稿</span><span class="stat-value draft">{{ stats.draft }}</span></div>
        </div>

        <div v-if="childType" class="filter-bar">
          <div class="filter-row">
            <div class="filter-item">
              <label>编号</label>
              <el-input v-model="filters.code" placeholder="工程编号" clearable style="width: 130px" aria-label="工程编号"/>
            </div>
            <div class="filter-item">
              <label>名称</label>
              <el-input v-model="filters.name" placeholder="工程名称" clearable style="width: 140px" aria-label="工程名称"/>
            </div>
            <div class="filter-item">
              <label>状态</label>
              <el-select v-model="filters.status" placeholder="全部" clearable style="width: 100px" aria-label="全部">
                <el-option v-for="opt in libraryStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </div>
            <div class="filter-actions">
              <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
              <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            </div>
          </div>
        </div>

        <div v-if="childType" class="table-section">
          <div class="table-summary">下级{{ childTypeLabel }}共 {{ filteredChildren.length }} 条</div>
          <el-table :data="filteredChildren" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="code" label="编号" width="100" />
            <el-table-column prop="name" :label="`${childTypeLabel}名称`" min-width="140" show-overflow-tooltip />
            <el-table-column prop="version" label="版本" width="72" align="center" />
            <el-table-column prop="bimCode" label="BIM编号" min-width="120" show-overflow-tooltip />
            <el-table-column label="状态" width="88" align="center">
              <template #default="{ row }">
                <span class="ap-status-tag" :class="statusTagClass(row.status)">{{ row.status }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="150" />
            <el-table-column label="操作" width="240" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="selectedNodeId = row.id">定位</el-button>
                <el-button link type="primary" @click="openForm({ ...row, type: childType }, childType)">编辑</el-button>
                <el-button link type="primary" :disabled="row.status === '已停用'" @click="handleDisable(row)">停用</el-button>
                <el-button link type="primary" @click="handlePublish(row)">发布</el-button>
                <el-button link type="primary" :icon="Clock" @click="openHistory(row)">版本</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-else-if="selectedNode && !isProjectNode" class="leaf-panel">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="编号">{{ selectedNode.raw.code }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedNode.raw.name }}</el-descriptions-item>
            <el-descriptions-item label="版本">{{ selectedNode.raw.version }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ selectedNode.raw.status }}</el-descriptions-item>
            <el-descriptions-item label="BIM编号">{{ selectedNode.raw.bimCode || '-' }}</el-descriptions-item>
            <el-descriptions-item label="BIM模型ID">{{ selectedNode.raw.bimModelId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="生效日期">{{ selectedNode.raw.effectiveDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新人">{{ selectedNode.raw.updatedBy }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ selectedNode.raw.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="leaf-actions">
            <el-button @click="openForm(selectedNode.raw, selectedNode.type)">编辑</el-button>
            <el-button @click="handleDisable(selectedNode.raw)">停用</el-button>
            <el-button type="primary" class="ap-btn-primary" @click="handlePublish(selectedNode.raw)">发布新版本</el-button>
            <el-button :icon="Clock" @click="openHistory(selectedNode.raw)">版本记录</el-button>
          </div>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? `编辑${formConfig.itemLabel}` : `新增${formConfig.itemLabel}`"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
        <el-form-item label="编号" prop="code">
          <el-input v-model="formData.code" :placeholder="`如 ${formConfig.codePrefix}-001`" aria-label="`如 ${formConfig.codePrefix}-001`"/>
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" :placeholder="`请输入${formConfig.itemLabel}名称`" aria-label="`请输入${formConfig.itemLabel}名称`"/>
        </el-form-item>
        <el-form-item v-if="formConfig.parentLabel" :label="`所属${formConfig.parentLabel}`">
          <el-select v-model="formData.parentCode" placeholder="请选择" clearable style="width: 100%" aria-label="请选择">
            <el-option v-for="opt in parentOptions" :key="opt.code" :label="`${opt.code} ${opt.name}`" :value="opt.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="BIM关联编号">
          <el-input v-model="formData.bimCode" placeholder="用于与BIM模型关联" aria-label="用于与BIM模型关联"/>
        </el-form-item>
        <el-form-item label="BIM模型ID">
          <el-input v-model="formData.bimModelId" placeholder="BIM模型唯一标识" aria-label="BIM模型唯一标识"/>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button class="ap-btn-primary" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="historyVisible" title="版本变更记录" size="520px">
      <el-timeline>
        <el-timeline-item v-for="(item, idx) in historyRows" :key="idx" :timestamp="item.time" placement="top">
          <div class="history-item">
            <div class="history-head">
              <strong>{{ item.version }}</strong>
              <span class="history-action">{{ item.action }}</span>
            </div>
            <div class="history-meta">操作人：{{ item.operator }}</div>
            <div v-if="item.note" class="history-note">{{ item.note }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-drawer>
  </div>
</template>

<style scoped>
.lib-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
}

.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  border: 1px solid rgba(143, 0, 69, 0.15);
}

.page-desc {
  margin-top: 10px;
  font-size: 13px;
  color: var(--ap-text-muted);
  line-height: 1.6;
}

.lib-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  min-height: 560px;
}

.tree-panel,
.detail-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  min-width: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
}

.tree-search {
  margin-bottom: 12px;
}

.eng-tree {
  max-height: calc(100vh - 320px);
  overflow: auto;
}

.detail-head {
  margin-bottom: 10px;
}

.type-tag {
  margin-left: 8px;
}

.head-actions {
  display: flex;
  gap: 8px;
}

.node-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  padding: 10px 12px;
  background: var(--ap-bg-muted, #f8f9fb);
  border-radius: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.stat-card {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-value.enabled {
  color: var(--ap-success);
}

.stat-value.draft {
  color: var(--ap-info);
}

.filter-bar {
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  min-width: 0;
}

.table-summary {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.leaf-panel {
  padding-top: 8px;
}

.leaf-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.history-item {
  padding-bottom: 4px;
}

.history-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.history-action {
  font-size: 13px;
  color: var(--ap-primary);
}

.history-meta {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.history-note {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
</style>
