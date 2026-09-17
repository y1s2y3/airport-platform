<script setup>
import { computed } from 'vue'
import EngineeringWorkFormBody from '../../siteConstruction/EngineeringWorkFormBody.vue'
import '../../siteConstruction/engineering-work-page.css'
import {
  STATUS_LABEL,
  emptyCell,
  getEngineeringWork,
  statusTagType,
} from '../../../mock/engineeringWork.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const application = computed(() => {
  const id = props.todo?.engineeringWorkId || props.todo?.detail?.applicationId
  return id ? getEngineeringWork(id) : null
})

const form = computed(() => application.value || {
  snapshot: {},
  personnel_qual_desc: '',
  scheme_files: [],
  briefing_files: [],
  cert_files: [],
  remark: '',
})
</script>

<template>
  <div class="ew-todo-detail">
    <el-empty v-if="!application" description="未找到关联申报单" :image-size="64" />
    <template v-else>
      <el-descriptions :column="2" border class="info-desc mb">
        <el-descriptions-item label="申报单号">
          {{ emptyCell(application.biz_no || todo.detail?.bizNo) }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(application.status)">
            {{ STATUS_LABEL[application.status] || emptyCell(application.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目">
          {{ emptyCell(todo.detail?.project) }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ emptyCell(application.submit_time || todo.applyTime) }}
        </el-descriptions-item>
      </el-descriptions>
      <el-form label-width="168px" class="create-form" label-position="right">
        <EngineeringWorkFormBody :form="form" readonly :project-id="application.project_id" />
      </el-form>
    </template>
  </div>
</template>

<style scoped>
.ew-todo-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mb {
  margin-bottom: 12px;
}
.info-desc :deep(.el-descriptions__label) {
  width: 108px;
  white-space: nowrap;
}
</style>
