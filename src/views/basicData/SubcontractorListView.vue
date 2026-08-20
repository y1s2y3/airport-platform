<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Plus, UploadFilled, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { getProjectSelectOptions } from '../../mock/projectBasicInfo'
import {
  subcontractorList,
  subcontractorTypeOptions,
  subcontractorApproveStatusOptions,
  createEmptySubcontractorApplication,
  cloneSubcontractorApplication,
  submitSubcontractorApplication,
  approveStatusTagClass,
  listApprovedSubcontractors,
  canResubmitSubcontractor,
} from '../../mock/subcontractorManagement'
import {
  createSubcontractorApprovalTodo,
  seedOpenSubcontractorTodosFromStore,
} from '../../mock/personalCenter'
import ProfileImageUpload from '../../components/basicData/ProfileImageUpload.vue'
import FileAttachmentPreview from '../../components/basicData/FileAttachmentPreview.vue'

const router = useRouter()
const { isHqSelected, laborProjectId, headerProjectLabel } = useCurrentProject()

const projectOptions = computed(() => getProjectSelectOptions())
const scopeProjectId = computed(() => (isHqSelected.value ? '' : laborProjectId.value))

const filters = ref({
  name: '',
  status: '',
  projectId: '',
})

const dialogVisible = ref(false)
const formMode = ref('create')
const formModel = ref(null)
const leaderForm = ref({ name: '', phone: '' })
const safetyForms = ref([{ name: '', phone: '' }])

onMounted(() => {
  seedOpenSubcontractorTodosFromStore(subcontractorList)
})

const pageTitle = computed(() => (isHqSelected.value ? '分包单位管理' : '分包单位报审'))
const pageTag = computed(() => (isHqSelected.value ? '指挥部台账' : '项目报审'))

const filteredList = computed(() => {
  let rows = isHqSelected.value
    ? listApprovedSubcontractors(filters.value.projectId)
    : subcontractorList.filter((row) => row.projectId === scopeProjectId.value)

  if (filters.value.name) {
    const kw = filters.value.name.trim()
    rows = rows.filter((row) => row.name.includes(kw))
  }
  if (!isHqSelected.value && filters.value.status) {
    rows = rows.filter((row) => row.status === filters.value.status)
  }
  return rows
})

const dialogTitle = computed(() => {
  if (formMode.value === 'create') return '新建分包单位报审'
  if (formMode.value === 'resubmit') {
    return formModel.value?.name ? `重新报审 · ${formModel.value.name}` : '重新报审'
  }
  return formModel.value?.name ? `编辑报审 · ${formModel.value.name}` : '编辑分包单位报审'
})

function parseOneContact(raw) {
  const text = String(raw || '').trim()
  if (!text) return { name: '', phone: '' }
  const slashParts = text.split(/\s*\/\s*/)
  if (slashParts.length >= 2) {
    const phone = slashParts[slashParts.length - 1].trim()
    if (/\d{7,}/.test(phone)) {
      return {
        name: slashParts.slice(0, -1).join(' / ').trim(),
        phone,
      }
    }
  }
  const glued = text.match(/^(.+?)(\d{11})$/)
  if (glued) return { name: glued[1].trim(), phone: glued[2] }
  return { name: text, phone: '' }
}

function formatContact(name, phone) {
  const nextName = String(name || '').trim()
  const nextPhone = String(phone || '').trim()
  if (!nextName && !nextPhone) return ''
  if (!nextPhone) return nextName
  if (!nextName) return nextPhone
  return `${nextName} / ${nextPhone}`
}

function loadContactForms(row) {
  leaderForm.value = parseOneContact(row?.projectLeaderContact)
  const safetyList = String(row?.safetyManagerContact || '')
    .split(/[；;、，,\n]+/)
    .map((part) => parseOneContact(part))
    .filter((item) => item.name || item.phone)
  safetyForms.value = safetyList.length ? safetyList : [{ name: '', phone: '' }]
}

function syncContactsToModel() {
  if (!formModel.value) return
  formModel.value.projectLeaderContact = formatContact(leaderForm.value.name, leaderForm.value.phone)
  formModel.value.safetyManagerContact = safetyForms.value
    .map((item) => formatContact(item.name, item.phone))
    .filter(Boolean)
    .join('；')
}

