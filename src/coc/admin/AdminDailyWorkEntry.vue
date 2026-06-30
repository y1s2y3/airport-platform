<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Delete, Edit } from '@element-plus/icons-vue'
import {
  DANGER_WORK_FIELDS,
  MAJOR_PROJECT_FIELDS,
  DANGER_WORK_CATEGORY_OPTIONS,
  MAJOR_PROJECT_CATEGORY_OPTIONS,
  DAILY_WORK_SHEET_HINT,
  emptyDailyWorkRecord,
} from '../config/dailyWorkSchema.js'
import { parseDailyWorkFile } from '../utils/dailyWorkImport.js'
import {
  getDailyWorkRecords,
  saveDailyWorkRecord,
  removeDailyWorkRecord,
  bucketLabel,
  classifyDailyWorkRecord,
} from '../utils/dailyWorkStorage.js'

defineProps({
  title: { type: String, default: '每日作业填报' },
  description: { type: String, default: '' },
})
const keyword = ref('')
const dateFilter = ref('')
const records = ref([])
const currentPage = ref(1)
const pageSize = 10

function sourceLabel(source) {
  if (source === 'import') return '导入'
  if (source === 'seed') return '线下模板'
  return '手动'
}

const formVisible = ref(false)
const formMode = ref('create')
const form = ref(emptyDailyWorkRecord())
const includeDanger = ref(true)
const includeMajor = ref(false)

const importVisible = ref(false)
const importSheet = ref(DAILY_WORK_SHEET_HINT)
const importPreview = ref([])
const importFile = ref(null)

const filtered = computed(() => {
  let list = records.value
  if (dateFilter.value) list = list.filter((r) => r.reportDate === dateFilter.value)
  const q = keyword.value.trim()
  if (!q) return list
  return list.filter((r) =>
    [r.projectName, r.contractor, r.workArea, r.dangerWorkCategory, r.majorProjectCategory, r.leadUnit]
      .some((f) => String(f || '').includes(q)),
  )
})

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

watch([keyword, dateFilter], () => {
  currentPage.value = 1
})

function load() {
  records.value = getDailyWorkRecords()
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyDailyWorkRecord(new Date().toISOString().slice(0, 10))
  includeDanger.value = true
  includeMajor.value = false
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = { ...emptyDailyWorkRecord(), ...row }
  const cls = classifyDailyWorkRecord(row)
  includeDanger.value = cls.danger || Boolean(row.dangerWorkCategory)
  includeMajor.value = cls.major || Boolean(row.majorProjectCategory)
  formVisible.value = true
}

function validateForm() {
  const f = form.value
  if (!f.reportDate) {
    ElMessage.warning('请填写施工日期')
    return false
  }
  if (!f.leadUnit?.trim()) {
    ElMessage.warning('请填写管理单位')
    return false
  }
  if (!f.contractor?.trim()) {
    ElMessage.warning('请填写施工单位')
    return false
  }
  if (includeDanger.value) {
    if (!f.workArea?.trim() || !f.dangerWorkCategory?.trim()) {
      ElMessage.warning('危险作业侧：施工区域、作业类别为必填')
      return false
    }
    if (!f.startTime || !f.endTime) {
      ElMessage.warning('危险作业侧：作业时间为必填')
      return false
    }
  }
  if (includeMajor.value) {
    if (!f.majorProjectCategory?.trim()) {
      ElMessage.warning('危大工程侧：作业类别为必填')
      return false
    }
    if (!f.majorStartTime || !f.majorEndTime) {
      ElMessage.warning('危大工程侧：作业时间为必填')
      return false
    }
  }
  if (!includeDanger.value && !includeMajor.value) {
    ElMessage.warning('请至少勾选「危险作业」或「危大工程」其中一项')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  const payload = { ...form.value }
  if (!includeDanger.value) {
    payload.dangerWorkCategory = ''
    payload.workArea = payload.workArea || payload.majorWorkContent?.split('\n')[0] || '—'
  }
  if (!includeMajor.value) {
    payload.majorProjectCategory = ''
  }
  saveDailyWorkRecord(payload)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '已保存作业填报' : '已更新')
}

