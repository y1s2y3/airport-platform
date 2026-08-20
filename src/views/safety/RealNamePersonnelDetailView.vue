<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getPersonnelDetail,
  getProjectLabel,
  entryStatusTagClass,
  maskPhone,
  maskIdCard,
  logPhoneView,
  logIdCardView,
  clonePersonnel,
  savePersonnel,
  createEmptySafetyEducation,
} from '../../mock/laborRealName'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'

const route = useRoute()
const router = useRouter()
const detail = ref(null)
const phoneVisible = ref(false)
const idVisible = ref(false)
const educationEditVisible = ref(false)
const educationDraft = ref([])
const educationSaving = ref(false)

const educationTypeOptions = ['三级教育', '岗前培训', '专项培训']

onMounted(() => {
  detail.value = getPersonnelDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到人员信息')
    router.replace({ name: 'RealNamePersonnel' })
  }
})

function goBack() {
  router.push({ name: 'RealNamePersonnel' })
}

function previewAttachment(name) {
  if (!name) return
  ElMessage.info(`预览附件：${name}`)
}

function viewPhone() {
  phoneVisible.value = true
  logPhoneView({
    personnel_id: detail.value.id,
    personnel_no: detail.value.basic.personnel_no,
    name: detail.value.basic.name,
    scene: '详情',
  })
}

function displayIdNumber() {
  const raw = detail.value.basic.id_number_raw || detail.value.basic.id_number
  return idVisible.value ? raw : maskIdCard(raw)
}

function viewIdNumber() {
  idVisible.value = true
  logIdCardView({
    personnel_id: detail.value.id,
    personnel_no: detail.value.basic.personnel_no,
    name: detail.value.basic.name,
    scene: '详情',
  })
}

function openEducationEdit() {
  const list = detail.value.safety_education?.length
    ? detail.value.safety_education
    : [createEmptySafetyEducation()]
  educationDraft.value = JSON.parse(JSON.stringify(list))
  educationEditVisible.value = true
}

function addEducationRow() {
  educationDraft.value.push(createEmptySafetyEducation())
}

function removeEducationRow(index) {
  educationDraft.value.splice(index, 1)
  if (!educationDraft.value.length) {
    educationDraft.value.push(createEmptySafetyEducation())
  }
}

