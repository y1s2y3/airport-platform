<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getPersonnelDetail,
  getProjectLabel,
  getProjectOptions,
  createEmptyPersonnel,
  clonePersonnel,
  savePersonnel,
  lookupCreditCode,
  lookupUnitType,
  workTypeOptions,
  genderOptions,
  salaryTypeOptions,
  personnelCategoryOptions,
  educationTypeOptions,
  idTypeOptions,
  educationLevelOptions,
  politicalStatusOptions,
  healthStatusOptions,
  unitNameOptions,
  unitTypeOptions,
  createEmptySafetyEducation,
  entryStatusOptions,
} from '../../mock/laborRealName'
import { canCreatePersonnel, isIntegratedField } from '../../mock/laborWarningConfig'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { getDefaultProjectId } from '../../mock/laborRealName'

const route = useRoute()
const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()
const formRef = ref(null)
const form = ref(null)

const isEdit = computed(() => Boolean(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '编辑人员' : '新增人员'))
const projectOptions = getProjectOptions()

function fieldLocked(path) {
  const projectId = form.value?.projectId || laborProjectId.value
  return isIntegratedField(path, projectId)
}

const rules = {
  'basic.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  'basic.phone': [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号码格式不正确', trigger: 'blur' },
  ],
  'basic.idNumber': [{ required: true, message: '请输入证件号码', trigger: 'blur' }],
  'unit.unitName': [{ required: true, message: '请选择或输入参建单位', trigger: 'change' }],
  'unit.workType': [{ required: true, message: '请选择工种/职务', trigger: 'change' }],
}

onMounted(() => {
  if (!isEdit.value && !canCreatePersonnel(laborProjectId.value)) {
    ElMessage.warning('已对接现场实名制，不支持新增人员')
    router.replace({ name: 'RealNamePersonnel' })
    return
  }
  if (isEdit.value) {
    const detail = getPersonnelDetail(route.params.id)
    if (!detail) {
      ElMessage.warning('未找到人员信息')
      router.replace({ name: 'RealNamePersonnel' })
      return
    }
    form.value = clonePersonnel(detail)
    form.value.basic.idNumber = detail.basic.idNumberRaw || detail.basic.idNumber
    form.value.basic.idNumberRaw = detail.basic.idNumberRaw || detail.basic.idNumber
    return
  }

  const projectId = isHqSelected.value
    ? String(route.query.projectId || getDefaultProjectId())
    : laborProjectId.value
  form.value = createEmptyPersonnel(projectId)
})

function goBack() {
  router.push({ name: 'RealNamePersonnel' })
}

function handleUnitChange(unitName) {
  if (!form.value) return
  form.value.unit.creditCode = lookupCreditCode(unitName)
  form.value.unit.unitType = lookupUnitType(unitName)
}

function handleIdNumberInput(val) {
  if (!form.value) return
  form.value.basic.idNumberRaw = val
}

function handlePhotoUpload(uploadFile) {
  if (!form.value) return false
  form.value.basic.photo = uploadFile.name
  return false
}

function handleAttachmentUpload(field, uploadFile) {
  if (!form.value) return false
  form.value.unit[field] = uploadFile.name
  return false
}

function handleCertUpload(row, uploadFile) {
  row.certificate = uploadFile.name
  return false
}

function addSafetyRow() {
  form.value.safetyEducation.push(createEmptySafetyEducation())
}

function removeSafetyRow(index) {
  if (form.value.safetyEducation.length <= 1) {
    ElMessage.warning('至少保留一条安全教育记录')
    return
  }
  form.value.safetyEducation.splice(index, 1)
}

async function handleSubmit() {
  if (!formRef.value || !form.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    savePersonnel(form.value, isEdit.value ? 'edit' : 'create')
    ElMessage.success(isEdit.value ? '保存成功' : '新增成功')
    router.push({ name: 'RealNamePersonnel' })
  })
}
</script>

