<script setup>
/**
 * 版本通知（指挥部 · 系统管理）
 * 筛选：机型 / 版本号 / 是否强制更新 / 版本发布时间
 * 台账：版本号、机型、下载地址、是否强制更新、版本发布时间；支持新增、编辑、删除
 */
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listVersionNotices,
  createEmptyVersionNotice,
  cloneVersionNotice,
  saveVersionNotice,
  removeVersionNotice,
  forceUpdateLabel,
  forceUpdateTagType,
  VERSION_DEVICE_OPTIONS,
  VERSION_FORCE_UPDATE_OPTIONS,
} from '../../mock/versionNotice'

const filterForm = ref({
  device_model: '',
  version_no: '',
  force_update: '',
  release_time: '',
})

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyVersionNotice())

const dialogTitle = computed(() => (editingId.value ? '编辑版本' : '新增版本'))

const rules = {
  version_no: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { max: 30, message: '版本号不超过 30 个字符', trigger: 'blur' },
  ],
  device_model: [{ required: true, message: '请选择机型', trigger: 'change' }],
  download_url: [
    { required: true, message: '请输入下载地址', trigger: 'blur' },
    { max: 200, message: '下载地址不超过 200 个字符', trigger: 'blur' },
  ],
  release_time: [{ required: true, message: '请选择版本发布时间', trigger: 'change' }],
}

/** 检索条件仅在点击「搜索」时生效 */
const appliedFilter = ref({ ...filterForm.value })

const filteredList = computed(() => {
  const { device_model, version_no, force_update, release_time } = appliedFilter.value
  return listVersionNotices().filter((row) => {
    if (device_model && row.device_model !== device_model) return false
    if (version_no && !String(row.version_no || '').toLowerCase().includes(version_no.trim().toLowerCase())) return false
    if (force_update !== '' && Boolean(row.force_update) !== force_update) return false
    if (release_time && row.release_time !== release_time) return false
    return true
  })
})

function handleSearch() {
  appliedFilter.value = { ...filterForm.value }
}

function handleReset() {
  filterForm.value = { device_model: '', version_no: '', force_update: '', release_time: '' }
  appliedFilter.value = { ...filterForm.value }
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyVersionNotice()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = cloneVersionNotice(row)
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除版本「${row.version_no}」（${row.device_model}）？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeVersionNotice(row.id)
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
    const res = saveVersionNotice(form.value, editingId.value || undefined)
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
  <div class="version-notice-page page-card">
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">机型</span>
        <el-select
          v-model="filterForm.device_model"
          class="filter-select"
          placeholder="请选择机型"
          clearable
          aria-label="请选择机型"
        >
          <el-option v-for="opt in VERSION_DEVICE_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
        <span class="field-label">版本号</span>
        <el-input
          v-model="filterForm.version_no"
          class="filter-input"
          placeholder="请输入版本号"
          clearable
          @keyup.enter="handleSearch"
          aria-label="请输入版本号"
        />
        <span class="field-label">是否强制更新</span>
        <el-select
          v-model="filterForm.force_update"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择是否强制更新"
        >
          <el-option
            v-for="opt in VERSION_FORCE_UPDATE_OPTIONS"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span class="field-label">版本发布时间</span>
        <el-date-picker
          v-model="filterForm.release_time"
          class="filter-date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择日期"
          style="width: 130px"
          aria-label="请选择版本发布时间"
        />
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
      <el-table-column prop="version_no" label="版本号" min-width="160" />
      <el-table-column prop="device_model" label="机型" width="140" align="center" />
      <el-table-column prop="download_url" label="下载地址" min-width="300" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.download_url">{{ row.download_url }}</span>
          <span v-else class="empty-cell">--</span>
        </template>
      </el-table-column>
      <el-table-column label="是否强制更新" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="forceUpdateTagType(row.force_update)" effect="plain">
            {{ forceUpdateLabel(row.force_update) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="release_time" label="版本发布时间" width="140" align="center">
        <template #default="{ row }">{{ row.release_time || '--' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="版本号" prop="version_no" required>
          <el-input
            v-model="form.version_no"
            placeholder="如 v2.11.1.26"
            maxlength="30"
            aria-label="请输入版本号"
          />
        </el-form-item>
        <el-form-item label="机型" prop="device_model" required>
          <el-select v-model="form.device_model" placeholder="请选择机型" style="width: 100%" aria-label="请选择机型">
            <el-option v-for="opt in VERSION_DEVICE_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="下载地址" prop="download_url" required>
          <el-input
            v-model="form.download_url"
            placeholder="请输入安装包下载地址"
            maxlength="200"
            aria-label="请输入下载地址"
          />
        </el-form-item>
        <el-form-item label="是否强制更新" prop="force_update">
          <el-radio-group v-model="form.force_update">
            <el-radio :value="true">是</el-radio>
            <el-radio :value="false">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="版本发布时间" prop="release_time" required>
          <el-date-picker
            v-model="form.release_time"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择日期"
            style="width: 100%"
            aria-label="请选择版本发布时间"
          />
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
.version-notice-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
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

.filter-input {
  width: 130px;
}

.filter-select {
  width: 120px;
}

.filter-date {
  /* 宽度以内联样式为准（Element Plus 日期选择器默认 220px 变量优先级较高） */
  width: 130px;
}

/* 搜索 / 重置 作为整体换行，避免两按钮被拆到两行 */
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
