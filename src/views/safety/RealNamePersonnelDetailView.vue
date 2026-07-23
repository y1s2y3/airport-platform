<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Document, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getPersonnelDetail,
  getProjectLabel,
  entryStatusTagClass,
  maskPhone,
  maskIdCard,
  logPhoneView,
  logIdCardView,
} from '../../mock/laborRealName'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'

const route = useRoute()
const router = useRouter()
const detail = ref(null)
const phoneVisible = ref(false)
const idVisible = ref(false)

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

function goEdit() {
  router.push({ name: 'RealNamePersonnelEdit', params: { id: detail.value.id } })
}

function previewAttachment(name) {
  if (!name) return
  ElMessage.info(`预览附件：${name}`)
}

function viewPhone() {
  phoneVisible.value = true
  logPhoneView({
    personnelId: detail.value.id,
    personnelNo: detail.value.basic.personnelNo,
    name: detail.value.basic.name,
    scene: '详情',
  })
}

function displayIdNumber() {
  const raw = detail.value.basic.idNumberRaw || detail.value.basic.idNumber
  return idVisible.value ? raw : maskIdCard(raw)
}

function viewIdNumber() {
  idVisible.value = true
  logIdCardView({
    personnelId: detail.value.id,
    personnelNo: detail.value.basic.personnelNo,
    name: detail.value.basic.name,
    scene: '详情',
  })
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制 / 详情</div>
      <div class="page-toolbar">
        <div class="toolbar-left">
          <el-button size="small" :icon="ArrowLeft" class="back-btn" @click="goBack">返回列表</el-button>
          <h1 class="page-title">详情</h1>
        </div>
        <el-button type="primary" class="ap-btn-primary" :icon="Edit" @click="goEdit">编辑</el-button>
      </div>
      <div class="title-main">
        <el-avatar :size="56" class="person-avatar">{{ detail.basic.name.slice(0, 1) }}</el-avatar>
        <div>
          <h2 class="person-name">{{ detail.basic.name }}</h2>
          <div class="sub-meta">
            <span>{{ detail.basic.personnelNo }}</span>
            <span>{{ getProjectLabel(detail.projectId) }}</span>
            <span class="ap-status-tag" :class="entryStatusTagClass(detail.entryStatus)">{{ detail.entryStatus }}</span>
            <span>{{ detail.unit.personnelCategory }} · {{ detail.unit.workType }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <section class="detail-section">
        <div class="section-title">人员基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="人员编号">{{ detail.basic.personnelNo }}</el-descriptions-item>
          <el-descriptions-item label="照片">
            <el-avatar :size="48">{{ detail.basic.name.slice(0, 1) }}</el-avatar>
          </el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detail.basic.name }}</el-descriptions-item>
          <el-descriptions-item label="手机号码">
            <div class="sensitive-cell">
              <span>{{ phoneVisible ? detail.basic.phone : maskPhone(detail.basic.phone) }}</span>
              <el-button v-if="!phoneVisible" link type="primary" size="small" @click="viewPhone">查看</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="性别">{{ detail.basic.gender }}</el-descriptions-item>
          <el-descriptions-item label="年龄">{{ detail.basic.age }}</el-descriptions-item>
          <el-descriptions-item label="证件类型">{{ detail.basic.idType }}</el-descriptions-item>
          <el-descriptions-item label="证件号码">
            <div class="sensitive-cell">
              <span>{{ displayIdNumber() }}</span>
              <el-button v-if="!idVisible" link type="primary" size="small" @click="viewIdNumber">查看</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="证件有效开始时间">{{ detail.basic.idValidFrom }}</el-descriptions-item>
          <el-descriptions-item label="证件有效结束时间">{{ detail.basic.idValidTo }}</el-descriptions-item>
          <el-descriptions-item label="籍贯">{{ detail.basic.nativePlace }}</el-descriptions-item>
          <el-descriptions-item label="现住址" :span="2">{{ detail.basic.address }}</el-descriptions-item>
          <el-descriptions-item label="文化程度">{{ detail.basic.education }}</el-descriptions-item>
          <el-descriptions-item label="政治面貌">{{ detail.basic.politicalStatus }}</el-descriptions-item>
          <el-descriptions-item label="健康状态">{{ detail.basic.healthStatus }}</el-descriptions-item>
          <el-descriptions-item label="疾病史">{{ detail.basic.medicalHistory }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title">参建单位信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="参建单位名称" :span="2">{{ detail.unit.unitName }}</el-descriptions-item>
          <el-descriptions-item label="所属单位统一社会信用代码" :span="2">{{ detail.unit.creditCode }}</el-descriptions-item>
          <el-descriptions-item label="参建单位类型">{{ detail.unit.unitType || '—' }}</el-descriptions-item>
          <el-descriptions-item label="人员类别">{{ detail.unit.personnelCategory }}</el-descriptions-item>
          <el-descriptions-item label="工种/职务">{{ detail.unit.workType }}</el-descriptions-item>
          <el-descriptions-item label="所属班组">{{ detail.unit.team }}</el-descriptions-item>
          <el-descriptions-item label="是否班组长">{{ detail.unit.isTeamLeader ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="特种作业证书附件">
            <el-button
              v-if="detail.unit.specialCertAttachment"
              link
              type="primary"
              :icon="Document"
              @click="previewAttachment(detail.unit.specialCertAttachment)"
            >
              {{ detail.unit.specialCertAttachment }}
            </el-button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="证书有效期">{{ detail.unit.certValidTo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="劳动合同/用工书面协议附件">
            <el-button
              v-if="detail.unit.contractAttachment"
              link
              type="primary"
              :icon="Document"
              @click="previewAttachment(detail.unit.contractAttachment)"
            >
              {{ detail.unit.contractAttachment }}
            </el-button>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="合同起始日期">{{ detail.unit.contractStartDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="合同结束日期">{{ detail.unit.contractEndDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="薪酬计算方式">{{ detail.unit.salaryType }}</el-descriptions-item>
          <el-descriptions-item label="单价">{{ detail.unit.unitPrice }}</el-descriptions-item>
          <el-descriptions-item :label="REALNAME_ENTRY_LABEL">
            <span class="ap-status-tag" :class="entryStatusTagClass(detail.entryStatus)">{{ detail.entryStatus }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="通行状态">{{ detail.accessStatus }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title">安全教育</div>
        <el-table :data="detail.safetyEducation" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="type" label="教育类型" width="120" />
          <el-table-column prop="trainDate" label="培训日期" width="120" />
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
  </div>
</template>

<style scoped>
.detail-page {
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
  margin-bottom: 16px;
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

.title-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.person-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 0;
}

.person-avatar {
  background: var(--ap-primary);
  color: #fff;
  font-size: 22px;
  flex-shrink: 0;
}

.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.sensitive-cell,
.phone-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-body {
  max-width: 1120px;
}

.detail-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 20px 24px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 16px;
}
</style>
