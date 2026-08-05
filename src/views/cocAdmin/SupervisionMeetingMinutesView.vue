<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, View, Upload, Download } from '@element-plus/icons-vue'
import { buildProjects } from '../../coc/mock/data.js'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  getSupervisionMeetings,
  saveSupervisionMeetingWithHazards,
  emptySupervisionMeeting,
  getSupervisionHazardsByMeeting,
} from '../../utils/cocAdminDeviceStorage.js'
import {
  isSupervisionWordFileName,
  isSupervisionMinutesFileName,
} from '../../utils/supervisionMeetingParser.js'
import {
  downloadWeeklyHazardListTemplate,
  importWeeklyHazardListFromFile,
} from '../../utils/supervisionMeetingTemplate.js'
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
const importedHazards = ref([])
const importing = ref(false)
const hazardPanelRef = ref(null)

const previewVisible = ref(false)
const previewTitle = ref('')
const previewUrl = ref('')
const previewKind = ref('other') // image | pdf | other

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i
const PDF_EXT_RE = /\.pdf(\?|$)/i

function attachmentName(nameOrObj) {
  if (!nameOrObj) return ''
  if (typeof nameOrObj === 'object') return String(nameOrObj.name || '').trim()
  return String(nameOrObj || '').trim()
}

function attachmentUrl(record, nameField, urlField) {
  if (!record) return ''
  const direct = String(record[urlField] || '').trim()
  if (direct) return direct
  const value = record[nameField]
  if (value && typeof value === 'object') return String(value.url || '').trim()
  return ''
}

function detectPreviewKind(fileName = '', url = '') {
  const name = String(fileName || '')
  const src = String(url || '')
  if (src.startsWith('data:text/html')) return 'html'
  if (IMAGE_EXT_RE.test(name) || src.startsWith('data:image/') || IMAGE_EXT_RE.test(src)) return 'image'
  if (PDF_EXT_RE.test(name) || src.startsWith('data:application/pdf') || PDF_EXT_RE.test(src)) return 'pdf'
  return 'other'
}

