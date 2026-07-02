<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, View, Upload } from '@element-plus/icons-vue'
import { buildProjects } from '../../coc/mock/data.js'
import {
  getSupervisionMeetings,
  saveSupervisionMeeting,
  emptySupervisionMeeting,
} from '../../utils/cocAdminDeviceStorage.js'
import SupervisionHazardListPanel from './SupervisionHazardListPanel.vue'

defineProps({
  title: { type: String, default: '监理会议管理' },
  description: { type: String, default: '' },
})

const activeTab = ref('meeting')
const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const form = ref(emptySupervisionMeeting())
const current = ref(null)

const projectOptions = buildProjects().map((p) => ({
  shortName: p.shortName || p.name,
  dept: `${p.shortName || p.name}项目部`,
}))

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) =>
    [
      row.projectDept,
      row.projectName,
      row.meetingDate,
      row.pmAttendees,
      row.directorAttendees,
      row.remark,
    ].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getSupervisionMeetings()
}

function openCreate() {
  form.value = emptySupervisionMeeting()
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptySupervisionMeeting(row)
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
  form.value[field] = uploadFile.name || ''
  return false
}

function fileTag(name) {
  return name ? '已上传' : '未上传'
}

function validateForm() {
  if (!form.value.projectDept?.trim()) {
    ElMessage.warning('请填写项目部')
    return false
  }
  if (!form.value.projectName?.trim()) {
    ElMessage.warning('请填写项目名称')
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
    ElMessage.warning('请上传监理例会纪要 Word 文件')
    return false
  }
  if (!form.value.minutesPdf?.trim()) {
    ElMessage.warning('请上传监理例会纪要 PDF 文件')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveSupervisionMeeting(form.value)
  load()
  formVisible.value = false
  ElMessage.success('监理会议记录已保存')
}

function onProjectPick(name) {
  const matched = projectOptions.find((p) => p.shortName === name)
  if (matched && !form.value.projectDept) {
    form.value.projectDept = matched.dept
  }
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>

      <el-tabs v-model="activeTab" class="supervision-tabs">
        <el-tab-pane label="会议记录" name="meeting">
          <div class="tab-toolbar">
            <el-input v-model="keyword" placeholder="搜索项目部、项目名称、参会人员…" clearable class="search-input" />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
          </div>

          <el-table :data="filtered" stripe border empty-text="暂无监理会议记录">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="projectDept" label="项目部" min-width="120" show-overflow-tooltip />
            <el-table-column prop="projectName" label="项目名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="meetingDate" label="召开日期" width="112" />
            <el-table-column prop="pmAttendees" label="项目经理/负责人参会" min-width="160" show-overflow-tooltip />
            <el-table-column prop="directorAttendees" label="项目部长/副部长参会" min-width="150" show-overflow-tooltip />
            <el-table-column label="例会纪要" width="88" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.minutesWord && row.minutesPdf" type="success" size="small">齐全</el-tag>
                <el-tag v-else-if="isNotHeld(row)" type="info" size="small">未召开</el-tag>
                <el-tag v-else type="warning" size="small">缺件</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="签到表" width="72" align="center">
              <template #default="{ row }">{{ fileTag(row.signInPhoto) }}</template>
            </el-table-column>
            <el-table-column label="会议照片" width="80" align="center">
              <template #default="{ row }">{{ fileTag(row.meetingPhoto) }}</template>
            </el-table-column>
            <el-table-column prop="uploadTime" label="登记时间" width="148" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
                <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="监理隐患清单" name="hazard">
          <SupervisionHazardListPanel />
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑监理会议' : '新增监理会议'"
      width="720px"
      destroy-on-close
    >
      <el-form label-width="220px" class="meeting-form">
        <el-form-item label="项目部" required>
          <el-input v-model="form.projectDept" placeholder="如：三跑道项目部" />
        </el-form-item>
        <el-form-item label="项目名称" required>
          <el-select
            v-model="form.projectName"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入项目名称"
            style="width: 100%"
            @change="onProjectPick"
          >
            <el-option v-for="item in projectOptions" :key="item.shortName" :label="item.shortName" :value="item.shortName" />
          </el-select>
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
          <el-input v-model="form.pmAttendees" placeholder="指挥部项目经理/项目负责人参会人员" />
        </el-form-item>
        <el-form-item label="项目部长/副部长参会">
          <el-input v-model="form.directorAttendees" placeholder="指挥部项目部长/副部长参会人员" />
        </el-form-item>

        <el-divider content-position="left">监理例会纪要（须 Word + PDF 各一份）</el-divider>
        <el-form-item label="监理例会纪要 Word（文字须清晰）" required>
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".doc,.docx" :before-upload="(f) => assignUploadFile('minutesWord', f)">
              <el-button :icon="Upload">上传 Word</el-button>
            </el-upload>
            <span class="file-name">{{ form.minutesWord || '未选择文件' }}</span>
          </div>
        </el-form-item>
        <el-form-item label="监理例会纪要 PDF（文字须清晰）" required>
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".pdf" :before-upload="(f) => assignUploadFile('minutesPdf', f)">
              <el-button :icon="Upload">上传 PDF</el-button>
            </el-upload>
            <span class="file-name">{{ form.minutesPdf || '未选择文件' }}</span>
          </div>
        </el-form-item>

        <el-divider content-position="left">影像资料</el-divider>
        <el-form-item label="签到表照片（文字须清晰）">
          <div class="upload-row">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="(f) => assignUploadFile('signInPhoto', f)">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <span class="file-name">{{ form.signInPhoto || '未选择文件' }}</span>
          </div>
        </el-form-item>
        <el-form-item label="会议照片（能看清主要参会人员，含水印）">
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
            placeholder="如未召开，须注明原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理会议详情" width="680px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目部">{{ current.projectDept }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ current.projectName }}</el-descriptions-item>
          <el-descriptions-item label="召开日期">{{ current.meetingDate }}</el-descriptions-item>
          <el-descriptions-item label="项目经理/负责人参会">{{ current.pmAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目部长/副部长参会">{{ current.directorAttendees || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监理例会纪要 Word（文字须清晰）">{{ current.minutesWord || '—' }}</el-descriptions-item>
          <el-descriptions-item label="监理例会纪要 PDF（文字须清晰）">{{ current.minutesPdf || '—' }}</el-descriptions-item>
          <el-descriptions-item label="签到表照片（文字须清晰）">{{ current.signInPhoto || '—' }}</el-descriptions-item>
          <el-descriptions-item label="会议照片（能看清主要参会人员，含水印）">{{ current.meetingPhoto || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.uploadTime }}</el-descriptions-item>
        </el-descriptions>
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

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
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
</style>
