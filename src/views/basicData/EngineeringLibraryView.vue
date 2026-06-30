<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Refresh, Plus, Clock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLibraryConfig, libraryStatusOptions } from '../../config/engineeringLibraryConfig'
import {
  getLibraryList,
  statusTagClass,
  getParentOptions,
} from '../../mock/engineeringLibrary'

const route = useRoute()
const libraryType = computed(() => route.meta.libraryType || 'unit')
const config = computed(() => getLibraryConfig(libraryType.value))

const list = ref([])
const filters = ref({ code: '', name: '', status: '', bimCode: '' })
const formVisible = ref(false)
const historyVisible = ref(false)
const editingId = ref(null)
const historyRows = ref([])
const formRef = ref(null)

const formData = ref({
  code: '',
  name: '',
  parentCode: '',
  bimCode: '',
  bimModelId: '',
  remark: '',
})

const parentOptions = computed(() => getParentOptions(libraryType.value))

const filteredList = computed(() => {
  return list.value.filter((row) => {
    if (filters.value.code && !row.code.includes(filters.value.code.trim())) return false
    if (filters.value.name && !row.name.includes(filters.value.name.trim())) return false
    if (filters.value.status && row.status !== filters.value.status) return false
    if (filters.value.bimCode && !row.bimCode.includes(filters.value.bimCode.trim())) return false
    return true
  })
})

const stats = computed(() => ({
  total: list.value.length,
  enabled: list.value.filter((r) => r.status === '已启用').length,
  disabled: list.value.filter((r) => r.status === '已停用').length,
  draft: list.value.filter((r) => r.status === '草稿').length,
}))

const formRules = {
  code: [{ required: true, message: '请输入编号' }],
  name: [{ required: true, message: '请输入名称' }],
}

watch(
  libraryType,
  () => {
    list.value = getLibraryList(libraryType.value).map((row) => ({ ...row, history: [...row.history] }))
    filters.value = { code: '', name: '', status: '', bimCode: '' }
  },
  { immediate: true },
)

function handleReset() {
  filters.value = { code: '', name: '', status: '', bimCode: '' }
}

function openForm(row) {
  if (row) {
    editingId.value = row.id
    formData.value = {
      code: row.code,
      name: row.name,
      parentCode: row.parentCode,
      bimCode: row.bimCode,
      bimModelId: row.bimModelId,
      remark: row.remark,
    }
  } else {
    editingId.value = null
    formData.value = {
      code: '',
      name: '',
      parentCode: '',
      bimCode: '',
      bimModelId: '',
      remark: '',
    }
  }
  formVisible.value = true
}

