<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Refresh, Search, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  batchDisposeWarningCenter,
  listPersonalWarningCenter,
  syncMajorHazardWarningCenter,
} from '../../mock/personalCenter.js'

const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const refreshTick = ref(0)
const selection = ref([])
const page = ref(1)
const pageSize = ref(10)
const disposeVisible = ref(false)
const submitting = ref(false)
const disposeForm = reactive({ note: '', files: [] })
const filters = reactive({ status: '', keyword: '' })

const sourceRows = computed(() => {
  void refreshTick.value
  return listPersonalWarningCenter({ includeAllMajorHazardExamples: true }).filter((row) => (
    row.module === '危大工程管理' && row.majorHazardProjectId === projectId.value
  ))
})

const filteredRows = computed(() => {
  let rows = [...sourceRows.value]
  if (filters.status) {
    rows = rows.filter((row) => (filters.status === '未处理' ? row.status === '待处理' : row.status === '已关闭'))
  }
  const keyword = filters.keyword.trim()
  if (keyword) rows = rows.filter((row) => String(row.sourceName || '').includes(keyword))
  return rows.sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')))
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

function displayStatus(row) {
  return row.status === '已关闭' ? '已处理' : '未处理'
}

function statusType(row) {
  return row.status === '已关闭' ? 'success' : 'danger'
}

function search() {
  page.value = 1
  ElMessage.success(`查询完成，共 ${filteredRows.value.length} 条异常`)
}

function reset() {
  filters.status = ''
  filters.keyword = ''
  page.value = 1
}

function goBack() {
  router.push('/major-hazard/calendar')
}

function openDetail(row) {
  router.push({
    path: '/personal-center/todo/handle',
    query: { id: row.id, from: 'warning-center' },
  })
}

function selectable(row) {
  return row.status === '待处理'
}

function openBatchDispose() {
  const pending = selection.value.filter((row) => row.status === '待处理')
  if (!pending.length) return ElMessage.warning('请先勾选需要处置的未处理异常')
  disposeForm.note = ''
  disposeForm.files = []
  disposeVisible.value = true
}

function onFileChange(_file, files) {
  disposeForm.files = files
}

async function confirmBatchDispose() {
  const note = disposeForm.note.trim()
  if (!note) return ElMessage.warning('请填写处置说明')
  await ElMessageBox.confirm('确认将所选异常批量处置并关闭？', '批量处置异常', {
    type: 'warning',
    confirmButtonText: '确认处置',
    cancelButtonText: '取消',
  })
  submitting.value = true
  try {
    const count = batchDisposeWarningCenter(selection.value.map((row) => row.id), {
      disposal_result: '已处理',
      content: note,
      attachments: disposeForm.files.map((file) => file.name || file),
      operator: '张明',
    })
    disposeVisible.value = false
    selection.value = []
    syncMajorHazardWarningCenter()
    refreshTick.value += 1
    if (!count) return ElMessage.warning('没有可处置的未处理异常')
    ElMessage.success(`已批量处置 ${count} 条异常`)
  } finally {
    submitting.value = false
  }
}

watch(projectId, () => {
  selection.value = []
  page.value = 1
  syncMajorHazardWarningCenter()
}, { immediate: true })
</script>

<template>
  <div class="alert-ledger-page page-card">
    <template v-if="projectId">
      <div class="page-toolbar">
        <div class="title-wrap">
          <el-button :icon="ArrowLeft" size="small" @click="goBack">返回日历</el-button>
          <div>
            <h1>危大工程异常跟踪</h1>
            <p>当前项目：{{ headerProjectLabel }}</p>
          </div>
        </div>
      </div>

      <div class="filter-panel">
        <span class="filter-label">处理状态</span>
        <el-select v-model="filters.status" clearable placeholder="请选择" style="width: 150px">
          <el-option label="未处理" value="未处理" />
          <el-option label="已处理" value="已处理" />
        </el-select>
        <span class="filter-label">危大工程名称</span>
        <el-input v-model="filters.keyword" clearable placeholder="请输入危大工程名称" style="width: 260px" @keyup.enter="search" />
        <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <div class="table-toolbar">
        <span>共 {{ filteredRows.length }} 条异常</span>
        <el-button type="danger" plain @click="openBatchDispose">批量处置</el-button>
      </div>

      <el-table
        :data="pagedRows"
        border
        stripe
        row-key="id"
        empty-text="当前条件下暂无异常"
        @selection-change="(rows) => (selection = rows)"
      >
        <el-table-column type="selection" width="48" :selectable="selectable" />
        <el-table-column prop="sourceName" label="危大工程名称" min-width="190" show-overflow-tooltip />
        <el-table-column prop="location" label="施工部位" min-width="150" show-overflow-tooltip />
        <el-table-column prop="alertType" label="异常类型" width="120" />
        <el-table-column prop="description" label="异常内容" min-width="280" show-overflow-tooltip />
        <el-table-column prop="handler" label="处置人" width="120" />
        <el-table-column label="处理状态" width="100" align="center">
          <template #default="{ row }"><el-tag :type="statusType(row)" size="small">{{ displayStatus(row) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="time" label="消息时间" width="170" />
        <el-table-column label="操作" width="88" fixed="right" align="center">
          <template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">详情</el-button></template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filteredRows.length"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>

      <el-dialog v-model="disposeVisible" title="批量处置异常" width="540px" destroy-on-close>
        <el-form label-width="88px">
          <el-form-item label="处置结果"><el-tag type="success">已处理</el-tag></el-form-item>
          <el-form-item label="处置说明" required>
            <el-input v-model="disposeForm.note" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="请说明现场处理措施及当前处理结果" />
          </el-form-item>
          <el-form-item label="处置附件">
            <el-upload :auto-upload="false" multiple :file-list="disposeForm.files" :on-change="onFileChange">
              <el-button :icon="Upload" size="small">上传附件</el-button>
            </el-upload>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="disposeVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="confirmBatchDispose">确认处置并关闭</el-button>
        </template>
      </el-dialog>
    </template>
    <el-empty v-else description="危大工程异常跟踪仅支持项目级使用，请切换至具体项目。" />
  </div>
</template>

<style scoped>
.alert-ledger-page{padding:20px 24px 32px}.page-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.title-wrap{display:flex;align-items:center;gap:14px}.title-wrap h1{margin:0 0 5px;font-size:20px}.title-wrap p{margin:0;color:var(--ap-text-muted);font-size:13px}.filter-panel{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:16px;padding:16px;border:1px solid var(--ap-border-color,#ebeef5);border-radius:8px;background:#fafbfc}.filter-label{color:var(--ap-text-secondary);font-size:13px}.table-toolbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:var(--ap-text-secondary);font-size:13px}.pager{display:flex;justify-content:flex-end;margin-top:16px}
</style>
