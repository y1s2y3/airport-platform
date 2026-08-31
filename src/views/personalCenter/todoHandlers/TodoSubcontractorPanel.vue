<script setup>
import { computed } from 'vue'
import {
  findSubcontractorApplication,
  formatSafetyLicenseExpiry,
  approveStatusTagClass,
} from '../../../mock/subcontractorManagement.js'
import FileAttachmentPreview from '../../../components/basicData/FileAttachmentPreview.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const detail = computed(() => {
  const id = props.todo?.subcontractorApplicationId
  if (!id || props.todo?.type !== 'subcontractor') return null
  return findSubcontractorApplication(id)
})

const applicationId = computed(
  () =>
    props.todo.detail?.applicationId ||
    props.todo.subcontractorApplicationId ||
    detail.value?.id ||
    '—',
)

function formatLaborContractAmount(contract) {
  const amount = contract?.amount
  if (!amount) return '—'
  return /万元/.test(String(amount)) ? amount : `${amount}万元`
}
</script>

<template>
  <div class="subcontractor-todo">
    <el-empty v-if="!detail" description="未找到关联报审单" :image-size="64" />

    <template v-else>
      <!-- 报审信息：与分包详情页 SubcontractorDetailBody 字段布局一致 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">报审信息</div>
        </div>
        <el-descriptions :column="2" border class="info-desc">
          <el-descriptions-item label="报审编号">{{ applicationId }}</el-descriptions-item>
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
          <el-descriptions-item label="分包单位名称">
            {{ detail.name || todo.detail?.unitName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ detail.unitType || todo.detail?.unitType || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="所属项目" :span="2">
            {{ detail.projectName || todo.detail?.project || todo.projectName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="提交人">
            {{ detail.submitter || todo.applicant || '—' }}
            <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ detail.submitTime || todo.applyTime || '—' }}
          </el-descriptions-item>
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
              size="sm"
            />
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            <div class="multiline">{{ detail.remark || '—' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">资质证书</div>
          <el-tag size="small" type="info" effect="plain">
            共 {{ (detail.qualifications || []).length }} 条
          </el-tag>
        </div>
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

      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">安全许可证</div>
        </div>
        <el-descriptions :column="2" border class="info-desc">
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

      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">劳务合同</div>
        </div>
        <el-descriptions :column="2" border class="info-desc">
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
    </template>
  </div>
</template>

<style scoped>
.subcontractor-todo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 与详情页 el-descriptions 默认字号一致（非 size=small） */
.info-desc :deep(.el-descriptions__label) {
  color: #909399;
  font-size: 14px;
}

.info-desc :deep(.el-descriptions__content) {
  font-size: 14px;
  color: var(--ap-text, #303133);
}

.multiline {
  white-space: pre-wrap;
  line-height: 1.55;
  word-break: break-all;
}
</style>
