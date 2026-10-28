<script setup>
/**
 * 消息分类（指挥部 · 流程管理 → 消息模板）
 * 通知消息的分类字典：筛选（分类名称 / 消息渠道 / 启用状态）+ 台账 + 新增 / 编辑 / 删除
 * 删除前校验：若已被消息模板引用则拦截
 * 2026-10-28：支持 `embedded` 模式（作为「消息模板」页内 Tab 内容时隐藏自带页头与卡片内边距）
 */
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listMessageClassifies,
  createEmptyMessageClassify,
  cloneMessageClassify,
  saveMessageClassify,
  removeMessageClassify,
  enabledLabel,
  enabledTagType,
  joinOptions,
  MESSAGE_CHANNEL_OPTIONS,
} from '../../mock/flowManage'

defineProps({
  /** 作为 Tab 内容嵌入时：隐藏自带页头、去掉卡片自身内边距 */
  embedded: { type: Boolean, default: false },
})

const filterForm = ref({
  keyword: '',
  channel: '',
  enabled: '',
})

/** 检索条件仅在点击「搜索」时生效 */
const appliedFilter = ref({ ...filterForm.value })

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyMessageClassify())

const dialogTitle = computed(() => (editingId.value ? '编辑消息分类' : '新增消息分类'))

const rules = {
  classify_name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 30, message: '分类名称不超过 30 个字符', trigger: 'blur' },
  ],
  classify_code: [
    { required: true, message: '请输入分类编码', trigger: 'blur' },
    { max: 40, message: '分类编码不超过 40 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]+$/, message: '分类编码仅支持字母、数字与下划线', trigger: 'blur' },
  ],
  channels: [{ required: true, type: 'array', min: 1, message: '请至少选择一个消息渠道', trigger: 'change' }],
  remark: [{ max: 100, message: '备注不超过 100 个字符', trigger: 'blur' }],
}

const filteredList = computed(() => {
  const { keyword, channel, enabled } = appliedFilter.value
  return listMessageClassifies().filter((row) => {
    if (keyword) {
      const kw = keyword.trim().toLowerCase()
      const hit =
        String(row.classify_name || '').toLowerCase().includes(kw) ||
        String(row.classify_code || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    if (channel && !(row.channels || []).includes(channel)) return false
    if (enabled !== '' && Boolean(row.enabled) !== enabled) return false
    return true
  })
})

function handleSearch() {
  appliedFilter.value = { ...filterForm.value }
}

function handleReset() {
  filterForm.value = { keyword: '', channel: '', enabled: '' }
  appliedFilter.value = { ...filterForm.value }
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyMessageClassify()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = cloneMessageClassify(row)
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除消息分类「${row.classify_name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeMessageClassify(row.id)
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
    const res = saveMessageClassify(form.value, editingId.value || undefined)
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
  <div class="message-classify-page" :class="embedded ? 'is-embedded' : 'page-card'">
    <div v-if="!embedded" class="page-head">
      <h1 class="page-title">消息分类</h1>
      <p class="page-tip">维护通知消息的分类字典，供消息模板归属；已被模板引用的分类不可删除。</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">分类名称</span>
        <el-input
          v-model="filterForm.keyword"
          class="filter-input"
          placeholder="名称或编码"
          clearable
          aria-label="请输入分类名称或编码"
          @keyup.enter="handleSearch"
        />
        <span class="field-label">消息渠道</span>
        <el-select
          v-model="filterForm.channel"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择消息渠道"
        >
          <el-option v-for="opt in MESSAGE_CHANNEL_OPTIONS" :key="opt" :label="opt" :value="opt" />
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
      <el-table-column prop="classify_name" label="分类名称" min-width="150" />
      <el-table-column prop="classify_code" label="分类编码" min-width="170" />
      <el-table-column label="消息渠道" min-width="200">
        <template #default="{ row }">{{ joinOptions(row.channels) }}</template>
      </el-table-column>
      <el-table-column label="启用状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="enabledTagType(row.enabled)" effect="plain">{{ enabledLabel(row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort_no" label="排序号" width="90" align="center" />
      <el-table-column label="备注" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.remark">{{ row.remark }}</span>
          <span v-else class="empty-cell">--</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="分类名称" prop="classify_name" required>
          <el-input v-model="form.classify_name" placeholder="如 待办提醒" maxlength="30" aria-label="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="classify_code" required>
          <el-input v-model="form.classify_code" placeholder="如 TODO_REMIND" maxlength="40" aria-label="请输入分类编码" />
        </el-form-item>
        <el-form-item label="消息渠道" prop="channels" required>
          <el-checkbox-group v-model="form.channels">
            <el-checkbox v-for="opt in MESSAGE_CHANNEL_OPTIONS" :key="opt" :value="opt">{{ opt }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="排序号" prop="sort_no">
          <el-input-number v-model="form.sort_no" :min="0" :max="9999" :step="10" aria-label="请输入排序号" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" maxlength="100" placeholder="选填" aria-label="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.message-classify-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

/* Tab 内嵌模式：卡片与内边距由外层页提供 */
.message-classify-page.is-embedded {
  padding: 0;
  min-height: 0;
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
  width: 140px;
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
</style>
