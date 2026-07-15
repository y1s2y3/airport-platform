<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, View, Upload, Download, Delete } from '@element-plus/icons-vue'
import { buildProjects, HAZARD_REPORTERS } from '../../coc/mock/data.js'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  getSupervisionMeetings,
  saveSupervisionMeetingWithHazards,
  emptySupervisionMeeting,
  getSupervisionHazardsByMeeting,
} from '../../utils/cocAdminDeviceStorage.js'
import {
  parseSupervisionMeetingMinutes,
  isSupervisionWordFileName,
} from '../../utils/supervisionMeetingParser.js'
import { downloadSupervisionMeetingMinutesTemplate } from '../../utils/supervisionMeetingTemplate.js'
import SupervisionHazardListPanel from './SupervisionHazardListPanel.vue'

defineProps({
  title: { type: String, default: '监理会议管理' },
  description: { type: String, default: '' },
})

const { isHqSelected, headerProjectLabel, selectedProjectId } = useCurrentProject()

const activeTab = ref('meeting')
const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const form = ref(emptySupervisionMeeting())
const current = ref(null)
const parsedHazards = ref([])
const parsing = ref(false)
const parseError = ref('')
const hazardPanelRef = ref(null)
const detailHazards = ref([])
const hazardLevels = ['一般', '较大', '重大']
const rectifierOptions = HAZARD_REPORTERS

const showHazardEditor = computed(
  () =>
    form.value.parseStatus === 'success' ||
    form.value.parseStatus === 'failed' ||
    parsedHazards.value.length > 0,
)

function createManualHazard(overrides = {}) {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return {
    hazardType: 'safety',
    description: '',
    hazardLevel: '一般',
    rectifier: rectifierOptions[0] || '',
    hazardDeadline: d.toISOString().slice(0, 10),
    source: '人工登记',
    rectifyStatus: '待整改',
    ...overrides,
  }
}

function addManualHazard() {
  parsedHazards.value = [...parsedHazards.value, createManualHazard()]
}

function removeParsedHazard(index) {
  parsedHazards.value = parsedHazards.value.filter((_, i) => i !== index)
}

const projectOptions = buildProjects().map((p) => ({
  id: p.id,
  shortName: p.shortName || p.name,
  dept: `${p.shortName || p.name}项目部`,
}))

const scopeProjectName = computed(() => (isHqSelected.value ? '' : headerProjectLabel.value))

const filtered = computed(() => {
  let rows = list.value
  if (scopeProjectName.value) {
    rows = rows.filter((row) => row.projectName === scopeProjectName.value)
  }
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.projectDept,
      row.projectName,
      row.meetingDate,
      row.pmAttendees,
      row.directorAttendees,
      row.remark,
      parseStatusLabel(row.parseStatus),
    ].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getSupervisionMeetings()
  hazardPanelRef.value?.reload?.()
}

function resolveProjectDept(projectName) {
  const matched = projectOptions.find((p) => p.shortName === projectName)
  return matched?.dept || `${projectName}项目部`
}

function resolveProjectId(projectName) {
  const matched = projectOptions.find((p) => p.shortName === projectName)
  return matched?.id || selectedProjectId.value
}

function openCreate() {
  const projectName = scopeProjectName.value || ''
  form.value = emptySupervisionMeeting({
    projectName,
    projectId: resolveProjectId(projectName),
    projectDept: resolveProjectDept(projectName),
    parseStatus: 'pending',
  })
  parsedHazards.value = []
  parseError.value = ''
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptySupervisionMeeting(row)
  parsedHazards.value = getSupervisionHazardsByMeeting(row.id)
  parseError.value = row.parseStatus === 'failed' ? '上次保存为解析失败状态，可重新上传或继续编辑隐患清单' : ''
  formVisible.value = true
}

function openDetail(row) {
  current.value = row
  detailHazards.value = getSupervisionHazardsByMeeting(row.id)
  detailVisible.value = true
}

function isNotHeld(record) {
  return String(record.remark || '').includes('未召开')
}

function assignUploadFile(field, uploadFile) {
  form.value[field] = uploadFile.name || ''
  return false
}

