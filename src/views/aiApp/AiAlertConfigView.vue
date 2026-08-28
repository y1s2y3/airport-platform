<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  AI_ALERT_TYPES,
  AI_CATEGORY_META,
  AI_HANDLER_OPTIONS,
  getProjectHandlerConfigs,
  toggleHandlerConfig,
  updateHandlerConfig,
} from '../../mock/aiApp.js'
import './ai-app.css'

const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const filters = reactive({ alertType: '', handler: '' })

const projectRows = computed(() => getProjectHandlerConfigs(selectedProjectId.value))

const filteredRows = computed(() =>
  projectRows.value.filter((row) => {
    if (filters.alertType && row.alertType !== filters.alertType) return false
    if (filters.handler && !(row.handlers || []).includes(filters.handler)) return false
    return true
  }),
)

const handlerOptions = computed(() =>
  [...new Set([...AI_HANDLER_OPTIONS, ...projectRows.value.flatMap((item) => item.handlers || [])])],
)

/* ---------- 编辑弹窗 ---------- */
const editVisible = ref(false)
const editSubmitting = ref(false)
const editFormRef = ref(null)
const editingRow = ref(null)
const editForm = reactive({ alertType: '', category: '', handlers: [] })

const editRules = {
  handlers: [
    { required: true, type: 'array', min: 1, message: '请至少选择一名处置人', trigger: 'change' },
  ],
}

watch(selectedProjectId, () => {
  resetFilters()
  closeEdit()
})

function categoryLabel(category) {
  return AI_CATEGORY_META[category]?.label || '-'
}

function findTypeMeta(value) {
  return AI_ALERT_TYPES.find((item) => item.value === value) || null
}

function typeLabel(value) {
  const meta = findTypeMeta(value)
  return meta ? `${meta.value}（${categoryLabel(meta.category)}）` : value
}

/* ---------- 编辑 ---------- */
function startEdit(row) {
  editingRow.value = row
  editForm.alertType = row.alertType
  editForm.category = row.category
  editForm.handlers = [...(row.handlers || [])]
  editVisible.value = true
  editFormRef.value?.clearValidate?.()
}

function closeEdit() {
  if (editSubmitting.value) return
  editVisible.value = false
}

async function saveEdit() {
  const valid = await editFormRef.value?.validate?.().catch(() => false)
  if (!valid) return
  if (!editingRow.value) return
  editSubmitting.value = true
  updateHandlerConfig(editingRow.value.id, editForm.handlers)
  ElMessage.success('配置更新成功')
  editSubmitting.value = false
  editVisible.value = false
  editingRow.value = null
}

async function toggleRow(row) {
  const nextAction = row.enabled === false ? '启用' : '禁用'
  const confirmed = await ElMessageBox.confirm(
    `${nextAction}后将${nextAction === '禁用' ? '暂停向该类型处置人发送站内信' : '恢复该类型预警配置'}，是否确认${nextAction}？`,
    `${nextAction}配置`,
    { type: 'warning', confirmButtonText: `确认${nextAction}`, cancelButtonText: '取消' },
  ).catch(() => false)
  if (!confirmed) return
  toggleHandlerConfig(row.id)
  ElMessage.success(`配置已${nextAction}`)
}

function resetFilters() {
  filters.alertType = ''
  filters.handler = ''
}
</script>

<template>
  <div class="ai-page page-card">
    <div class="ai-page-header">
      <div>
        <div class="ai-page-breadcrumb">AI 应用 / 预警配置</div>
        <h1 class="ai-page-title">预警配置</h1>
        <p class="ai-page-tip">配置各类 AI 预警的处置人；全部预警类型由系统预置，启用后通过站内信通知。</p>
      </div>
      <div class="ai-project-chip">当前项目：{{ headerProjectLabel }}</div>
    </div>

    <el-alert
      title="配置台账展示全部预警类型。点击“编辑”配置处置人，不需要的类型可禁用，后续仍可重新启用。"
      type="info"
      show-icon
      :closable="false"
    />

    <div class="ai-panel">
      <div class="ai-panel-title">查询条件</div>
      <div class="ai-filter-bar">
        <el-select v-model="filters.alertType" placeholder="预警类型" clearable filterable style="width: 190px">
          <el-option v-for="item in AI_ALERT_TYPES" :key="item.value" :label="typeLabel(item.value)" :value="item.value" />
        </el-select>
        <el-select v-model="filters.handler" placeholder="处置人" clearable filterable style="width: 210px">
          <el-option v-for="item in handlerOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
    </div>

    <!-- 配置台账 -->
    <div class="ai-panel">
      <div class="ai-panel-title">配置台账</div>
      <el-table :data="filteredRows" stripe border class="ap-table config-table" empty-text="暂无预警类型">
        <el-table-column type="index" label="序号" width="58" align="center" />
        <el-table-column prop="alertType" label="预警类型" min-width="180" />
        <el-table-column label="所属台账" min-width="180">
          <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
        </el-table-column>
        <el-table-column label="处置人" min-width="320">
          <template #default="{ row }">
            <div class="handler-tags">
              <el-tag v-for="handler in row.handlers" :key="handler" size="small" class="handler-tag">
                {{ handler }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled === false ? 'info' : 'success'" size="small" effect="plain">
              {{ row.enabled === false ? '已禁用' : '已启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedBy" label="更新人" width="120" />
        <el-table-column prop="updatedAt" label="更新时间" width="165" />
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="startEdit(row)">编辑</el-button>
            <el-button link :type="row.enabled === false ? 'success' : 'danger'" @click="toggleRow(row)">
              {{ row.enabled === false ? '启用' : '禁用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 编辑配置弹窗 -->
    <el-dialog
      v-model="editVisible"
      title="编辑预警配置"
      width="560px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      @close="closeEdit"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px">
        <el-form-item label="预警类型">
          <el-input :model-value="editForm.alertType" disabled />
        </el-form-item>
        <el-form-item label="所属台账">
          <el-input :model-value="categoryLabel(editForm.category)" disabled />
        </el-form-item>
        <el-form-item label="处置人" prop="handlers">
          <el-select
            v-model="editForm.handlers"
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            placeholder="可多选处置人"
            style="width: 100%"
          >
            <el-option v-for="item in handlerOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="dialog-tip">
        一个预警类型可配置多名处置人；预警类型由系统预置，不允许修改。
      </div>
      <template #footer>
        <el-button @click="closeEdit">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.config-table :deep(.el-table__cell),
.add-config-table :deep(.el-table__cell) {
  vertical-align: middle;
}

.add-toolbar {
  margin-bottom: 12px;
}

.handler-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.handler-tag {
  max-width: 100%;
}

.dialog-tip {
  border-radius: 6px;
  background: #f7f8fa;
  padding: 10px 12px;
  color: var(--ap-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
</style>