function handleDelete(row) {
  ElMessageBox.confirm('确定删除该条作业填报？关联清单将同步移除。', '提示', { type: 'warning' })
    .then(() => {
      removeDailyWorkRecord(row.id)
      load()
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

function onImportFileChange(uploadFile) {
  importFile.value = uploadFile.raw
  if (!uploadFile.raw) return
  parseDailyWorkFile(uploadFile.raw, importSheet.value)
    .then((res) => {
      importPreview.value = res.records
      importSheet.value = res.sheetName
      ElMessage.success(`已解析 Sheet「${res.sheetName}」，共 ${res.records.length} 条`)
    })
    .catch((err) => {
      importPreview.value = []
      ElMessage.error(err.message || '解析失败')
    })
}

function confirmImport() {
  if (!importPreview.value.length) {
    ElMessage.warning('没有可导入的数据')
    return
  }
  importPreview.value.forEach((r) => saveDailyWorkRecord({ ...r, source: 'import' }))
  load()
  importVisible.value = false
  importPreview.value = []
  importFile.value = null
  ElMessage.success('导入完成，已自动划分至高风险作业 / 危大工程清单')
}

function bucketTagType(bucket) {
  return { danger: 'warning', major: 'primary', both: 'danger', normal: 'info' }[bucket] || 'info'
}

function indexMethod(index) {
  return (currentPage.value - 1) * pageSize + index + 1
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>每日作业填报</span>
      <div class="title-actions">
        <el-date-picker
          v-model="dateFilter"
          type="date"
          placeholder="施工日期"
          value-format="YYYY-MM-DD"
          clearable
          class="date-filter"
        />
        <el-input v-model="keyword" placeholder="搜索项目、单位、区域、类别…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">手动添加</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入表格</el-button>
      </div>
    </div>

    <div class="panel-body page-body">
      <el-table :data="pagedRecords" stripe border empty-text="暂无填报记录，可手动添加或导入 Excel">
        <el-table-column type="index" label="序号" width="56" :index="indexMethod" />
        <el-table-column prop="reportDate" label="施工日期" width="108" />
        <el-table-column prop="projectName" label="施工项目" min-width="160" show-overflow-tooltip />
        <el-table-column prop="contractor" label="施工单位" min-width="140" show-overflow-tooltip />
        <el-table-column prop="workArea" label="施工区域" min-width="120" show-overflow-tooltip />
        <el-table-column prop="dangerWorkCategory" label="危险作业类别" width="120" show-overflow-tooltip />
        <el-table-column prop="majorProjectCategory" label="危大工程类别" width="120" show-overflow-tooltip />
        <el-table-column label="划分" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="bucketTagType(row.classifyBucket)">
              {{ bucketLabel(row.classifyBucket) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="72">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-pager">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filtered.length"
          layout="total, prev, pager, next, jumper"
          background
          small
        />
      </div>
    </div>

    <!-- 手动添加/编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '手动添加 · 每日作业填报' : '编辑作业填报'"
      width="860px"
      destroy-on-close
      top="4vh"
    >
      <el-form label-width="200px" label-position="right" class="entry-form">
        <el-form-item label="施工日期" required>
          <el-date-picker v-model="form.reportDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>

        <el-divider content-position="left">填报类型</el-divider>
        <el-form-item label="">
          <el-checkbox v-model="includeDanger">危险作业（左表）</el-checkbox>
          <el-checkbox v-model="includeMajor">危大工程（右表）</el-checkbox>
        </el-form-item>

        <el-divider content-position="left">公共信息</el-divider>
        <el-form-item label="管理单位" required>
          <el-input v-model="form.leadUnit" placeholder="如：深圳机场集团/建设工程指挥部" />
        </el-form-item>
        <el-form-item label="施工项目名称">
          <el-input v-model="form.projectName" />
        </el-form-item>
        <el-form-item label="施工单位" required>
          <el-input v-model="form.contractor" />
        </el-form-item>

        <template v-if="includeDanger">
          <el-divider content-position="left">危险作业统计（A-O 列标准）</el-divider>
          <el-form-item label="施工区域" required>
            <el-input v-model="form.workArea" />
          </el-form-item>
          <el-form-item label="当日施工具体内容">
            <el-input v-model="form.workContent" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="危险作业作业类别" required>
            <el-select v-model="form.dangerWorkCategory" filterable allow-create style="width: 100%">
              <el-option v-for="opt in DANGER_WORK_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="作业开始时间" required label-width="200px">
                <el-date-picker
                  v-model="form.startTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="作业结束时间" required label-width="120px">
                <el-date-picker
                  v-model="form.endTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item
            v-for="field in DANGER_WORK_FIELDS.filter((f) => f.key.includes('Manager') || f.key === 'dangerControlMeasures')"
            :key="field.key"
            :label="field.label.replace('*', '')"
            :required="field.required"
          >
            <el-input
              v-model="form[field.key]"
              :type="field.type === 'textarea' ? 'textarea' : 'text'"
              :rows="field.type === 'textarea' ? 4 : 1"
              :placeholder="field.key.includes('Manager') ? '格式：姓名/手机号，多人用逗号分隔' : ''"
            />
          </el-form-item>
        </template>

        <template v-if="includeMajor">
          <el-divider content-position="left">危大工程统计（Q-X 列标准）</el-divider>
          <el-form-item label="施工具体内容">
            <el-input v-model="form.majorWorkContent" type="textarea" :rows="4" />
          </el-form-item>
          <el-form-item label="危大工程作业类别" required>
            <el-select v-model="form.majorProjectCategory" filterable allow-create style="width: 100%">
              <el-option v-for="opt in MAJOR_PROJECT_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="作业开始时间" required label-width="200px">
                <el-date-picker
                  v-model="form.majorStartTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="作业结束时间" required label-width="120px">
                <el-date-picker
                  v-model="form.majorEndTime"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm"
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item
            v-for="field in MAJOR_PROJECT_FIELDS.filter((f) => f.key.includes('Manager') || f.key === 'majorControlMeasures')"
            :key="field.key"
            :label="field.label.replace('*', '')"
            :required="field.required"
          >
            <el-input
              v-model="form[field.key]"
              :type="field.type === 'textarea' ? 'textarea' : 'text'"
              :rows="field.type === 'textarea' ? 4 : 1"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存并自动划分</el-button>
      </template>
    </el-dialog>

    <!-- 导入 -->
    <el-dialog v-model="importVisible" title="导入施工作业统计表" width="720px" destroy-on-close>
      <p class="import-tip">
        支持上传与线下模板一致的 .xlsx 文件。默认解析 Sheet「{{ DAILY_WORK_SHEET_HINT }}」（或首个日期 Sheet），
        表头第 5 行、数据从第 6 行起；合并单元格的项目信息会自动向下继承。
      </p>
      <el-form inline class="import-form">
        <el-form-item label="指定 Sheet">
          <el-input v-model="importSheet" placeholder="如 2026.6.14" style="width: 160px" />
        </el-form-item>
      </el-form>
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :on-change="onImportFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">将 Excel 拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">文件：建设工程指挥部施工作业统计表.xlsx</div>
        </template>
      </el-upload>
      <div v-if="importPreview.length" class="import-preview">
        <div class="preview-head">预览（{{ importPreview.length }} 条，含自动划分）</div>
        <el-table :data="importPreview.slice(0, 8)" size="small" border max-height="240">
          <el-table-column prop="projectName" label="项目" min-width="120" show-overflow-tooltip />
          <el-table-column prop="workArea" label="区域" width="100" show-overflow-tooltip />
          <el-table-column prop="dangerWorkCategory" label="危险作业" width="100" />
          <el-table-column prop="majorProjectCategory" label="危大工程" width="100" />
        </el-table>
        <p v-if="importPreview.length > 8" class="preview-more">… 另有 {{ importPreview.length - 8 }} 条</p>
      </div>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!importPreview.length" @click="confirmImport">
          确认导入 {{ importPreview.length ? `(${importPreview.length} 条)` : '' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid var(--coc-accent);
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.date-filter {
  width: 150px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.table-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.entry-form {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 8px;
}

.import-tip {
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
  margin: 0 0 12px;
}

.import-form {
  margin-bottom: 8px;
}

.import-preview {
  margin-top: 16px;
}

.preview-head {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.preview-more {
  font-size: 12px;
  color: var(--coc-text-muted);
  margin: 8px 0 0;
}
</style>
