<script setup>
/**
 * 模板定义（指挥部 · 流程管理 → 消息模板）
 * 各分类下的通知模板：筛选（模板名称 / 所属分类 / 启用状态）+ 台账 + 新增 / 编辑 / 删除 + 预览
 * 口径：所属消息分类只能选启用中的分类；标题与正文支持 ${变量} 占位
 */
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listMessageTemplates,
  listEnabledMessageClassifies,
  classifyNameByCode,
  createEmptyMessageTemplate,
  cloneMessageTemplate,
  saveMessageTemplate,
  removeMessageTemplate,
  renderMessageTemplate,
  enabledLabel,
  enabledTagType,
  joinOptions,
  MESSAGE_CHANNEL_OPTIONS,
} from '../../mock/flowManage'

const classifyOptions = computed(() => listEnabledMessageClassifies())

const filterForm = ref({
  keyword: '',
  classify_code: '',
  enabled: '',
})

/** 检索条件仅在点击「搜索」时生效 */
const appliedFilter = ref({ ...filterForm.value })

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyMessageTemplate())

const previewVisible = ref(false)
const previewData = ref({ title: '', content: '', variables: '', channels: [] })

const dialogTitle = computed(() => (editingId.value ? '编辑消息模板' : '新增消息模板'))

const rules = {
  template_name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { max: 40, message: '模板名称不超过 40 个字符', trigger: 'blur' },
  ],
  template_code: [
    { required: true, message: '请输入模板编码', trigger: 'blur' },
    { max: 40, message: '模板编码不超过 40 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]+$/, message: '模板编码仅支持字母、数字与下划线', trigger: 'blur' },
  ],
  classify_code: [{ required: true, message: '请选择所属消息分类', trigger: 'change' }],
  channels: [{ required: true, type: 'array', min: 1, message: '请至少选择一个消息渠道', trigger: 'change' }],
  title_tpl: [
    { required: true, message: '请输入标题模板', trigger: 'blur' },
    { max: 60, message: '标题模板不超过 60 个字符', trigger: 'blur' },
  ],
  content_tpl: [
    { required: true, message: '请输入正文模板', trigger: 'blur' },
    { max: 500, message: '正文模板不超过 500 个字符', trigger: 'blur' },
  ],
}

