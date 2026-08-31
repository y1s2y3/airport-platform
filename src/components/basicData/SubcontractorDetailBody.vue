<script setup>
import {
  approveStatusTagClass,
  formatSafetyLicenseExpiry,
} from '../../mock/subcontractorManagement'
import FileAttachmentPreview from './FileAttachmentPreview.vue'
import SubcontractorApprovalFlow from './SubcontractorApprovalFlow.vue'

defineProps({
  detail: {
    type: Object,
    required: true,
  },
  /** 是否展示审批流程（画像弹窗为 false） */
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

function formatLaborContractAmount(contract) {
  const amount = contract?.amount
  if (!amount) return '—'
  return /万元/.test(String(amount)) ? amount : `${amount}万元`
}
</script>

<template>
  <div class="subcontractor-detail-body" :class="{ embedded }">
    <section class="info-section">
      <div class="section-title">报审信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="报审编号">{{ detail.id || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <span
            v-if="detail.status"
            class="ap-status-tag"
            :class="approveStatusTagClass(detail.status)"
          >
            {{ detail.status }}
          </span>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="分包单位名称">{{ detail.name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.unitType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属项目" :span="2">{{ detail.projectName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交人">{{ detail.submitter || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submitTime || '—' }}</el-descriptions-item>
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
        <el-descriptions-item label="合同附件" :span="2">
          <FileAttachmentPreview
            :name="detail.laborContract?.fileName"
            :url="detail.laborContract?.fileUrl"
            empty-text="未上传"
            size="md"
          />
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <SubcontractorApprovalFlow
      v-if="showApproval"
      :approval-flow="detail.approvalFlow || []"
    />
  </div>
</template>

<style scoped>
.subcontractor-detail-body.embedded .info-section:last-child {
  margin-bottom: 0;
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
</style>
