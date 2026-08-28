<script setup>
import { computed } from 'vue'
import { findSubcontractorApplication } from '../../../mock/subcontractorManagement.js'
import FileAttachmentPreview from '../../../components/basicData/FileAttachmentPreview.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const subcontractorLiveDetail = computed(() => {
  const id = props.todo?.subcontractorApplicationId
  if (!id || props.todo?.type !== 'subcontractor') return null
  return findSubcontractorApplication(id)
})
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">分包单位报审信息</div>
      <el-tag size="small" type="warning" effect="light">
        {{
          subcontractorLiveDetail?.approvalFlow?.find((s) => s.status === 'current')?.title ||
          todo.detail?.currentNode ||
          '待审批'
        }}
      </el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="报审编号">
        {{ todo.detail?.applicationId || todo.subcontractorApplicationId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ subcontractorLiveDetail?.projectName || todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="分包单位">
        {{ subcontractorLiveDetail?.name || todo.detail?.unitName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="类型">
        {{ subcontractorLiveDetail?.unitType || todo.detail?.unitType || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="项目负责人">
        {{
          subcontractorLiveDetail?.projectLeaderContact ||
          todo.detail?.projectLeaderContact ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="安全管理人员">
        {{
          subcontractorLiveDetail?.safetyManagerContact ||
          todo.detail?.safetyManagerContact ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="安全许可证编号" :span="2">
        {{
          subcontractorLiveDetail?.safetyLicense?.licenseNo ||
          todo.detail?.safetyLicenseNo ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="组织架构说明" :span="2">
        {{ subcontractorLiveDetail?.orgStructureDesc || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="组织架构图" :span="2">
        <FileAttachmentPreview
          :name="subcontractorLiveDetail?.orgStructureChart?.fileName"
          :url="subcontractorLiveDetail?.orgStructureChart?.fileUrl"
          empty-text="未上传"
          size="sm"
        />
      </el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">
        {{ subcontractorLiveDetail?.remark || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">{{ todo.applicant || '—' }}</el-descriptions-item>
      <el-descriptions-item label="申请时间">{{ todo.applyTime || '—' }}</el-descriptions-item>
    </el-descriptions>
  </section>
</template>