function readFileAsPreviewUrl(file, maxMb = 12) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('empty file'))
      return
    }
    if (file.size > maxMb * 1024 * 1024) {
      resolve(URL.createObjectURL(file))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

function openAttachmentPreview(fileName, url) {
  const name = attachmentName(fileName)
  if (!name) return
  const src = String(url || '').trim()
  if (!src) {
    ElMessage.warning('当前附件暂无预览内容（历史数据仅保留文件名），请重新上传后可预览')
    return
  }
  previewTitle.value = name
  previewUrl.value = src
  previewKind.value = detectPreviewKind(name, src)
  if (previewKind.value === 'other') {
    // Office / xlsx：新窗口打开或触发下载
    const link = document.createElement('a')
    link.href = src
    link.target = '_blank'
    link.rel = 'noopener'
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('已打开附件，可在新窗口查看或下载')
    return
  }
  previewVisible.value = true
}

function previewMinutes(record) {
  const name = attachmentName(record?.minutesFile || record?.minutesWord || record?.minutesPdf)
  openAttachmentPreview(name, attachmentUrl(record, 'minutesFile', 'minutesFileUrl'))
}

function previewWeeklyList(record) {
  openAttachmentPreview(
    attachmentName(record?.weeklyHazardList),
    attachmentUrl(record, 'weeklyHazardList', 'weeklyHazardListUrl'),
  )
}

function previewSignInPhoto(record) {
  openAttachmentPreview(
    attachmentName(record?.signInPhoto),
    attachmentUrl(record, 'signInPhoto', 'signInPhotoUrl'),
  )
}

function previewMeetingPhoto(record) {
  openAttachmentPreview(
    attachmentName(record?.meetingPhoto),
    attachmentUrl(record, 'meetingPhoto', 'meetingPhotoUrl'),
  )
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
      importStatusLabel(row.parseStatus),
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
  importedHazards.value = []
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptySupervisionMeeting(row)
  importedHazards.value = getSupervisionHazardsByMeeting(row.id)
  formVisible.value = true
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function isNotHeld(record) {
  return String(record.remark || '').includes('未召开')
}

function assignUploadFile(field, uploadFile) {
  const file = uploadFile?.raw || uploadFile
  const fileName = file?.name || uploadFile?.name || ''
  if (!fileName) return false
  form.value[field] = fileName
  const urlField = `${field}Url`
  readFileAsPreviewUrl(file)
    .then((url) => {
      form.value[urlField] = url
    })
    .catch(() => {
      form.value[urlField] = ''
      ElMessage.warning('附件已上传，但预览生成失败')
    })
  return false
}

function handleMinutesUpload(uploadFile) {
  const file = uploadFile?.raw || uploadFile
  const fileName = file?.name || uploadFile?.name || ''
  if (!isSupervisionMinutesFileName(fileName)) {
    ElMessage.error('监理例会纪要仅支持 .doc / .docx / .pdf，请重新选择文件')
    return false
  }

  form.value.minutesFile = fileName
  if (isSupervisionWordFileName(fileName)) {
    form.value.minutesWord = fileName
    form.value.minutesPdf = ''
  } else {
    form.value.minutesPdf = fileName
    form.value.minutesWord = ''
  }

  readFileAsPreviewUrl(file)
    .then((url) => {
      form.value.minutesFileUrl = url
      ElMessage.success('纪要已上传，可点击「预览」查看')
    })
    .catch(() => {
      form.value.minutesFileUrl = ''
      ElMessage.success('纪要已上传（暂无法生成预览，仍可保存）')
    })
  return false
}

async function handleWeeklyHazardUpload(uploadFile) {
  const file = uploadFile?.raw || uploadFile
  const fileName = file?.name || uploadFile?.name || ''
  if (!/\.xlsx$/i.test(fileName)) {
    ElMessage.error('隐患清单仅支持 Excel（.xlsx），请按模板另存后上传')
    return false
  }

  importing.value = true
  form.value.parseStatus = 'parsing'

  try {
    const result = await importWeeklyHazardListFromFile(file)
    if (!result.ok) {
      form.value.weeklyHazardList = ''
      form.value.weeklyHazardListUrl = ''
      form.value.parseStatus = 'failed'
      form.value.parsedAt = ''
      importedHazards.value = []
      showImportFormatErrors(result)
      return false
    }

    form.value.weeklyHazardList = fileName
    form.value.parseStatus = 'success'
    form.value.parsedAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    importedHazards.value = result.hazards || []
    try {
      form.value.weeklyHazardListUrl = await readFileAsPreviewUrl(file)
    } catch {
      form.value.weeklyHazardListUrl = ''
    }
    ElMessage.success(
      result.summary || `清单解析成功，已导入 ${importedHazards.value.length} 条隐患`,
    )
  } catch {
    form.value.weeklyHazardList = ''
    form.value.weeklyHazardListUrl = ''
    form.value.parseStatus = 'failed'
    importedHazards.value = []
    ElMessageBox.alert('清单解析失败，请确认文件未损坏且为模板格式后重试。', '解析失败', {
      type: 'error',
    })
  } finally {
    importing.value = false
  }

  return false
}

function showImportFormatErrors(result) {
  const details = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : []
  const summary = result?.error || '清单格式不符合模板要求'
  const escapeText = (text) =>
    String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  if (!details.length) {
    ElMessageBox.alert(summary, '解析失败', { type: 'error', confirmButtonText: '知道了' })
    return
  }
  const listHtml = details
    .map((item) => `<li style="margin:4px 0;line-height:1.5">${escapeText(item)}</li>`)
    .join('')
  ElMessageBox.alert(
    `<div style="max-height:320px;overflow:auto">
      <p style="margin:0 0 10px;color:#606266">${escapeText(summary)}。请按模板修正后重新上传，问题明细如下（共 ${details.length} 项）：</p>
      <ol style="margin:0;padding-left:20px;color:#303133">${listHtml}</ol>
    </div>`,
    '解析失败',
    {
      type: 'error',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '知道了',
      customClass: 'import-format-error-box',
    },
  )
}

function importStatusLabel(status) {
  const map = {
    success: '已解析',
    pending: '待上传',
    parsing: '解析中',
    skipped: '未召开',
    failed: '解析失败',
  }
  return map[status] || status || '—'
}

function importStatusTag(status) {
  const map = {
    success: 'success',
    pending: 'info',
    parsing: 'warning',
    skipped: 'info',
    failed: 'danger',
  }
  return map[status] || 'info'
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
  if (!form.value.minutesFile?.trim()) {
    ElMessage.warning('请上传监理例会纪要（支持 .doc / .docx / .pdf）')
    return false
  }
  if (!isSupervisionMinutesFileName(form.value.minutesFile)) {
    ElMessage.error('纪要附件格式不正确，仅支持 .doc / .docx / .pdf')
    return false
  }
  if (!form.value.weeklyHazardList?.trim()) {
    ElMessage.warning('请上传本周隐患清单')
    return false
  }
  if (!/\.xlsx$/i.test(form.value.weeklyHazardList)) {
    ElMessage.error('本周隐患清单仅支持 .xlsx 格式')
    return false
  }
  if (importing.value || form.value.parseStatus === 'parsing') {
    ElMessage.warning('清单正在导入，请稍候')
    return false
  }
  if (!importedHazards.value.length) {
    ElMessage.warning('请上传并通过解析校验的本周隐患清单后再保存')
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
    parseStatus: notHeld ? 'skipped' : importedHazards.value.length ? 'success' : form.value.parseStatus || 'pending',
    hazardCount: notHeld ? 0 : importedHazards.value.length,
  }

  saveSupervisionMeetingWithHazards(payload, notHeld ? [] : importedHazards.value)
  load()
  formVisible.value = false
  ElMessage.success(
    notHeld
      ? '监理会议记录已保存'
      : `会议记录已保存，共导入 ${importedHazards.value.length} 条隐患`,
  )
}

function handleDownloadTemplate() {
  downloadWeeklyHazardListTemplate()
  ElMessage.success('清单模板已下载，填报完成后请上传 .xlsx 清单')
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
      <p v-else class="page-scope">查看全部项目的监理会议记录及隐患清单</p>

      <el-tabs v-model="activeTab" class="supervision-tabs">
        <el-tab-pane label="会议记录" name="meeting">
          <div class="tab-toolbar">
            <el-input v-model="keyword" placeholder="搜索项目、参会人员、导入状态…" clearable class="search-input" />
            <el-button v-if="!isHqSelected" :icon="Download" @click="handleDownloadTemplate">清单模板</el-button>
            <el-button v-if="!isHqSelected" type="primary" :icon="Plus" @click="openCreate">登记会议</el-button>
          </div>

          <el-table :data="filtered" stripe border empty-text="暂无监理会议记录">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column v-if="isHqSelected" prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
            <el-table-column prop="meetingDate" label="召开日期" width="112" />
            <el-table-column prop="pmAttendees" label="项目经理/负责人参会" min-width="150" show-overflow-tooltip />
            <el-table-column prop="directorAttendees" label="项目部长/副部长参会" min-width="140" show-overflow-tooltip />
            <el-table-column label="导入状态" width="96" align="center">
              <template #default="{ row }">
                <el-tag :type="importStatusTag(row.parseStatus)" size="small">
                  {{ importStatusLabel(row.parseStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="例会纪要" width="88" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.minutesFile || row.minutesWord || row.minutesPdf" type="success" size="small">已上传</el-tag>
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
            :allow-close="isHqSelected"
            :allow-create="!isHqSelected"
            :project-name="scopeProjectName"
            :project-id="isHqSelected ? '' : selectedProjectId"
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
        <el-form-item label="项目经理/负责人参会">
          <el-input
            v-model="form.pmAttendees"
            placeholder="请填写参会的项目经理/负责人"
          />
        </el-form-item>
        <el-form-item label="项目部长/副部长参会">
          <el-input
            v-model="form.directorAttendees"
            placeholder="请填写参会的项目部长/副部长"
          />
        </el-form-item>

        <el-divider content-position="left">监理例会纪要附件</el-divider>
        <el-form-item label="监理例会纪要" required>
          <div class="upload-row">
            <el-upload
              :show-file-list="false"
              accept=".doc,.docx,.pdf"
              :before-upload="handleMinutesUpload"
            >
              <el-button :icon="Upload">上传纪要</el-button>
            </el-upload>
            <span class="file-name">{{ form.minutesFile || '未上传' }}</span>
            <el-button
              v-if="form.minutesFile"
              link
              type="primary"
              @click="previewMinutes(form)"
            >
              预览
            </el-button>
          </div>
          <p class="form-tip">支持 Word（.doc / .docx）或 PDF，上传后可预览；本页不自动解析纪要正文。</p>
        </el-form-item>

        <el-form-item label="本周隐患清单" required>
          <div class="weekly-hazard-field">
            <p class="form-tip form-tip--inline">
              流程：
              <el-button link type="primary" @click="handleDownloadTemplate">下载清单模板</el-button>
              → 按模板填报 → 上传 .xlsx。系统校验格式并导入隐患；必填列为隐患类型（安全/质量）、隐患描述、隐患等级（一般/较大/重大）。
            </p>
            <div class="upload-row">
              <el-upload
                :show-file-list="false"
                accept=".xlsx"
                :before-upload="handleWeeklyHazardUpload"
              >
                <el-button :icon="Upload" :loading="importing">上传清单</el-button>
              </el-upload>
              <span class="file-name">{{ form.weeklyHazardList || '未上传' }}</span>
              <el-button
                v-if="form.weeklyHazardList"
                link
                type="primary"
                @click="previewWeeklyList(form)"
              >
                预览
              </el-button>
              <el-tag v-if="form.parseStatus === 'success' && importedHazards.length" type="success" size="small">
                已解析导入 {{ importedHazards.length }} 条
              </el-tag>
              <el-tag v-else-if="form.parseStatus === 'failed'" type="danger" size="small">解析失败</el-tag>
              <el-tag v-else-if="importing || form.parseStatus === 'parsing'" type="warning" size="small">解析中…</el-tag>
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">影像资料（可选）</el-divider>
        <el-form-item label="签到表照片">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="(f) => assignUploadFile('signInPhoto', f)">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <span class="file-name">{{ form.signInPhoto || '未选择文件' }}</span>
            <el-button
              v-if="form.signInPhoto"
              link
              type="primary"
              @click="previewSignInPhoto(form)"
            >
              预览
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="会议照片">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="(f) => assignUploadFile('meetingPhoto', f)">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <span class="file-name">{{ form.meetingPhoto || '未选择文件' }}</span>
            <el-button
              v-if="form.meetingPhoto"
              link
              type="primary"
              @click="previewMeetingPhoto(form)"
            >
              预览
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理会议详情" width="640px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="召开日期">{{ current.meetingDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目经理/负责人参会">{{ current.pmAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目部长/副部长参会">{{ current.directorAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监理例会纪要">
            <button
              v-if="current.minutesFile || current.minutesWord || current.minutesPdf"
              type="button"
              class="attach-link"
              @click="previewMinutes(current)"
            >
              {{ current.minutesFile || current.minutesWord || current.minutesPdf }}
            </button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="本周隐患清单">
            <button
              v-if="current.weeklyHazardList"
              type="button"
              class="attach-link"
              @click="previewWeeklyList(current)"
            >
              {{ current.weeklyHazardList }}
            </button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="签到表照片">
            <button
              v-if="current.signInPhoto"
              type="button"
              class="attach-link"
              @click="previewSignInPhoto(current)"
            >
              {{ current.signInPhoto }}
            </button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="会议照片">
            <button
              v-if="current.meetingPhoto"
              type="button"
              class="attach-link"
              @click="previewMeetingPhoto(current)"
            >
              {{ current.meetingPhoto }}
            </button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      :title="previewTitle || '附件预览'"
      width="860px"
      destroy-on-close
      append-to-body
      class="attachment-preview-dialog"
    >
      <div class="preview-body">
        <el-image
          v-if="previewKind === 'image'"
          :src="previewUrl"
          fit="contain"
          class="preview-image"
          :preview-src-list="[previewUrl]"
          preview-teleported
        />
        <iframe
          v-else-if="previewKind === 'pdf' || previewKind === 'html'"
          class="preview-pdf"
          :src="previewUrl"
          title="附件预览"
        />
      </div>
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

.form-tip--inline {
  margin: 0 0 8px;
}

.weekly-hazard-field {
  width: 100%;
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

.attach-link {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: #91003d;
  cursor: pointer;
  text-align: left;
  word-break: break-all;
  line-height: 1.6;
  text-decoration: underline;
}

.attach-link:hover {
  opacity: 0.85;
}

.preview-body {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  max-height: 70vh;
}

.preview-pdf {
  width: 100%;
  height: 70vh;
  border: 0;
  background: #fff;
}
</style>
