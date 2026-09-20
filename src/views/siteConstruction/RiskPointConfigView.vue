<script setup>
/**
 * 风险点管控配置库（项目级）
 * 风险类型从「风险类型配置」选择；本页维护风险点、细分和管控措施。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  formatRiskCell,
  listConfigRiskTypes,
  listRiskPointConfigs,
  removeRiskPointConfig,
  saveRiskPointConfig,
} from '../../mock/riskManage.js'

const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  risk_type: '',
  risk_point: '',
})

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({
  risk_type: '',
  risk_point: '',
  risk_segment: '',
  risk_desc: '',
  control_measure: '',
})

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointConfigs(laborProjectId.value, {
    risk_type: filters.risk_type,
    risk_point: filters.risk_point,
  })
})

const filterTypeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))
const typeInputOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

watch(laborProjectId, () => {
  filters.risk_type = ''
  filters.risk_point = ''
})

function resetFilters() {
  filters.risk_type = ''
  filters.risk_point = ''
}

function resetForm() {
  editingId.value = ''
  form.risk_type = ''
  form.risk_point = ''
  form.risk_segment = ''
  form.risk_desc = ''
  form.control_measure = ''
}

function openAdd() {
  if (!laborProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!typeInputOptions.value.length) {
    ElMessage.warning('请先在「风险类型配置」维护至少一条风险类型')
    return
  }
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.risk_type = row.risk_type || ''
  form.risk_point = row.risk_point || ''
  form.risk_segment = row.risk_segment || ''
  form.risk_desc = row.risk_desc || ''
  form.control_measure = row.control_measure || ''
  dialogVisible.value = true
}

function doSave(allowDuplicate = false) {
  return saveRiskPointConfig(
    laborProjectId.value,
    {
      id: editingId.value || undefined,
      risk_type: form.risk_type,
      risk_point: form.risk_point,
      risk_segment: form.risk_segment,
      risk_desc: form.risk_desc,
      control_measure: form.control_measure,
      allowDuplicate,
    },
    '系统管理员',
  )
}

function handleSubmit() {
  const r = doSave(false)
  if (!r.ok && r.code === 'DUPLICATE_TYPE_POINT') {
    ElMessageBox.confirm(r.msg, '提示', { type: 'warning', confirmButtonText: '仍要保存', cancelButtonText: '取消' })
      .then(() => {
        const r2 = doSave(true)
        if (!r2.ok) {
          ElMessage.warning(r2.msg)
          return
        }
        ElMessage.success(editingId.value ? '已保存' : '已新增')
        dialogVisible.value = false
      })
      .catch(() => {})
    return
  }
  if (!r.ok) {
    ElMessage.warning(r.msg)
    return
  }
  ElMessage.success(editingId.value ? '已保存' : '已新增')
  dialogVisible.value = false
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除风险点「${row.risk_point}」？`, '提示', { type: 'warning' })
    .then(() => {
      const r = removeRiskPointConfig(laborProjectId.value, row.id)
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('已删除')
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点管控配置库</div>
        <h3 class="page-title">风险点管控配置库</h3>
        <p class="page-tip">维护本项目风险点、细分与管控措施；风险类型须先在「风险类型配置」中维护，再从此处选择。</p>
      </div>
      <span class="total-count">共 {{ tableData.length }} 条</span>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="info"
      :closable="false"
      show-icon
      title="本功能仅项目级可用，请先在顶部切换到具体项目。"
      class="mb-16"
    />

    <template v-else>
      <div class="toolbar">
        <el-select
          v-model="filters.risk_type"
          clearable
          filterable
          placeholder="风险类型"
          style="width: 180px"
          aria-label="风险类型"
        >
          <el-option v-for="t in filterTypeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <el-input
          v-model="filters.risk_point"
          clearable
          placeholder="风险点"
          style="width: 220px"
          aria-label="风险点"
        />
        <el-button type="primary" @click="() => {}">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="openAdd">+ 新增</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无配置">
        <el-table-column prop="risk_type" label="风险类型" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_type) }}</template>
        </el-table-column>
        <el-table-column prop="risk_point" label="风险点" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_point) }}</template>
        </el-table-column>
        <el-table-column prop="risk_segment" label="风险细分" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_segment) }}</template>
        </el-table-column>
        <el-table-column prop="risk_desc" label="风险描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_desc) }}</template>
        </el-table-column>
        <el-table-column prop="control_measure" label="管控措施" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.control_measure) }}</template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="100" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.creator) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑管控措施' : '新增管控措施'"
      width="560px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form label-width="100px" class="config-form">
        <el-form-item label="风险类型" required>
          <el-select
            v-model="form.risk_type"
            filterable
            placeholder="请从风险类型配置选择"
            style="width: 100%"
          >
            <el-option v-for="t in typeInputOptions" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险点" required>
          <el-input v-model="form.risk_point" maxlength="100" show-word-limit placeholder="请输入风险点" />
        </el-form-item>
        <el-form-item label="风险细分" required>
          <el-input v-model="form.risk_segment" maxlength="100" show-word-limit placeholder="请输入风险细分" />
        </el-form-item>
        <el-form-item label="风险描述">
          <el-input
            v-model="form.risk_desc"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="选填"
          />
        </el-form-item>
        <el-form-item label="管控措施" required>
          <el-input
            v-model="form.control_measure"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="请输入管控措施"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.page-title {
  margin: 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.total-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  padding-top: 8px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.toolbar-spacer {
  flex: 1;
}
.mb-16 {
  margin-bottom: 16px;
}
.ap-table {
  font-size: 13px;
}
.config-form :deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>
