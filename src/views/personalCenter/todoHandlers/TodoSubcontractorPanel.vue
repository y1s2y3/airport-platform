<script setup>
import { computed } from 'vue'
import {
  findSubcontractorApplication,
  formatSafetyLicenseExpiry,
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

const currentNodeLabel = computed(() => {
  const flow = detail.value?.approvalFlow || []
  const current = flow.find((s) => s.status === 'current')
  return current?.title || props.todo?.detail?.currentNode || '待审批'
})

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
      <!-- 报审信息：对齐品牌/样板等处置详情 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">报审信息</div>
          <el-tag size="small" type="warning" effect="light">{{ currentNodeLabel }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small" class="desc-panel">
          <el-descriptions-item label="报审编号">
            {{ todo.detail?.applicationId || todo.subcontractorApplicationId || detail.id || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="所属项目">
            {{ detail.projectName || todo.detail?.project || todo.projectName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="分包单位名称">
            {{ detail.name || todo.detail?.unitName || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ detail.unitType || todo.detail?.unitType || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="项目负责人姓名及电话" :span="2">
            {{ detail.projectLeaderContact || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="安全管理人员姓名及电话" :span="2">
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
          <el-descriptions-item label="申请人">
            {{ detail.submitter || todo.applicant || '—' }}
            <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ detail.submitTime || todo.applyTime || '—' }}
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
          size="small"
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
        <el-descriptions :column="2" border size="small" class="desc-panel">
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
              size="sm"
            />
          </el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">劳务合同</div>
        </div>
        <el-descriptions :column="2" border size="small" class="desc-panel">
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
              size="sm"
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

.multiline {
  white-space: pre-wrap;
  line-height: 1.55;
  word-break: break-all;
}
</style>
