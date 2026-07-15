<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Delete, Edit, Setting, Download } from '@element-plus/icons-vue'
import {
  DAILY_WORK_RISK_RULES,
  buildDailyWorkRiskAlertDetails,
} from '../config/dailyWorkRiskRules.js'
import {
  getEnabledRiskRuleIds,
  saveEnabledRiskRuleIds,
} from '../utils/dailyWorkRiskRuleStorage.js'
import {
  DANGER_WORK_FIELDS,
  MAJOR_PROJECT_FIELDS,
  DANGER_WORK_CATEGORY_OPTIONS,
  MAJOR_PROJECT_CATEGORY_OPTIONS,
  DAILY_WORK_SHEET_HINT,
  emptyDailyWorkRecord,
} from '../config/dailyWorkSchema.js'
import { parseDailyWorkFile, downloadDailyWorkTemplate } from '../utils/dailyWorkImport.js'
import {
  getDailyWorkRecords,
  saveDailyWorkRecord,
  removeDailyWorkRecord,
  dangerWorkYesNoLabel,
  resolveDangerWork,
} from '../utils/dailyWorkStorage.js'

const props = defineProps({
  title: { type: String, default: '每日施工作业' },
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

const importVisible = ref(false)
const importSheet = ref(DAILY_WORK_SHEET_HINT)
const importPreview = ref([])
const importFile = ref(null)
const importRiskVisible = ref(false)
const importRiskAlerts = ref([])

const ruleConfigVisible = ref(false)
const enabledRuleIds = ref([])

const importRiskSummary = computed(() => {
  const list = importRiskAlerts.value
  const red = list.filter((item) => item.level === 'red').length
  const yellow = list.filter((item) => item.level === 'yellow').length
  return { total: list.length, red, yellow }
})

function loadRuleConfig() {
  enabledRuleIds.value = getEnabledRiskRuleIds()
}

function openRuleConfig() {
  loadRuleConfig()
  ruleConfigVisible.value = true
}

function saveRuleConfig() {
  saveEnabledRiskRuleIds(enabledRuleIds.value)
  ruleConfigVisible.value = false
  ElMessage.success('风险提醒规则已保存')
}

function resetRuleConfig() {
  enabledRuleIds.value = DAILY_WORK_RISK_RULES.filter((rule) => rule.defaultEnabled).map((rule) => rule.id)
}

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
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  form.value = { ...emptyDailyWorkRecord(), ...row }
  formVisible.value = true
}

function fieldLabel(label) {
  return String(label || '').replace(/^\*/, '')
}

function isFieldEmpty(key) {
  return !String(form.value[key] ?? '').trim()
}

function validateForm() {
  const f = form.value
  if (!f.reportDate) {
    ElMessage.warning('请填写施工日期')
    return false
  }
  for (const field of DANGER_WORK_FIELDS) {
    if (field.required && !String(f[field.key] ?? '').trim()) {
      ElMessage.warning(`请填写${fieldLabel(field.label)}`)
      return false
    }
  }
  if (String(f.majorProjectCategory ?? '').trim()) {
    for (const field of MAJOR_PROJECT_FIELDS) {
      if (field.required && !String(f[field.key] ?? '').trim()) {
        ElMessage.warning(`请填写${fieldLabel(field.label)}`)
        return false
      }
    }
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveDailyWorkRecord({ ...form.value })
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

function riskLevelLabel(level) {
  if (level === 'red') return '红色'
  if (level === 'yellow') return '黄色'
  return level || '—'
}

function riskLevelTag(level) {
  if (level === 'red') return 'danger'
  if (level === 'yellow') return 'warning'
  return 'info'
}

function evaluateImportRisks(records) {
  const ruleIds = getEnabledRiskRuleIds()
  return buildDailyWorkRiskAlertDetails(records, ruleIds)
}

function doImportRecords() {
  importPreview.value.forEach((r) => saveDailyWorkRecord({ ...r, source: 'import' }))
  load()
  importRiskVisible.value = false
  importRiskAlerts.value = []
  importVisible.value = false
  importPreview.value = []
  importFile.value = null
  ElMessage.success('导入完成')
}

function confirmImport() {
  if (!importPreview.value.length) {
    ElMessage.warning('没有可导入的数据')
    return
  }
  const alerts = evaluateImportRisks(importPreview.value)
  if (alerts.length) {
    importRiskAlerts.value = alerts
    importRiskVisible.value = true
    return
  }
  doImportRecords()
}

function cancelRiskImport() {
  importRiskVisible.value = false
  importRiskAlerts.value = []
  ElMessage.info('已取消导入，请按风险明细修改表格后重新上传')
}

function proceedRiskImport() {
  doImportRecords()
}

function handleDownloadTemplate() {
  downloadDailyWorkTemplate()
  ElMessage.success('模版已下载，请按 Sheet 填写后导入')
}

function dangerTagType(isDanger) {
  return isDanger ? 'warning' : 'info'
}

function indexMethod(index) {
  return (currentPage.value - 1) * pageSize + index + 1
}

onMounted(() => {
  load()
  loadRuleConfig()
})
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span class="title-text">{{ props.title }}</span>
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
        <el-button :icon="Download" @click="handleDownloadTemplate">下载模版</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入表格</el-button>
      </div>
      <el-button class="config-btn" :icon="Setting" @click="openRuleConfig">配置</el-button>
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
        <el-table-column label="是否危险作业" width="108" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="dangerTagType(resolveDangerWork(row))">
              {{ dangerWorkYesNoLabel(resolveDangerWork(row)) }}
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
      :title="formMode === 'create' ? '手动添加' : '编辑'"
      width="860px"
      destroy-on-close
      top="4vh"
    >
      <el-form label-width="280px" label-position="right" class="entry-form">
        <el-form-item label="施工日期" required>
          <el-date-picker v-model="form.reportDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>

        <el-form-item
          v-for="field in DANGER_WORK_FIELDS"
          :key="'danger-' + field.key"
          :label="field.label"
          :required="field.required"
        >
          <el-select
            v-if="field.key === 'dangerWorkCategory'"
            v-model="form.dangerWorkCategory"
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option v-for="opt in DANGER_WORK_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'datetime'"
            v-model="form[field.key]"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
          <el-input
            v-else
            v-model="form[field.key]"
            :type="field.type === 'textarea' ? 'textarea' : 'text'"
            :rows="field.type === 'textarea' ? 4 : 1"
          />
        </el-form-item>

        <el-form-item
          v-for="field in MAJOR_PROJECT_FIELDS"
          :key="'major-' + field.key"
          :label="field.label"
          :required="field.required && !isFieldEmpty('majorProjectCategory')"
        >
          <el-select
            v-if="field.key === 'majorProjectCategory'"
            v-model="form.majorProjectCategory"
            filterable
            allow-create
            clearable
            style="width: 100%"
          >
            <el-option v-for="opt in MAJOR_PROJECT_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'datetime'"
            v-model="form[field.key]"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
          <el-input
            v-else
            v-model="form[field.key]"
            :type="field.type === 'textarea' ? 'textarea' : 'text'"
            :rows="field.type === 'textarea' ? 4 : 1"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入 -->
    <el-dialog v-model="importVisible" title="导入施工作业统计表" width="720px" destroy-on-close>
      <p class="import-tip">
        请使用与线下统计表一致的 Excel 结构。
        <el-button link type="primary" @click="handleDownloadTemplate">下载导入模版</el-button>
      </p>
      <el-form inline class="import-form">
        <el-form-item label="指定 Sheet">
          <el-input v-model="importSheet" placeholder="如 2026.6.30" style="width: 160px" />
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
      </el-upload>
      <div v-if="importPreview.length" class="import-preview">
        <div class="preview-head">预览（{{ importPreview.length }} 条）</div>
        <el-table :data="importPreview.slice(0, 8)" size="small" border max-height="240">
          <el-table-column prop="projectName" label="项目" min-width="120" show-overflow-tooltip />
          <el-table-column prop="workArea" label="区域" width="100" show-overflow-tooltip />
          <el-table-column prop="dangerWorkCategory" label="危险作业类别" width="110" show-overflow-tooltip />
          <el-table-column label="是否危险作业" width="108" align="center">
            <template #default="{ row }">
              {{ dangerWorkYesNoLabel(resolveDangerWork(row)) }}
            </template>
          </el-table-column>
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

    <el-dialog v-model="ruleConfigVisible" title="风险提醒规则配置" width="760px" destroy-on-close>
      <p class="rule-config-tip">勾选启用的规则。规则名称作为选项，风险描述供参考；具体计算逻辑见代码 `dailyWorkRiskRules.js`。</p>
      <el-checkbox-group v-model="enabledRuleIds" class="rule-config-list">
        <div v-for="rule in DAILY_WORK_RISK_RULES" :key="rule.id" class="rule-config-item">
          <el-checkbox :label="rule.id">{{ rule.name }}</el-checkbox>
          <p class="rule-config-desc">{{ rule.description }}</p>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="resetRuleConfig">恢复默认</el-button>
        <el-button @click="ruleConfigVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRuleConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 导入风险确认：命中配置页启用的风险项时，需确认是否继续导入 -->
    <el-dialog
      v-model="importRiskVisible"
      title="导入风险确认"
      width="920px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="importRiskAlerts = []"
    >
      <div class="import-risk-banner">
        已按「风险提醒规则配置」校验，共发现
        <strong>{{ importRiskSummary.total }}</strong> 条风险
        <template v-if="importRiskSummary.red">
          （红色 <strong class="risk-red">{{ importRiskSummary.red }}</strong>）
        </template>
        <template v-if="importRiskSummary.yellow">
          （黄色 <strong class="risk-yellow">{{ importRiskSummary.yellow }}</strong>）
        </template>
        。请核对明细后，确认是否仍要导入。
      </div>
      <el-table :data="importRiskAlerts" border size="small" max-height="420" class="import-risk-table">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column label="风险等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="riskLevelTag(row.level)" size="small">{{ riskLevelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ruleName" label="风险项" min-width="160" show-overflow-tooltip />
        <el-table-column prop="message" label="风险说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="对应数据" min-width="280">
          <template #default="{ row }">
            <div class="risk-data-cell">
              <div v-for="(line, idx) in String(row.dataSummary || '').split('\n')" :key="idx">
                {{ line }}
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="cancelRiskImport">取消导入</el-button>
        <el-button type="warning" @click="proceedRiskImport">仍要导入</el-button>
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

.title-text {
  flex-shrink: 0;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}

.config-btn {
  margin-left: auto;
  flex-shrink: 0;
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

.import-form {
  margin-bottom: 8px;
}

.import-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--coc-text-muted);
  line-height: 1.6;
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

.rule-config-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--coc-text-muted);
  line-height: 1.6;
}

.rule-config-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 58vh;
  overflow-y: auto;
  padding-right: 4px;
}

.rule-config-item {
  padding: 12px 14px;
  border: 1px solid var(--coc-border, #e4e7ed);
  border-radius: 8px;
  background: #fafbfd;
}

.rule-config-item :deep(.el-checkbox__label) {
  font-size: 14px;
  font-weight: 600;
  color: var(--coc-text, #303133);
  white-space: normal;
  line-height: 1.5;
}

.rule-config-desc {
  margin: 6px 0 0 24px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--coc-text-muted, #606266);
}

.import-risk-banner {
  margin: 0 0 12px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--coc-text, #303133);
  background: #fff8e6;
  border: 1px solid #f5dab1;
  border-radius: 6px;
}

.risk-red {
  color: #f56c6c;
}

.risk-yellow {
  color: #e6a23c;
}

.import-risk-table {
  width: 100%;
}

.risk-data-cell {
  font-size: 12px;
  line-height: 1.55;
  color: var(--coc-text-muted, #606266);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