function handleWordUpload(uploadFile) {
  const fileName = uploadFile.name || ''
  if (!isSupervisionWordFileName(fileName)) {
    ElMessage.error('仅支持上传 .doc 或 .docx 格式的监理例会纪要，请重新选择文件')
    return false
  }

  form.value.minutesWord = fileName
  if (isNotHeld(form.value)) return false

  parsing.value = true
  parseError.value = ''
  form.value.parseStatus = 'parsing'
  parsedHazards.value = []

  window.setTimeout(() => {
    const result = parseSupervisionMeetingMinutes(
      form.value.minutesWord,
      form.value.projectName || scopeProjectName.value,
    )
    form.value.pmAttendees = result.pmAttendees
    form.value.directorAttendees = result.directorAttendees
    form.value.parseStatus = result.parseStatus
    form.value.parsedAt = result.parsedAt
    parsedHazards.value = result.hazards || []
    parseError.value = result.parseError || ''
    parsing.value = false

    if (result.parseStatus === 'failed') {
      ElMessage.error(result.parseError || '文档解析失败，请重新上传或手动录入隐患清单')
    } else {
      ElMessage.success(result.summary || '附件解析完成')
    }
  }, 600)

  return false
}

function parseStatusLabel(status) {
  const map = {
    success: '已解析',
    pending: '待解析',
    parsing: '解析中',
    skipped: '未解析',
    failed: '解析失败',
  }
  return map[status] || status || '—'
}

