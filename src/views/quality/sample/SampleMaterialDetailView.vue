<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMaterialDetail,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/sample.js'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.query.id || '')
const isApproveMode = computed(() => route.path.includes('/approve'))
const tick = ref(0)

const detail = computed(() => {
  void tick.value
  return id.value ? getMaterialDetail(id.value) : null
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        样板管理 / {{ isApproveMode ? '材料定样审批' : '材料定样报审' }} / 详情
      </div>
      <h1 class="page-title">材料定样详情 {{ id }}</h1>
      <p v-if="isApproveMode" class="page-tip">审批请在个人中心待办办理；本页仅查看。</p>
    </div>

    <el-empty v-if="!detail" description="单据不存在" />

    <template v-else>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="报审编号">{{ detail.application_id }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="材料名称">{{ detail.material_name }}</el-descriptions-item>
        <el-descriptions-item label="使用部位">{{ detail.use_part }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">{{
            STATUS_LABEL[detail.status]
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前节点">{{
          NODE_LABEL[detail.current_node] || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="比选记录" :span="2">{{
          detail.compare_record || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="样板照片" :span="2">
          <span v-if="detail.photo_files?.length">{{ detail.photo_files.join('、') }}</span>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="section-title">审批记录</h3>
      <el-table :data="detail.approvals || []" border stripe size="small" empty-text="暂无">
        <el-table-column prop="operate_time" label="时间" width="170" />
        <el-table-column prop="node_code" label="节点" width="110" />
        <el-table-column prop="action" label="动作" width="100" />
        <el-table-column prop="operator_name" label="操作人" width="120" />
        <el-table-column prop="opinion" label="意见" min-width="160" />
      </el-table>

      <div class="form-actions">
        <el-button @click="router.back()">返回</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.section-title {
  margin: 16px 0 8px;
  font-size: 15px;
}
</style>