const filteredList = computed(() => {
  const { keyword, classify_code, enabled } = appliedFilter.value
  return listMessageTemplates().filter((row) => {
    if (keyword) {
      const kw = keyword.trim().toLowerCase()
      const hit =
        String(row.template_name || '').toLowerCase().includes(kw) ||
        String(row.template_code || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    if (classify_code && row.classify_code !== classify_code) return false
    if (enabled !== '' && Boolean(row.enabled) !== enabled) return false
    return true
  })
})

function handleSearch() {
  appliedFilter.value = { ...filterForm.value }
}

function handleReset() {
  filterForm.value = { keyword: '', classify_code: '', enabled: '' }
  appliedFilter.value = { ...filterForm.value }
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyMessageTemplate()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = cloneMessageTemplate(row)
  dialogVisible.value = true
}

function openPreview(row) {
  previewData.value = {
    title: renderMessageTemplate(row.title_tpl),
    content: renderMessageTemplate(row.content_tpl),
    variables: row.variables || '',
    channels: [...(row.channels || [])],
  }
  previewVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除消息模板「${row.template_name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeMessageTemplate(row.id)
  if (res.ok) {
    ElMessage.success('已删除')
  } else {
    ElMessage.warning(res.msg)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    const res = saveMessageTemplate(form.value, editingId.value || undefined)
    if (!res.ok) {
      ElMessage.warning(res.msg)
      return
    }
    dialogVisible.value = false
    ElMessage.success(editingId.value ? '保存成功' : '新增成功')
  })
}
</script>

<template>
  <div class="message-template-page page-card">
    <div class="page-head">
      <h1 class="page-title">模板定义</h1>
      <p class="page-tip">维护各消息分类下的通知模板，标题与正文支持 ${变量} 占位；可预览示例渲染效果。</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">模板名称</span>
        <el-input
          v-model="filterForm.keyword"
          class="filter-input"
          placeholder="名称或编码"
          clearable
          aria-label="请输入模板名称或编码"
          @keyup.enter="handleSearch"
        />
        <span class="field-label">所属消息分类</span>
        <el-select
          v-model="filterForm.classify_code"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择所属消息分类"
        >
          <el-option v-for="opt in classifyOptions" :key="opt.classify_code" :label="opt.classify_name" :value="opt.classify_code" />
        </el-select>
        <span class="field-label">启用状态</span>
        <el-select
          v-model="filterForm.enabled"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择启用状态"
        >
          <el-option label="启用" :value="true" />
          <el-option label="停用" :value="false" />
        </el-select>
        <span class="toolbar-actions">
          <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </span>
      </div>
    </div>

    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
      <div class="table-actions">
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>

    <el-table :data="filteredList" border stripe class="ap-table" empty-text="暂无数据">
      <el-table-column prop="template_name" label="模板名称" min-width="170" />
      <el-table-column prop="template_code" label="模板编码" min-width="180" />
      <el-table-column label="所属消息分类" width="130" align="center">
        <template #default="{ row }">{{ classifyNameByCode(row.classify_code) }}</template>
      </el-table-column>
      <el-table-column label="消息渠道" min-width="190">
        <template #default="{ row }">{{ joinOptions(row.channels) }}</template>
      </el-table-column>
      <el-table-column label="启用状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="enabledTagType(row.enabled)" effect="plain">{{ enabledLabel(row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPreview(row)">预览</el-button>
          <span class="op-divider">|</span>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="680px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="模板名称" prop="template_name" required>
          <el-input v-model="form.template_name" placeholder="如 待办到达提醒" maxlength="40" aria-label="请输入模板名称" />
        </el-form-item>
        <el-form-item label="模板编码" prop="template_code" required>
          <el-input v-model="form.template_code" placeholder="如 TPL_TODO_ARRIVE" maxlength="40" aria-label="请输入模板编码" />
        </el-form-item>
        <el-form-item label="所属消息分类" prop="classify_code" required>
          <el-select v-model="form.classify_code" placeholder="请选择启用中的消息分类" style="width: 100%" aria-label="请选择所属消息分类">
            <el-option v-for="opt in classifyOptions" :key="opt.classify_code" :label="opt.classify_name" :value="opt.classify_code" />
          </el-select>
        </el-form-item>
        <el-form-item label="消息渠道" prop="channels" required>
          <el-checkbox-group v-model="form.channels">
            <el-checkbox v-for="opt in MESSAGE_CHANNEL_OPTIONS" :key="opt" :value="opt">{{ opt }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="标题模板" prop="title_tpl" required>
          <el-input
            v-model="form.title_tpl"
            maxlength="60"
            placeholder="如 【待办】${bizName}待您办理"
            aria-label="请输入标题模板"
          />
        </el-form-item>
        <el-form-item label="正文模板" prop="content_tpl" required>
          <el-input
            v-model="form.content_tpl"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="支持 ${变量} 占位，如：${receiverName}，您有一项待办「${bizName}」…"
            aria-label="请输入正文模板"
          />
        </el-form-item>
        <el-form-item label="变量说明" prop="variables">
          <el-input
            v-model="form.variables"
            type="textarea"
            :rows="3"
            placeholder="逐行填写「变量名：含义」"
            aria-label="请输入变量说明"
          />
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="模板预览（示例变量）" width="560px" destroy-on-close>
      <div class="preview-block">
        <div class="preview-row">
          <span class="preview-label">消息渠道</span>
          <span>{{ joinOptions(previewData.channels) }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">标题</span>
          <span>{{ previewData.title || '--' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">正文</span>
          <span class="preview-content">{{ previewData.content || '--' }}</span>
        </div>
        <div class="preview-row">
          <span class="preview-label">变量说明</span>
          <span class="preview-vars">{{ previewData.variables || '--' }}</span>
        </div>
        <p class="preview-tip">预览使用演示示例值渲染；未在示例值中定义的变量会原样显示，便于发现漏配。</p>
      </div>
      <template #footer>
        <el-button type="primary" class="ap-btn-primary" @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.message-template-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.page-head {
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.page-tip {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-input,
.filter-select {
  width: 150px;
}

.toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.total-text {
  font-size: 14px;
  color: var(--ap-text-secondary);
}

.ap-table {
  flex: 1;
}

.empty-cell {
  color: var(--ap-text-secondary);
}

.op-divider {
  color: var(--ap-border);
  margin: 0 2px;
}

.preview-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-row {
  display: flex;
  gap: 10px;
  font-size: 14px;
  color: #1f2329;
  line-height: 1.7;
}

.preview-label {
  flex: 0 0 72px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.preview-content,
.preview-vars {
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ap-text-secondary);
}
</style>