function validateManualContacts() {
  const leaderName = String(leaderForm.value.name || '').trim()
  const leaderPhone = String(leaderForm.value.phone || '').trim()
  if (!leaderName || !leaderPhone) {
    return '请填写项目负责人姓名及电话'
  }
  const validSafety = safetyForms.value.filter(
    (item) => String(item.name || '').trim() && String(item.phone || '').trim(),
  )
  if (!validSafety.length) {
    return '请填写安全管理人员姓名及电话'
  }
  const incomplete = safetyForms.value.some(
    (item) =>
      (String(item.name || '').trim() && !String(item.phone || '').trim()) ||
      (!String(item.name || '').trim() && String(item.phone || '').trim()),
  )
  if (incomplete) {
    return '安全管理人员姓名与电话需成对填写'
  }
  return ''
}

function addSafetyPerson() {
  safetyForms.value.push({ name: '', phone: '' })
}

function removeSafetyPerson(index) {
  if (safetyForms.value.length <= 1) return
  safetyForms.value.splice(index, 1)
}

function handleReset() {
  filters.value = { name: '', status: '', projectId: '' }
}

function openCreate() {
  if (!scopeProjectId.value) {
    ElMessage.warning('请先在顶部选择具体项目')
    return
  }
  formMode.value = 'create'
  formModel.value = createEmptySubcontractorApplication(scopeProjectId.value, headerProjectLabel.value)
  loadContactForms(formModel.value)
  dialogVisible.value = true
}

function openResubmit(row) {
  if (!canResubmitSubcontractor(row.status)) {
    ElMessage.warning('仅已驳回或已撤回的单据可重新报审')
    return
  }
  formMode.value = 'resubmit'
  formModel.value = cloneSubcontractorApplication(row)
  loadContactForms(formModel.value)
  dialogVisible.value = true
}

function openDetail(row) {
  router.push({ name: 'SubcontractorDetail', params: { id: row.id } })
}

function addQualification() {
  formModel.value.qualifications.push({ certNo: '', fileName: '', fileUrl: '' })
}

function removeQualification(index) {
  if (formModel.value.qualifications.length <= 1) return
  formModel.value.qualifications.splice(index, 1)
}

function onFilePick(file, target, nameKey, urlKey) {
  target[nameKey] = file.name
  const reader = new FileReader()
  reader.onload = () => {
    target[urlKey] = String(reader.result || '')
  }
  reader.readAsDataURL(file)
  return false
}

function clearFile(target, nameKey, urlKey) {
  target[nameKey] = ''
  target[urlKey] = ''
}

function onSafetyPhotoChange(url) {
  if (!formModel.value) return
  formModel.value.safetyLicense.photoUrl = url || ''
  formModel.value.safetyLicense.photoName = url
    ? formModel.value.safetyLicense.photoName || '安全许可证.jpg'
    : ''
}

function closeDialog() {
  dialogVisible.value = false
  formModel.value = null
  leaderForm.value = { name: '', phone: '' }
  safetyForms.value = [{ name: '', phone: '' }]
}

function handleSubmit() {
  const contactErr = validateManualContacts()
  if (contactErr) return ElMessage.warning(contactErr)
  syncContactsToModel()
  const r = submitSubcontractorApplication(formModel.value)
  if (!r.ok) return ElMessage.warning(r.msg)
  createSubcontractorApprovalTodo(r.data.id)
  ElMessage.success(formMode.value === 'resubmit' ? '已重新提交报审' : '已提交，审批待办已进入个人中心')
  closeDialog()
}
</script>