function saveEducation() {
  const invalid = educationDraft.value.some((row) => !row.education_type || !row.train_date)
  if (invalid) {
    ElMessage.warning('请完善教育类型与培训日期')
    return
  }
  educationSaving.value = true
  try {
    const payload = clonePersonnel(detail.value)
    payload.safety_education = educationDraft.value.map((row) => ({
      education_type: row.education_type,
      train_date: row.train_date,
      duration: row.duration || '',
      qualified: !!row.qualified,
      certificate: row.certificate || '',
    }))
    detail.value = savePersonnel(payload, 'edit')
    educationEditVisible.value = false
    ElMessage.success('三级安全教育完成情况已保存')
  } finally {
    educationSaving.value = false
  }
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制 / 详情</div>
      <div class="page-toolbar">
        <div class="toolbar-left">
          <el-button size="small" :icon="ArrowLeft" class="back-btn" @click="goBack">返回列表</el-button>
          <h1 class="page-title">人员详情</h1>
        </div>
      </div>
      <div class="title-main">
        <el-avatar :size="56" class="person-avatar">{{ detail.basic.name.slice(0, 1) }}</el-avatar>
        <div>
          <h2 class="person-name">{{ detail.basic.name }}</h2>
          <div class="sub-meta">
            <span>{{ detail.basic.personnel_no }}</span>
            <span>{{ getProjectLabel(detail.project_id) }}</span>
            <span class="ap-status-tag" :class="entryStatusTagClass(detail.entry_status)">{{ detail.entry_status }}</span>
            <span>{{ detail.unit.personnel_category }} · {{ detail.unit.work_type }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <section class="detail-section">
        <div class="section-title">① 基本身份信息（只读）</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="人员编号">{{ detail.basic.personnel_no }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detail.basic.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号码">
            <div class="sensitive-cell">
              <span>{{ phoneVisible ? detail.basic.phone : maskPhone(detail.basic.phone) }}</span>
              <el-button v-if="!phoneVisible" link type="primary" size="small" @click="viewPhone">查看</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="性别">{{ detail.basic.gender }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ detail.basic.age }}</el-descriptions-item>
          <el-descriptions-item label="证件类型">{{ detail.basic.id_type }}</el-descriptions-item>
          <el-descriptions-item label="证件号码">
            <div class="sensitive-cell">
              <span>{{ displayIdNumber() }}</span>
              <el-button v-if="!idVisible" link type="primary" size="small" @click="viewIdNumber">查看</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="证件有效期">{{ detail.basic.id_valid_from }} ~ {{ detail.basic.id_valid_to }}</el-descriptions-item>
          <el-descriptions-item label="参建单位" :span="2">{{ detail.unit.unit_name }}</el-descriptions-item>
          <el-descriptions-item label="工人类型">{{ detail.unit.personnel_category }}</el-descriptions-item>
          <el-descriptions-item label="工种/职务">{{ detail.unit.work_type }}</el-descriptions-item>
          <el-descriptions-item :label="REALNAME_ENTRY_LABEL">
            <span class="ap-status-tag" :class="entryStatusTagClass(detail.entry_status)">{{ detail.entry_status }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title">② 特种作业证书（只读）</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="是否特种作业人员">{{ detail.is_special ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="证书编号">{{ detail.cert_no || '—' }}</el-descriptions-item>
          <el-descriptions-item label="证书有效期">{{ detail.unit.cert_valid_to || '—' }}</el-descriptions-item>
          <el-descriptions-item label="证书附件">
            <el-button
              v-if="detail.unit.special_cert_attachment"
              link
              type="primary"
              :icon="Document"
              @click="previewAttachment(detail.unit.special_cert_attachment)"
            >
              {{ detail.unit.special_cert_attachment }}
            </el-button>
            <span v-else>—</span>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title-row">
          <div class="section-title">③ 三级安全教育完成情况（可编辑）</div>
          <el-button type="primary" size="small" @click="openEducationEdit">编辑</el-button>
        </div>
        <el-table :data="detail.safety_education" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="education_type" label="教育类型" width="120" />
          <el-table-column prop="train_date" label="培训日期" width="120" />
          <el-table-column prop="duration" label="培训时长" width="100" />
          <el-table-column label="是否合格" width="100" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.qualified ? 'ap-tag-enabled' : 'ap-tag-high'">
                {{ row.qualified ? '合格' : '不合格' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="培训证书" min-width="160">
            <template #default="{ row }">
              <el-button
                v-if="row.certificate"
                link
                type="primary"
                :icon="Document"
                @click="previewAttachment(row.certificate)"
              >
                {{ row.certificate }}
              </el-button>
              <span v-else>—</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog
      v-model="educationEditVisible"
      title="编辑三级安全教育完成情况"
      width="860px"
      destroy-on-close
    >
      <div class="education-edit-toolbar">
        <el-button size="small" @click="addEducationRow">新增一行</el-button>
      </div>
      <el-table :data="educationDraft" border class="ap-table">
        <el-table-column label="教育类型" width="150">
          <template #default="{ row }">
            <el-select v-model="row.education_type" placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in educationTypeOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="培训日期" width="160">
          <template #default="{ row }">
            <el-date-picker
              v-model="row.train_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%" aria-label="选择日期"/>
          </template>
        </el-table-column>
        <el-table-column label="培训时长" width="120">
          <template #default="{ row }">
            <el-input v-model="row.duration" placeholder="如 8小时" aria-label="如 8小时"/>
          </template>
        </el-table-column>
        <el-table-column label="是否合格" width="110" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.qualified" inline-prompt active-text="合格" inactive-text="否" />
          </template>
        </el-table-column>
        <el-table-column label="培训证书" min-width="160">
          <template #default="{ row }">
            <el-input v-model="row.certificate" placeholder="证书文件名" aria-label="证书文件名"/>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="removeEducationRow($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="educationEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="educationSaving" @click="saveEducation">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.detail-page { padding: 20px 24px 32px; }
.page-header { margin-bottom: 20px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.back-btn { padding: 5px 11px; height: 28px; font-size: 13px; }
.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.toolbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.page-title { font-size: 20px; font-weight: 600; color: var(--ap-text); margin: 0; white-space: nowrap; }
.title-main { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
.person-name { font-size: 18px; font-weight: 600; color: var(--ap-text); margin: 0; }
.person-avatar { background: var(--ap-primary); color: #fff; font-size: 22px; flex-shrink: 0; }
.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
.sensitive-cell { display: flex; align-items: center; gap: 8px; }
.detail-body { max-width: 1120px; }
.detail-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.section-title { font-size: 15px; font-weight: 600; color: var(--ap-text); margin-bottom: 16px; }
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.section-title-row .section-title { margin-bottom: 0; }
.education-edit-toolbar { margin-bottom: 12px; }
</style>