<template>
  <div v-if="form" class="form-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制 / {{ pageTitle }}</div>
      <div class="page-toolbar">
        <div class="toolbar-left">
          <el-button size="small" :icon="ArrowLeft" class="back-btn" @click="goBack">返回列表</el-button>
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="page-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">保存</el-button>
        </div>
      </div>
      <p v-if="!isEdit" class="page-tip">所属项目：{{ getProjectLabel(form.projectId) }}</p>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="168px" class="personnel-form">
      <section class="form-section">
        <div class="section-title">人员基本信息</div>
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="人员编号">
              <el-input v-model="form.basic.personnelNo" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="照片">
              <div class="photo-field">
                <el-avatar :size="48">{{ form.basic.name?.slice(0, 1) || '?' }}</el-avatar>
                <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png" :before-upload="handlePhotoUpload" :disabled="fieldLocked('basic.photo')">
                  <el-button size="small" :disabled="fieldLocked('basic.photo')">{{ form.basic.photo || '上传照片' }}</el-button>
                </el-upload>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="basic.name">
              <el-input v-model="form.basic.name" placeholder="请输入姓名" :disabled="fieldLocked('basic.name')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="basic.phone">
              <el-input v-model="form.basic.phone" placeholder="请输入手机号码" maxlength="11" :disabled="fieldLocked('basic.phone')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.basic.gender" :disabled="fieldLocked('basic.gender')">
                <el-radio v-for="opt in genderOptions" :key="opt" :value="opt">{{ opt }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年龄">
              <el-input-number v-model="form.basic.age" :min="16" :max="70" controls-position="right" style="width: 100%" :disabled="fieldLocked('basic.age')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证件类型">
              <el-select v-model="form.basic.idType" placeholder="请选择" style="width: 100%" :disabled="fieldLocked('basic.idType')">
                <el-option v-for="opt in idTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证件号码" prop="basic.idNumber">
              <el-input
                v-model="form.basic.idNumber"
                placeholder="请输入证件号码"
                maxlength="18"
                @input="handleIdNumberInput"
                :disabled="fieldLocked('basic.idNumber')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证件有效开始时间">
              <el-date-picker v-model="form.basic.idValidFrom" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" :disabled="fieldLocked('basic.idValidFrom')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证件有效结束时间">
              <el-date-picker v-model="form.basic.idValidTo" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" :disabled="fieldLocked('basic.idValidTo')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="籍贯">
              <el-input v-model="form.basic.nativePlace" placeholder="请输入籍贯" :disabled="fieldLocked('basic.nativePlace')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="文化程度">
              <el-select v-model="form.basic.education" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in educationLevelOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="现住址">
              <el-input v-model="form.basic.address" placeholder="请输入现住址" :disabled="fieldLocked('basic.address')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="政治面貌">
              <el-select v-model="form.basic.politicalStatus" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in politicalStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="健康状态">
              <el-select v-model="form.basic.healthStatus" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in healthStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="疾病史">
              <el-input v-model="form.basic.medicalHistory" type="textarea" :rows="2" placeholder="无则填「无」" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="form-section">
        <div class="section-title">参建单位信息</div>
        <el-row :gutter="24">
          <el-col :span="24">
            <el-form-item label="参建单位名称" prop="unit.unitName">
              <el-select
                v-model="form.unit.unitName"
                filterable
                allow-create
                default-first-option
                placeholder="请选择或输入参建单位"
                style="width: 100%"
                @change="handleUnitChange"
                :disabled="fieldLocked('unit.unitName')"
              >
                <el-option v-for="opt in unitNameOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="所属单位统一社会信用代码">
              <el-input v-model="form.unit.creditCode" placeholder="选择参建单位后自动带出" :disabled="fieldLocked('unit.creditCode')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="参建单位类型">
              <el-select v-model="form.unit.unitType" placeholder="请选择" style="width: 100%" :disabled="fieldLocked('unit.unitType')">
                <el-option v-for="opt in unitTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="人员类别">
              <el-select v-model="form.unit.personnelCategory" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in personnelCategoryOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工种/职务" prop="unit.workType">
              <el-select v-model="form.unit.workType" filterable allow-create placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属班组">
              <el-input v-model="form.unit.team" placeholder="请输入所属班组" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否班组长">
              <el-radio-group v-model="form.unit.isTeamLeader">
                <el-radio :value="true">是</el-radio>
                <el-radio :value="false">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="特种作业证书附件">
              <el-upload
                :show-file-list="false"
                accept=".pdf,.jpg,.jpeg,.png"
                :before-upload="(file) => handleAttachmentUpload('specialCertAttachment', file)"
              >
                <el-button size="small">{{ form.unit.specialCertAttachment || '上传附件' }}</el-button>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证书有效期">
              <el-date-picker v-model="form.unit.certValidTo" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="劳动合同/用工书面协议附件">
              <el-upload
                :show-file-list="false"
                accept=".pdf,.doc,.docx"
                :before-upload="(file) => handleAttachmentUpload('contractAttachment', file)"
              >
                <el-button size="small">{{ form.unit.contractAttachment || '上传附件' }}</el-button>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同起始日期">
              <el-date-picker v-model="form.unit.contractStartDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同结束日期">
              <el-date-picker v-model="form.unit.contractEndDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="薪酬计算方式">
              <el-select v-model="form.unit.salaryType" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in salaryTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价">
              <el-input v-model="form.unit.unitPrice" placeholder="如 280元/天" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="REALNAME_ENTRY_LABEL">
              <el-select v-model="form.entryStatus" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in entryStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="form-section">
        <div class="section-head">
          <div class="section-title">安全教育</div>
          <el-button type="primary" link :icon="Plus" @click="addSafetyRow">添加记录</el-button>
        </div>
        <el-table :data="form.safetyEducation" border stripe class="ap-table safety-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column label="教育类型" width="140">
            <template #default="{ row }">
              <el-select v-model="row.type" placeholder="请选择" style="width: 100%">
                <el-option v-for="opt in educationTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="培训日期" width="160">
            <template #default="{ row }">
              <el-date-picker v-model="row.trainDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
            </template>
          </el-table-column>
          <el-table-column label="培训时长" width="120">
            <template #default="{ row }">
              <el-input v-model="row.duration" placeholder="如 8小时" />
            </template>
          </el-table-column>
          <el-table-column label="是否合格" width="110" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.qualified" active-text="合格" inactive-text="不合格" inline-prompt />
            </template>
          </el-table-column>
          <el-table-column label="培训证书" min-width="160">
            <template #default="{ row }">
              <el-upload :show-file-list="false" accept=".pdf,.jpg,.jpeg,.png" :before-upload="(file) => handleCertUpload(row, file)">
                <el-button size="small" link type="primary">{{ row.certificate || '上传证书' }}</el-button>
              </el-upload>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="removeSafetyRow($index)" />
            </template>
          </el-table-column>
        </el-table>
      </section>
    </el-form>
  </div>
</template>

<style scoped>
.form-page {
  padding: 20px 24px 32px;
}

.page-header {
  margin-bottom: 20px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 4px;
}

.back-btn {
  padding: 5px 11px;
  height: 28px;
  font-size: 13px;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 0;
  white-space: nowrap;
}

.page-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ap-text-muted);
}

.personnel-form {
  max-width: 1120px;
}

.form-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 20px 24px 8px;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 16px;
}

.section-head .section-title {
  margin-bottom: 0;
}

.photo-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.safety-table {
  margin-bottom: 8px;
}
</style>
