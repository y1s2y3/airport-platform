<script setup>
import { computed } from 'vue'
import {
  approveStatusTagClass,
  formatSafetyLicenseExpiry,
  formatSubcontractorApproverDisplay,
} from '../../mock/subcontractorManagement'
import FileAttachmentPreview from './FileAttachmentPreview.vue'

const props = defineProps({
  detail: {
    type: Object,
    required: true,
  },
  /** 是否展示审批人、审批过程（画像弹窗为 false） */
  showApproval: {
    type: Boolean,
    default: false,
  },
  /** 弹窗内紧凑模式 */
  embedded: {
    type: Boolean,
    default: false,
  },
})

const approvalFlow = computed(() => props.detail?.approvalFlow || [])

function approverDisplay(idKey, nameKey) {
  const approvers = props.detail?.approvers || {}
  return formatSubcontractorApproverDisplay(approvers[idKey], approvers[nameKey])
}

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'warning'
  return 'info'
}

function formatLaborContractAmount(contract) {
  const amount = contract?.amount
  if (!amount) return '—'
  return /万元/.test(String(amount)) ? amount : `${amount}万元`
}
</script>

<template>
  <div class="subcontractor-detail-body" :class="{ embedded }">
    <div v-if="embedded && (detail.projectName || detail.unitType || detail.status)" class="sub-meta">
      <span v-if="detail.projectName">{{ detail.projectName }}</span>
      <span v-if="detail.unitType">{{ detail.unitType }}</span>
      <span
        v-if="detail.status && detail.status !== '画像登记'"
        class="ap-status-tag"
        :class="approveStatusTagClass(detail.status)"
      >
        {{ detail.status }}
      </span>
      <span v-if="detail.submitTime">提交：{{ detail.submitTime }}</span>
    </div>

    <section class="info-section">
      <div class="section-title">报审信息</div>
      <div class="ro-form">
        <div class="ro-row">
          <span class="ro-label">分包单位名称</span>
          <span class="ro-value">{{ detail.name || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">类型</span>
          <span class="ro-value">{{ detail.unitType || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">所属项目</span>
          <span class="ro-value">{{ detail.projectName || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">提交人</span>
          <span class="ro-value">{{ detail.submitter || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">项目负责人姓名及电话</span>
          <span class="ro-value">{{ detail.projectLeaderContact || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">安全管理人员姓名及电话</span>
          <span class="ro-value">{{ detail.safetyManagerContact || '—' }}</span>
        </div>
        <div class="ro-row ro-row--block">
          <span class="ro-label">分包组织架构说明</span>
          <div class="ro-value multiline">{{ detail.orgStructureDesc || '—' }}</div>
        </div>
        <div class="ro-row ro-row--block">
          <span class="ro-label">组织架构图</span>
          <div class="ro-value">
            <FileAttachmentPreview
              :name="detail.orgStructureChart?.fileName"
              :url="detail.orgStructureChart?.fileUrl"
              empty-text="未上传"
              size="md"
            />
          </div>
        </div>
        <div class="ro-row ro-row--block">
          <span class="ro-label">备注</span>
          <div class="ro-value multiline">{{ detail.remark || '—' }}</div>
        </div>
      </div>
    </section>

    <section class="info-section">
      <div class="section-title">资质证书</div>
      <el-table
        :data="detail.qualifications || []"
        border
        stripe
        class="ap-table"
        empty-text="暂无资质证书"
      >
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
      <div class="ro-form">
        <div class="ro-row">
          <span class="ro-label">许可证编号</span>
          <span class="ro-value">{{ detail.safetyLicense?.licenseNo || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">有效期</span>
          <span class="ro-value">{{ formatSafetyLicenseExpiry(detail.safetyLicense) || '—' }}</span>
        </div>
        <div class="ro-row ro-row--block">
          <span class="ro-label">许可证附件</span>
          <div class="ro-value">
            <FileAttachmentPreview
              :name="detail.safetyLicense?.fileName"
              :url="detail.safetyLicense?.fileUrl"
              empty-text="未上传"
              size="lg"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="info-section">
      <div class="section-title">劳务合同</div>
      <div class="ro-form">
        <div class="ro-row">
          <span class="ro-label">合同编号</span>
          <span class="ro-value">{{ detail.laborContract?.contractNo || '—' }}</span>
        </div>
        <div class="ro-row">
          <span class="ro-label">金额</span>
          <span class="ro-value">{{ formatLaborContractAmount(detail.laborContract) }}</span>
        </div>
        <div class="ro-row ro-row--block">
          <span class="ro-label">合同附件</span>
          <div class="ro-value">
            <FileAttachmentPreview
              :name="detail.laborContract?.fileName"
              :url="detail.laborContract?.fileUrl"
              empty-text="未上传"
              size="md"
            />
          </div>
        </div>
      </div>
    </section>

    <template v-if="showApproval">
      <section class="info-section">
        <div class="section-title">审批人</div>
        <div class="ro-form">
          <div class="ro-row">
            <span class="ro-label">项目经理</span>
            <span class="ro-value">{{ approverDisplay('projectManagerUserId', 'projectManagerName') }}</span>
          </div>
          <div class="ro-row">
            <span class="ro-label">项目部部长</span>
            <span class="ro-value">{{ approverDisplay('deptHeadUserId', 'deptHeadName') }}</span>
          </div>
          <div class="ro-row">
            <span class="ro-label">设计部负责人</span>
            <span class="ro-value">{{ approverDisplay('designHeadUserId', 'designHeadName') }}</span>
          </div>
          <div class="ro-row">
            <span class="ro-label">设计部部长</span>
            <span class="ro-value">{{
              approverDisplay('designDeptHeadUserId', 'designDeptHeadName')
            }}</span>
          </div>
          <div class="ro-row">
            <span class="ro-label">抄送人</span>
            <span class="ro-value">{{ approverDisplay('ccUserId', 'ccUserName') }}</span>
          </div>
        </div>
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
      </section>
    </template>
  </div>
</template>

<style scoped>
.subcontractor-detail-body.embedded .info-section:last-child {
  margin-bottom: 0;
}

.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 16px;
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

.ro-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ro-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f2f5;
  font-size: 13px;
  line-height: 1.55;
}

.ro-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.ro-row--block {
  flex-direction: column;
  gap: 8px;
}

.ro-label {
  flex: 0 0 160px;
  color: #909399;
}

.ro-row--block .ro-label {
  flex: none;
}

.ro-value {
  flex: 1;
  color: var(--ap-text, #303133);
  word-break: break-word;
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
</style>
