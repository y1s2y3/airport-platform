<script setup>
import './brand-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getApplicationDetail,
  MATERIAL_TYPE,
  NODE_LABEL,
  pmApprove,
  statusLabel,
  statusTagType,
  supervisorApprove,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'

const route = useRoute()
const router = useRouter()
const tick = ref(0)
const opinion = ref('')

const detail = computed(() => {
  void tick.value
  return getApplicationDetail(String(route.query.id || ''))
})

const isSupervisor = computed(
  () => detail.value?.app.status === 'pending' && detail.value?.app.current_node === 'supervisor',
)
const isPm = computed(
  () => detail.value?.app.status === 'in_approval' && detail.value?.app.current_node === 'pm',
)

async function doSupervisor(action) {
  const r = supervisorApprove(detail.value.app.application_id, { action, opinion: opinion.value })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(action === 'agree' ? '已同意，流转至项目经理' : '已退回施工')
  tick.value += 1
  if (action === 'reject') router.push('/qm/brand/applications')
}

async function doPm(action) {
  const r = pmApprove(detail.value.app.application_id, {
    action,
    opinion: opinion.value,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(action === 'agree' ? '终审通过，全部品牌已写入台账' : '已退回施工')
  router.push('/qm/brand/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审审批</div>
      <h1 class="page-title">报审审批</h1>
    </div>

    <el-empty v-if="!detail" description="未找到报审单" />
    <template v-else>
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="报审编号">{{ detail.app.application_id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.app.status)">
            {{ statusLabel(detail.app.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="材料/设备">{{ detail.app.material_name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ MATERIAL_TYPE[detail.app.material_type] }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ NODE_LABEL[detail.app.current_node] }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.app.submit_time }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="sec">报审品牌</h3>
      <div
        v-for="(row, idx) in detail.candidates"
        :key="row.candidate_id"
        class="cand-card"
      >
        <div class="cand-card-head">
          <div class="cand-card-title">
            <span class="cand-badge">{{ idx + 1 }}</span>
            <el-tag v-if="idx === 0 || row.is_primary" size="small" type="success" effect="plain">
              主选品牌
            </el-tag>
            <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
          </div>
        </div>
        <div class="cand-fields">
          <div class="cand-field-row">
            <span class="cand-label">品牌名称</span>
            <span class="cand-value">{{ row.brand_name || '—' }}</span>
          </div>
          <div class="cand-field-row">
            <span class="cand-label">生产厂家</span>
            <span class="cand-value">{{ row.manufacturer || '—' }}</span>
          </div>
        </div>
        <BrandCandidateAttachBlock :candidate="row" :editable="false" />
      </div>

      <el-form v-if="isSupervisor || isPm" label-width="100px">
        <el-form-item label="审批意见">
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            placeholder="退回时必填；同意可选"
            style="max-width: 520px"
          />
        </el-form-item>
        <el-form-item v-if="isSupervisor">
          <el-button type="primary" @click="doSupervisor('agree')">同意</el-button>
          <el-button type="danger" @click="doSupervisor('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
        <el-form-item v-else-if="isPm">
          <el-button type="primary" @click="doPm('agree')">同意</el-button>
          <el-button type="danger" @click="doPm('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
      </el-form>
      <el-button v-else @click="router.back()">返回</el-button>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.sec {
  margin: 12px 0 8px;
  font-size: 15px;
}
.cand-card {
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.cand-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.cand-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
}
.cand-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}
.cand-field-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.5;
}
.cand-label {
  flex: 0 0 72px;
  font-size: 13px;
  color: #909399;
}
.cand-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #303133;
  word-break: break-all;
}
</style>