function parseStatusTag(status) {
  const map = {
    success: 'success',
    pending: 'info',
    parsing: 'warning',
    skipped: 'info',
    failed: 'danger',
  }
  return map[status] || 'info'
}

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function validateForm() {
  if (!form.value.projectName?.trim()) {
    ElMessage.warning('请确认项目名称')
    return false
  }
  if (!form.value.meetingDate) {
    ElMessage.warning('请选择召开日期')
    return false
  }
  const notHeld = isNotHeld(form.value)
  if (notHeld) {
    if (!form.value.remark?.trim()) {
      ElMessage.warning('未召开会议须在备注中注明原因')
      return false
    }
    return true
  }
  if (!form.value.minutesWord?.trim()) {
    ElMessage.warning('请上传监理例会纪要 Word 附件（仅支持 .doc / .docx）')
    return false
  }
  if (!isSupervisionWordFileName(form.value.minutesWord)) {
    ElMessage.error('纪要附件格式不正确，仅支持 .doc / .docx')
    return false
  }
  if (form.value.parseStatus === 'parsing') {
    ElMessage.warning('附件正在解析，请稍候')
    return false
  }
  if (form.value.parseStatus === 'failed') {
    if (!parsedHazards.value.length) {
      ElMessage.warning('文档解析失败：请重新上传符合模版的 Word，或点击「手动新增隐患」补录后再保存')
      return false
    }
    const incomplete = parsedHazards.value.some((h) => !String(h.description || '').trim())
    if (incomplete) {
      ElMessage.warning('请完善手动录入的隐患描述')
      return false
    }
    return true
  }
  if (form.value.parseStatus !== 'success' && !parsedHazards.value.length) {
    ElMessage.warning('请等待系统完成附件解析，或解析失败后手动录入隐患')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return

  const notHeld = isNotHeld(form.value)
  const payload = {
    ...form.value,
    projectId: form.value.projectId || resolveProjectId(form.value.projectName),
    projectDept: form.value.projectDept || resolveProjectDept(form.value.projectName),
    parseStatus: notHeld ? 'skipped' : form.value.parseStatus || 'success',
    hazardCount: notHeld ? 0 : parsedHazards.value.length,
  }

  saveSupervisionMeetingWithHazards(payload, notHeld ? [] : parsedHazards.value)
  load()
  formVisible.value = false
  ElMessage.success(
    notHeld
      ? '监理会议记录已保存'
      : form.value.parseStatus === 'failed'
        ? `会议已保存（解析失败，已保留手动录入 ${parsedHazards.value.length} 条隐患）`
        : `会议记录已保存，共 ${parsedHazards.value.length} 条隐患`,
  )
}

function handleDownloadTemplate() {
  downloadSupervisionMeetingMinutesTemplate()
  ElMessage.success('模版已下载，填写后上传 Word 附件')
}

watch(selectedProjectId, () => {
  load()
})

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <el-tag v-if="isHqSelected" size="small" type="info">企业级 · 只读查看</el-tag>
      <el-tag v-else size="small" type="success">项目层级 · 登记会议</el-tag>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ headerProjectLabel }}</p>
      <p v-else class="page-scope">查看全部项目的监理会议记录及系统解析的隐患清单</p>

      <el-tabs v-model="activeTab" class="supervision-tabs">
        <el-tab-pane label="会议记录" name="meeting">
          <div class="tab-toolbar">
            <el-input v-model="keyword" placeholder="搜索项目、参会人员、解析状态…" clearable class="search-input" />
            <el-button v-if="!isHqSelected" :icon="Download" @click="handleDownloadTemplate">下载模版</el-button>
            <el-button v-if="!isHqSelected" type="primary" :icon="Plus" @click="openCreate">登记会议</el-button>
          </div>

          <el-table :data="filtered" stripe border empty-text="暂无监理会议记录">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column v-if="isHqSelected" prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="meetingDate" label="召开日期" width="112" />
            <el-table-column prop="pmAttendees" label="项目经理/负责人参会" min-width="150" show-overflow-tooltip />
            <el-table-column prop="directorAttendees" label="项目部长/副部长参会" min-width="140" show-overflow-tooltip />
            <el-table-column label="解析状态" width="96" align="center">
              <template #default="{ row }">
                <el-tag :type="parseStatusTag(row.parseStatus)" size="small">
                  {{ parseStatusLabel(row.parseStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="hazardCount" label="隐患条数" width="88" align="center" />
            <el-table-column label="例会纪要" width="88" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.minutesWord" type="success" size="small">已上传</el-tag>
                <el-tag v-else-if="isNotHeld(row)" type="info" size="small">未召开</el-tag>
                <el-tag v-else type="warning" size="small">缺件</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="uploadTime" label="登记时间" width="148" />
            <el-table-column label="操作" :width="isHqSelected ? 88 : 120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
                <el-button v-if="!isHqSelected" link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="监理隐患清单" name="hazard">
          <SupervisionHazardListPanel
            ref="hazardPanelRef"
            :readonly="isHqSelected"
            :project-name="scopeProjectName"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑监理会议' : '登记监理会议'"
      width="760px"
      destroy-on-close
    >
      <el-form label-width="220px" class="meeting-form">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.projectName" disabled placeholder="当前项目" />
        </el-form-item>
        <el-form-item label="召开日期" required>
          <el-date-picker
            v-model="form.meetingDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择召开日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-divider content-position="left">监理例会纪要附件</el-divider>
        <p class="form-tip">
          请先
          <el-button link type="primary" @click="handleDownloadTemplate">下载纪要模版</el-button>
          ，填写后上传 Word 附件（仅支持 .doc / .docx）。系统自动解析会议内容与隐患清单；解析失败可重新上传或手动补录隐患；解析出的整改人、整改期限等字段允许直接修正。
        </p>
        <el-form-item label="监理例会纪要 Word" required>
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".doc,.docx" :before-upload="handleWordUpload">
              <el-button :icon="Upload" :loading="parsing">上传 Word</el-button>
            </el-upload>
            <span class="file-name">{{ form.minutesWord || '未选择文件' }}</span>
            <el-tag v-if="form.parseStatus === 'success'" type="success" size="small">已解析</el-tag>
            <el-tag v-else-if="form.parseStatus === 'failed'" type="danger" size="small">解析失败</el-tag>
            <el-tag v-else-if="parsing || form.parseStatus === 'parsing'" type="warning" size="small">解析中</el-tag>
          </div>
        </el-form-item>
        <el-alert
          v-if="form.parseStatus === 'failed'"
          type="error"
          :closable="false"
          show-icon
          class="parse-fail-alert"
          :title="parseError || '文档解析失败'"
          description="可重新上传符合模版的 .doc/.docx，或点击下方「手动新增隐患」补录后保存。"
        />

        <el-form-item label="监理例会纪要 PDF">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".pdf" :before-upload="(f) => assignUploadFile('minutesPdf', f)">
              <el-button :icon="Upload">上传 PDF（可选）</el-button>
            </el-upload>
            <span class="file-name">{{ form.minutesPdf || '未选择文件' }}</span>
          </div>
        </el-form-item>

        <template v-if="showHazardEditor">
          <el-divider content-position="left">
            {{ form.parseStatus === 'failed' ? '隐患清单（手动补录 / 修正）' : '系统解析结果（可修正）' }}
          </el-divider>
          <el-form-item label="项目经理/负责人参会">
            <el-input v-model="form.pmAttendees" placeholder="解析结果可人工修正" />
          </el-form-item>
          <el-form-item label="项目部长/副部长参会">
            <el-input v-model="form.directorAttendees" placeholder="解析结果可人工修正" />
          </el-form-item>
          <el-form-item label="隐患清单">
            <div class="hazard-editor">
              <div class="hazard-editor-toolbar">
                <el-button type="primary" link :icon="Plus" @click="addManualHazard">手动新增隐患</el-button>
                <span class="hazard-editor-tip">来源：监理解析可改字段；手动新增来源记为「人工登记」</span>
              </div>
              <el-table :data="parsedHazards" size="small" border empty-text="暂无隐患，可手动新增">
                <el-table-column type="index" label="#" width="48" />
                <el-table-column label="类型" width="100">
                  <template #default="{ row }">
                    <el-select v-model="row.hazardType" size="small">
                      <el-option label="安全" value="safety" />
                      <el-option label="质量" value="quality" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="隐患描述" min-width="160">
                  <template #default="{ row }">
                    <el-input v-model="row.description" size="small" placeholder="隐患描述" />
                  </template>
                </el-table-column>
                <el-table-column label="等级" width="100">
                  <template #default="{ row }">
                    <el-select v-model="row.hazardLevel" size="small">
                      <el-option v-for="lv in hazardLevels" :key="lv" :label="lv" :value="lv" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="整改人" width="110">
                  <template #default="{ row }">
                    <el-select v-model="row.rectifier" filterable allow-create default-first-option size="small">
                      <el-option v-for="name in rectifierOptions" :key="name" :label="name" :value="name" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="整改期限" width="150">
                  <template #default="{ row }">
                    <el-date-picker
                      v-model="row.hazardDeadline"
                      type="date"
                      value-format="YYYY-MM-DD"
                      size="small"
                      style="width: 100%"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="来源" width="88">
                  <template #default="{ row }">{{ row.source === '人工登记' ? '人工登记' : '监理解析' }}</template>
                </el-table-column>
                <el-table-column label="操作" width="72" fixed="right">
                  <template #default="{ $index }">
                    <el-button link type="danger" :icon="Delete" @click="removeParsedHazard($index)" />
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-form-item>
        </template>

        <el-divider content-position="left">影像资料（可选）</el-divider>
        <el-form-item label="签到表照片">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="(f) => assignUploadFile('signInPhoto', f)">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <span class="file-name">{{ form.signInPhoto || '未选择文件' }}</span>
          </div>
        </el-form-item>
        <el-form-item label="会议照片">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="(f) => assignUploadFile('meetingPhoto', f)">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <span class="file-name">{{ form.meetingPhoto || '未选择文件' }}</span>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="如未召开，须注明原因（如：因暴雨未召开）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="parsing" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理会议详情" width="760px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ current.projectName }}</el-descriptions-item>
          <el-descriptions-item label="项目部">{{ current.projectDept || '—' }}</el-descriptions-item>
          <el-descriptions-item label="召开日期">{{ current.meetingDate }}</el-descriptions-item>
          <el-descriptions-item label="解析状态">{{ parseStatusLabel(current.parseStatus) }}</el-descriptions-item>
          <el-descriptions-item label="解析时间">{{ current.parsedAt || '—' }}</el-descriptions-item>
          <el-descriptions-item label="隐患条数">{{ current.hazardCount ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="项目经理/负责人参会">{{ current.pmAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目部长/副部长参会">{{ current.directorAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监理例会纪要 Word">{{ current.minutesWord || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监理例会纪要 PDF">{{ current.minutesPdf || '—' }}</el-descriptions-item>
          <el-descriptions-item label="签到表照片">{{ current.signInPhoto || '—' }}</el-descriptions-item>
          <el-descriptions-item label="会议照片">{{ current.meetingPhoto || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.uploadTime }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailHazards.length" class="detail-hazards">
          <h4>解析隐患清单</h4>
          <el-table :data="detailHazards" size="small" border>
            <el-table-column type="index" label="#" width="48" />
            <el-table-column label="类型" width="72">
              <template #default="{ row }">{{ hazardTypeLabel(row.hazardType) }}</template>
            </el-table-column>
            <el-table-column prop="description" label="隐患描述" min-width="180" show-overflow-tooltip />
            <el-table-column prop="hazardLevel" label="等级" width="72" />
            <el-table-column label="整改状态" width="88">
              <template #default="{ row }">{{ row.rectifyStatus || '待整改' }}</template>
            </el-table-column>
            <el-table-column prop="rectifier" label="整改人" width="88" />
            <el-table-column prop="hazardDeadline" label="整改期限" width="112" />
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #909399;
  padding-left: 12px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc,
.page-scope {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.page-scope {
  margin-bottom: 16px;
}

.supervision-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 260px;
}

.meeting-form :deep(.el-divider__text) {
  font-size: 13px;
  color: #606266;
}

.form-tip {
  margin: 0 0 12px 220px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.parse-fail-alert {
  margin: 0 0 16px 220px;
  max-width: 520px;
}

.hazard-editor {
  width: 100%;
}

.hazard-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.hazard-editor-tip {
  font-size: 12px;
  color: #909399;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-name {
  font-size: 13px;
  color: #606266;
  word-break: break-all;
}

.detail-hazards {
  margin-top: 20px;
}

.detail-hazards h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
</style>
