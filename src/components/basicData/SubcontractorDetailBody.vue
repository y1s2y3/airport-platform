<script setup>
import { computed } from 'vue'
import {
  approveStatusTagClass,
  formatSafetyLicenseExpiry,
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
      <el-descriptions :column="2" border :size="embedded ? 'default' : 'default'">
        <el-descriptions-item label="分包单位名称">{{ detail.name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.unitType || '—' }}</el-descriptions-item>
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
        <el-descriptions-item label="组织架构图" :span="2">
          <FileAttachmentPreview
            :name="detail.orgStructureChart?.fileName"
            :url="detail.orgStructureChart?.fileUrl"
            empty-text="未上传"
            size="md"
          />
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          <div class="multiline">{{ detail.remark || '—' }}</div>
        </el-descriptions-item>
      </el-descriptions>
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
      <el-descriptions :column="2" border>
        <el-descriptions-item label="许可证编号">
          {{ detail.safetyLicense?.licenseNo || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="有效期">
          {{ formatSafetyLicenseExpiry(detail.safetyLicense) || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="许可证附件" :span="2">
          <FileAttachmentPreview
            :name="detail.safetyLicense?.fileName"
            :url="detail.safetyLicense?.fileUrl"
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
          {{ formatLaborContractAmount(detail.laborContract) }}
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

    <template v-if="showApproval">
      <section class="info-section">
        <div class="section-title">审批人</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="项目经理">
            {{ detail.approvers?.projectManagerName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目部部长">
            {{ detail.approvers?.deptHeadName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="设计部负责人">
            {{ detail.approvers?.designHeadName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="设计部部长">
            {{ detail.approvers?.designDeptHeadName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="抄送" :span="2">
            抄送副指挥长（朱指挥）
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
