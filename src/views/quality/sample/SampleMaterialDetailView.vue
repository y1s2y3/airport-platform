<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMaterialDetail,
  statusLabel,
  statusTagType,
  findBrandProjectUser,
  formatBrandProjectUserLabel,
} from '../../../mock/sample.js'
import PersonalCenterReadonlyHint from '../../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.query.id || '')
const tick = ref(0)
const detail = computed(() => {
  void tick.value
  return id.value ? getMaterialDetail(id.value) : null
})

const showReadonlyHint = computed(
  () =>
    detail.value &&
    (detail.value.status === 'pending' || detail.value.status === 'in_approval'),
)

function fileNames(list) {
  if (!Array.isArray(list)) return '—'
  const names = list.map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
  return names.length ? names.join('、') : '—'
}

function approverDetailLabel(userId, fallbackName) {
  const user = findBrandProjectUser(userId)
  if (user) return formatBrandProjectUserLabel(user)
  return fallbackName || '—'
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样报审 / 详情</div>
      <h1 class="page-title">材料定样详情 {{ id }}</h1>
    </div>

    <el-empty v-if="!detail" description="单据不存在" />

    <template v-else>
      <PersonalCenterReadonlyHint v-if="showReadonlyHint" />
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="报审编号">{{ detail.application_id }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="材料名称">{{ detail.material_name }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
        <el-descriptions-item label="施工部位">{{ detail.use_part }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">{{
            statusLabel(detail.status)
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.copy_from_application_id" label="复制来源">
          {{ detail.copy_from_application_id }}
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="section-title">材料指标说明</h3>
      <div class="text-block mb">{{ detail.indicator_desc || '—' }}</div>

      <h3 class="section-title">效果图</h3>
      <div class="text-block mb">{{ fileNames(detail.effect_images) }}</div>

      <h3 class="section-title">审批文件</h3>
      <div class="text-block mb">{{ fileNames(detail.approval_files) }}</div>

      <h3 class="section-title">审批人</h3>
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="监理审批">
          {{ approverDetailLabel(detail.supervisor_approver_user_id, detail.supervisor_approver_name) }}
        </el-descriptions-item>
        <el-descriptions-item label="项目经理审批">
          {{ approverDetailLabel(detail.pm_approver_user_id, detail.pm_approver_name) }}
        </el-descriptions-item>
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
.mb {
  margin-bottom: 12px;
}
.text-block {
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}
</style>