<template>
  <div class="sub-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / {{ pageTitle }}</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <span class="level-tag">{{ pageTag }}</span>
        </div>
        <el-button
          v-if="!isHqSelected"
          class="ap-btn-primary"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新建报审
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div v-if="isHqSelected" class="filter-item">
          <label>所属项目</label>
          <el-select v-model="filters.projectId" clearable filterable placeholder="全部项目" style="width: 280px" aria-label="全部项目">
            <el-option v-for="opt in projectOptions" :key="opt.id" :label="opt.name" :value="opt.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>分包单位</label>
          <el-input v-model="filters.name" placeholder="单位名称" clearable style="width: 200px" aria-label="单位名称"/>
        </div>
        <div v-if="!isHqSelected" class="filter-item">
          <label>审批状态</label>
          <el-select v-model="filters.status" clearable placeholder="全部" style="width: 140px" aria-label="全部">
            <el-option v-for="opt in subcontractorApproveStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">
        <template v-if="isHqSelected">已审批通过 · 共 {{ filteredList.length }} 家</template>
        <template v-else>{{ headerProjectLabel }} · 共 {{ filteredList.length }} 条报审</template>
      </div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column v-if="isHqSelected" prop="projectName" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="name" label="分包单位名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="unitType" label="类型" width="100" align="center" />
        <el-table-column prop="projectLeaderContact" label="项目负责人" min-width="150" show-overflow-tooltip />
        <el-table-column prop="safetyManagerContact" label="安全管理人员" min-width="150" show-overflow-tooltip />
        <el-table-column
          v-if="!isHqSelected"
          prop="status"
          label="审批状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <span class="ap-status-tag" :class="approveStatusTagClass(row.status)">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="!isHqSelected"
          label="当前节点"
          min-width="140"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.approvalFlow?.find((s) => s.status === 'current')?.title || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="isHqSelected ? 88 : 168" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看</el-button>
            <el-button
              v-if="!isHqSelected && canResubmitSubcontractor(row.status)"
              link
              type="primary"
              @click="openResubmit(row)"
            >
              重新报审
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="960px"
      top="4vh"
      destroy-on-close
      class="participant-dialog"
    >
      <el-form v-if="formModel" :model="formModel" label-width="120px" class="register-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分包单位名称" required>
              <el-input v-model="formModel.name" placeholder="单位全称" aria-label="单位全称"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" required>
              <el-select v-model="formModel.unitType" style="width: 100%">
                <el-option v-for="opt in subcontractorTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item required class="contact-form-item">
          <template #label>
            <span class="label-multiline">
              <span>项目负责人</span>
              <span>姓名及电话</span>
            </span>
          </template>
          <div class="dual-fields">
            <el-input v-model="leaderForm.name" placeholder="姓名" clearable aria-label="姓名"/>
            <el-input v-model="leaderForm.phone" placeholder="电话" clearable aria-label="电话"/>
          </div>
        </el-form-item>

        <el-form-item required class="contact-form-item">
          <template #label>
            <span class="label-multiline">
              <span>安全管理人员</span>
              <span>姓名及电话</span>
            </span>
          </template>
          <div class="safety-manual-list">
            <div
              v-for="(person, idx) in safetyForms"
              :key="`safety-${idx}`"
              class="dual-fields safety-row"
            >
              <el-input v-model="person.name" placeholder="姓名" clearable aria-label="姓名"/>
              <el-input v-model="person.phone" placeholder="电话" clearable aria-label="电话"/>
              <el-button
                link
                type="danger"
                :disabled="safetyForms.length <= 1"
                @click="removeSafetyPerson(idx)"
              >
                删除
              </el-button>
            </div>
            <el-button link type="primary" :icon="Plus" @click="addSafetyPerson">新增人员</el-button>
          </div>
        </el-form-item>

        <el-form-item required class="contact-form-item">
          <template #label>
            <span class="label-multiline">
              <span>分包组织</span>
              <span>架构说明</span>
            </span>
          </template>
          <el-input
            v-model="formModel.orgStructureDesc"
            type="textarea"
            :rows="4"
            placeholder="请说明分包组织架构及岗位配置" aria-label="请说明分包组织架构及岗位配置"/>
        </el-form-item>

        <div class="section-title">
          <span>资质证书</span>
          <el-button link type="primary" :icon="Plus" @click="addQualification">新增证书</el-button>
        </div>
        <div class="qual-table-wrap">
          <el-table :data="formModel.qualifications" border class="ap-table qual-edit-table">
            <el-table-column type="index" label="序号" width="64" align="center" />
            <el-table-column label="证书编号" min-width="220">
              <template #default="{ row, $index }">
                <el-input
                  v-model="row.certNo"
                  :placeholder="$index === 0 ? '必填，证书编号' : '证书编号'" aria-label="$index === 0 ? '必填，证书编号' : '证书编号'"/>
              </template>
            </el-table-column>
            <el-table-column label="附件" min-width="280">
              <template #default="{ row }">
                <div class="attach-inline">
                  <FileAttachmentPreview
                    class="attach-preview"
                    :name="row.fileName"
                    :url="row.fileUrl"
                    empty-text="未上传附件"
                    size="sm"
                  />
                  <div class="attach-actions">
                    <el-upload
                      :show-file-list="false"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                      :before-upload="(f) => onFilePick(f, row, 'fileName', 'fileUrl')"
                    >
                      <el-button size="small" :icon="UploadFilled">
                        {{ row.fileName ? '更换' : '上传' }}
                      </el-button>
                    </el-upload>
                    <el-button
                      v-if="row.fileName"
                      size="small"
                      link
                      type="danger"
                      @click="clearFile(row, 'fileName', 'fileUrl')"
                    >
                      清除
                    </el-button>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ $index }">
                <el-button
                  link
                  type="danger"
                  :disabled="formModel.qualifications.length <= 1"
                  @click="removeQualification($index)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="section-title">安全许可证</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="许可证编号" required>
              <el-input v-model="formModel.safetyLicense.licenseNo" placeholder="请输入许可证编号" aria-label="请输入许可证编号"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期" required>
              <el-date-picker
                v-model="formModel.safetyLicense.expiry"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择有效期"
                style="width: 100%" aria-label="选择有效期"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="许可证照片">
          <div class="photo-upload-panel">
            <ProfileImageUpload
              :model-value="formModel.safetyLicense.photoUrl"
              side-actions
              hint="支持 jpg / png，建议上传清晰证件照片"
              @update:model-value="onSafetyPhotoChange"
            />
          </div>
        </el-form-item>

        <div class="section-title">劳务合同</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="合同编号" required>
              <el-input v-model="formModel.laborContract.contractNo" placeholder="请输入合同编号" aria-label="请输入合同编号"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="金额">
              <el-input v-model="formModel.laborContract.amount" placeholder="如 2800" aria-label="如 2800">
                <template #append>万元</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="合同附件">
          <div
            class="file-drop-card"
            :class="{ 'has-file': formModel.laborContract.fileName }"
          >
            <div class="file-drop-main">
              <FileAttachmentPreview
                :name="formModel.laborContract.fileName"
                :url="formModel.laborContract.fileUrl"
                empty-text="点击上传劳务合同附件"
                size="md"
              />
              <div v-if="!formModel.laborContract.fileName" class="file-drop-sub">
                支持 PDF / Word / 图片
              </div>
            </div>
            <div class="file-drop-actions">
              <el-upload
                :show-file-list="false"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                :before-upload="(f) => onFilePick(f, formModel.laborContract, 'fileName', 'fileUrl')"
              >
                <el-button size="small" type="primary" plain>
                  {{ formModel.laborContract.fileName ? '更换附件' : '选择文件' }}
                </el-button>
              </el-upload>
              <el-button
                v-if="formModel.laborContract.fileName"
                size="small"
                :icon="Delete"
                @click="clearFile(formModel.laborContract, 'fileName', 'fileUrl')"
              >
                移除
              </el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeDialog">取消</el-button>
        <el-button class="ap-btn-primary" type="primary" @click="handleSubmit">
          {{ formMode === 'resubmit' ? '重新提交' : '提交审批' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sub-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  border: 1px solid rgba(143, 0, 69, 0.15);
}

.filter-bar {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
  overflow: auto;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.register-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.register-form :deep(.el-form-item__label) {
  line-height: 1.35;
  white-space: normal;
  height: auto;
  align-items: flex-start;
  justify-content: flex-end;
  text-align: right;
  padding-top: 6px;
}

.register-form :deep(.el-form-item__content) {
  min-width: 0;
}

.label-multiline {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  line-height: 1.25;
  text-align: right;
}

.contact-form-item :deep(.el-form-item__label) {
  padding-top: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 14px;
  padding-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  border-left: 3px solid var(--ap-primary);
}

.dual-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.dual-fields :deep(.el-input) {
  min-width: 0;
}

.safety-manual-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.safety-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
}

.qual-table-wrap {
  margin-bottom: 8px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.qual-edit-table :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}

.attach-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  flex-wrap: nowrap;
}

.attach-preview {
  min-width: 0;
  flex: 1;
}

.attach-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  white-space: nowrap;
}

.photo-upload-panel {
  display: flex;
  align-items: center;
}

.file-drop-card {
  width: 100%;
  border: 1px dashed #c5d4e2;
  border-radius: 8px;
  background: #f8fbfd;
  padding: 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.file-drop-card.has-file {
  border-style: solid;
  border-color: #b7c9da;
  background: #fff;
}

.file-drop-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.file-drop-sub {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.file-drop-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
