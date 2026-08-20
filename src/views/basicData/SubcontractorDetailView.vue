<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getSubcontractorDetail,
  approveStatusTagClass,
} from '../../mock/subcontractorManagement'
import FileAttachmentPreview from '../../components/basicData/FileAttachmentPreview.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected } = useCurrentProject()
const detail = ref(null)

onMounted(() => {
  detail.value = getSubcontractorDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到分包单位报审信息')
    router.replace({ name: 'SubcontractorList' })
  }
})

const pageListTitle = computed(() => (isHqSelected.value ? '分包单位管理' : '分包单位报审'))

const approvalFlow = computed(() => detail.value?.approvalFlow || [])

function goBack() {
  router.push({ name: 'SubcontractorList' })
}

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'warning'
  return 'info'
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / {{ pageListTitle }} / 详情</div>
      <div class="page-heading">
        <div class="title-block">
          <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
          <div>
            <h1 class="page-title">{{ detail.name }}</h1>
            <div class="sub-meta">
              <span>{{ detail.projectName }}</span>
              <span>{{ detail.unitType }}</span>
              <span class="ap-status-tag" :class="approveStatusTagClass(detail.status)">{{ detail.status }}</span>
              <span v-if="detail.submitTime">提交：{{ detail.submitTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="info-section">
      <div class="section-title">报审信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="分包单位名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.unitType }}</el-descriptions-item>
        <el-descriptions-item label="所属项目">{{ detail.projectName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交人">{{ detail.submitter || '—' }}</el-descriptions-item>
        <el-descriptions-item label="项目负责人姓名及电话">
          {{ detail.projectLeaderContact || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="安全管理人员姓名及电话">
          {{ detail.safetyManagerContact || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="分包组织架构说明" :span="2">
          <div class="multiline">{{ detail.orgStructureDesc || '—' }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="info-section">
      <div class="section-title">资质证书</div>
      <el-table :data="detail.qualifications || []" border stripe class="ap-table" empty-text="暂无资质证书">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="certNo" label="证书编号" min-width="180" show-overflow-tooltip />
        <el-table-column label="附件" min-width="220">
          <template #default="{ row }">
            <FileAttachmentPreview
              :name="row.fileName"
              :url="row.fileUrl"
              empty-text="未上传"
              size="sm"
            />
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="info-section">
      <div class="section-title">安全许可证</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="许可证编号">
          {{ detail.safetyLicense?.licenseNo || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="有效期">
          {{ detail.safetyLicense?.expiry || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="照片" :span="2">
          <FileAttachmentPreview
            :name="detail.safetyLicense?.photoName"
            :url="detail.safetyLicense?.photoUrl"
            empty-text="未上传"
            size="lg"
          />
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="info-section">
      <div class="section-title">劳务合同</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="合同编号">
          {{ detail.laborContract?.contractNo || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="金额">
          {{
            detail.laborContract?.amount
              ? /万元/.test(detail.laborContract.amount)
                ? detail.laborContract.amount
                : `${detail.laborContract.amount}万元`
              : '—'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="附件" :span="2">
          <FileAttachmentPreview
            :name="detail.laborContract?.fileName"
            :url="detail.laborContract?.fileUrl"
            empty-text="未上传"
            size="md"
          />
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="info-section">
      <div class="section-title">审批过程</div>
      <el-empty v-if="!approvalFlow.length" description="暂无审批记录" :image-size="64" />
      <el-timeline v-else class="flow-timeline">
        <el-timeline-item
          v-for="(step, index) in approvalFlow"
          :key="`${step.nodeKey || step.title}-${index}`"
          :type="flowType(step.status)"
          :hollow="step.status === 'pending'"
          :timestamp="step.time || '待进行'"
          placement="top"
        >
          <div class="flow-card" :class="step.status">
            <div class="flow-title">
              {{ step.title }}
              <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
              <el-tag v-if="step.isCc" size="small" type="info" effect="plain">抄送</el-tag>
            </div>
            <div class="flow-meta">处理人：{{ step.user || '—' }}</div>
            <div v-if="step.remark" class="flow-remark">{{ step.remark }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <p class="approve-tip">审批操作请在「个人中心 → 待办」中办理，本页仅展示进度。</p>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 20px 24px 28px;
}

.page-header {
  margin-bottom: 20px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.title-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 0 0 6px;
}

.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.info-section {
  margin-bottom: 20px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}

.section-title {
  margin-bottom: 14px;
  padding-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  border-left: 3px solid var(--ap-primary);
}

.multiline {
  white-space: pre-wrap;
  line-height: 1.6;
}

.flow-timeline {
  padding-left: 4px;
}

.flow-card {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f8f9fb;
}

.flow-card.current {
  background: #fff7e8;
}

.flow-card.done {
  background: #f3faf5;
}

.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--ap-text);
}

.flow-meta,
.flow-remark {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.approve-tip {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
