<script setup>
/**
 * 风险类型配置（项目级）
 * 所有风险类型在此维护；配置库与风险点管控登记均从此选择。
 * 默认含招标机场特有类型，以及高处坠落等通用类型。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  formatRiskCell,
  listAirportRiskSources,
  removeAirportRiskSource,
  saveAirportRiskSource,
} from '../../mock/riskManage.js'

const { laborProjectId, isHqSelected } = useCurrentProject()

const keyword = ref('')
const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({ source_name: '' })

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listAirportRiskSources(laborProjectId.value, keyword.value)
})

watch(laborProjectId, () => {
  keyword.value = ''
})

function resetFilters() {
  keyword.value = ''
}

function openAdd() {
  editingId.value = ''
  form.source_name = ''
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.source_name = row.source_name || ''
  dialogVisible.value = true
}

function handleSubmit() {
  const r = saveAirportRiskSource(laborProjectId.value, {
    id: editingId.value,
    source_name: form.source_name,
  })
  if (!r.ok) {
    ElMessage.warning(r.msg)
    return
  }
  ElMessage.success(editingId.value ? '已保存' : '已新增')
  dialogVisible.value = false
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除风险类型「${row.source_name}」？`, '提示', { type: 'warning' })
    .then(() => {
      const r = removeAirportRiskSource(laborProjectId.value, row.id)
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
        <div class="page-breadcrumb">风险管理 / 风险类型配置</div>
        <h3 class="page-title">风险类型配置</h3>
        <p class="page-tip">
          在此维护本项目全部风险类型。默认含招标要求的不停航施工、净空保护、地下管线（航油、通信、导航）保护、空防安全，以及高处坠落等通用类型，可增删改。风险配置库与风险辨识登记均从此选择；被引用时不可删除。
        </p>
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
        <el-input
          v-model="keyword"
          clearable
          placeholder="风险类型名称"
          style="width: 240px"
          aria-label="风险类型名称"
        />
        <el-button type="primary" @click="() => {}">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="openAdd">+ 新增</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="source_name" label="风险类型名称" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.source_name) }}</template>
        </el-table-column>
        <el-table-column prop="creator" label="创建人" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.creator) }}</template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="140" align="center">
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
      :title="editingId ? '编辑风险类型' : '新增风险类型'"
      width="480px"
      destroy-on-close
    >
      <el-form label-width="120px">
        <el-form-item label="风险类型名称" required>
          <el-input
            v-model="form.source_name"
            maxlength="50"
            show-word-limit
            placeholder="请输入风险类型名称"
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
  margin-bottom: 8px;
}
.page-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
}
.page-tip {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}
.mb-16 {
  margin-bottom: 16px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.toolbar-spacer {
  flex: 1;
}
</style>