async function handleSubmit() {
  await formRef.value.validate()
  const parent = parentOptions.value.find((p) => p.code === formData.value.parentCode)
  if (editingId.value) {
    const target = list.value.find((r) => r.id === editingId.value)
    if (target) {
      Object.assign(target, {
        ...formData.value,
        parentName: parent?.name || '',
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
    const nextNum = list.value.length + 1
    list.value.unshift({
      id: `${libraryType.value}-${Date.now()}`,
      code: formData.value.code || `${config.value.codePrefix}-${String(nextNum).padStart(3, '0')}`,
      name: formData.value.name,
      version: 'V1.0',
      status: '草稿',
      bimCode: formData.value.bimCode,
      bimModelId: formData.value.bimModelId,
      parentCode: formData.value.parentCode,
      parentName: parent?.name || '',
      referenced: false,
      effectiveDate: '',
      updatedBy: '当前用户',
      updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      remark: formData.value.remark,
      history: [{ version: 'V1.0', action: '创建草稿', operator: '当前用户', time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'), note: '' }],
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
  list.value = list.value.filter((r) => r.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="lib-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / {{ config.title }}</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">{{ config.title }}</h1>
          <span class="level-tag">标准库</span>
        </div>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openForm()">
            新增{{ config.itemLabel }}
          </el-button>
        </div>
      </div>
      <div class="page-desc">{{ config.description }}</div>
    </div>

    <div class="stats-row">
      <div class="stat-card"><span class="stat-label">总数</span><span class="stat-value">{{ stats.total }}</span></div>
      <div class="stat-card"><span class="stat-label">已启用</span><span class="stat-value enabled">{{ stats.enabled }}</span></div>
      <div class="stat-card"><span class="stat-label">已停用</span><span class="stat-value">{{ stats.disabled }}</span></div>
      <div class="stat-card"><span class="stat-label">草稿</span><span class="stat-value draft">{{ stats.draft }}</span></div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>编号</label>
          <el-input v-model="filters.code" placeholder="工程编号" clearable style="width: 140px" />
        </div>
        <div class="filter-item">
          <label>名称</label>
          <el-input v-model="filters.name" placeholder="工程名称" clearable style="width: 160px" />
        </div>
        <div class="filter-item">
          <label>BIM编号</label>
          <el-input v-model="filters.bimCode" placeholder="BIM关联编号" clearable style="width: 150px" />
        </div>
        <div class="filter-item">
          <label>状态</label>
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 110px">
            <el-option v-for="opt in libraryStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">共 {{ filteredList.length }} 条{{ config.itemLabel }}标准</div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="code" label="编号" width="110" />
        <el-table-column prop="name" :label="`${config.itemLabel}名称`" min-width="140" show-overflow-tooltip />
        <el-table-column
          v-if="config.parentLabel"
          prop="parentName"
          :label="`所属${config.parentLabel}`"
          min-width="130"
          show-overflow-tooltip
        />
        <el-table-column prop="version" label="版本" width="80" align="center" />
        <el-table-column prop="bimCode" label="BIM关联编号" min-width="130" show-overflow-tooltip />
        <el-table-column prop="bimModelId" label="BIM模型ID" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <span class="ap-status-tag" :class="statusTagClass(row.status)">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="引用" width="70" align="center">
          <template #default="{ row }">{{ row.referenced ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column prop="effectiveDate" label="生效日期" width="110" />
        <el-table-column prop="updatedBy" label="更新人" width="90" />
        <el-table-column prop="updatedAt" label="更新时间" width="150" />
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openForm(row)">编辑</el-button>
            <el-button link type="primary" :disabled="row.status === '已停用'" @click="handleDisable(row)">停用</el-button>
            <el-button link type="primary" @click="handlePublish(row)">发布新版本</el-button>
            <el-button link type="primary" :icon="Clock" @click="openHistory(row)">版本记录</el-button>
            <el-button
              link
              type="danger"
              :disabled="row.referenced || row.status !== '草稿'"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? `编辑${config.itemLabel}` : `新增${config.itemLabel}`"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
        <el-form-item label="编号" prop="code">
          <el-input v-model="formData.code" :placeholder="`如 ${config.codePrefix}-001`" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formData.name" :placeholder="`请输入${config.itemLabel}名称`" />
        </el-form-item>
        <el-form-item v-if="config.parentLabel" :label="`所属${config.parentLabel}`">
          <el-select v-model="formData.parentCode" placeholder="请选择" clearable style="width: 100%">
            <el-option v-for="opt in parentOptions" :key="opt.code" :label="`${opt.code} ${opt.name}`" :value="opt.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="BIM关联编号">
          <el-input v-model="formData.bimCode" placeholder="用于与BIM模型关联" />
        </el-form-item>
        <el-form-item label="BIM模型ID">
          <el-input v-model="formData.bimModelId" placeholder="BIM模型唯一标识" />
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
  color: var(--ap-text);
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: var(--ap-text-muted);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ap-text);
}

.stat-value.enabled {
  color: var(--ap-success);
}

.stat-value.draft {
  color: var(--ap-info);
}

.filter-bar {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
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
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
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
