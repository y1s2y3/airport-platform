<script setup>
import { computed } from 'vue'
import { getApplicationDetail, formatBrandApproverSnapshot } from '../../../mock/brand.js'
import BrandCandidateAttachBlock from '../../quality/brand/BrandCandidateAttachBlock.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const brandLiveDetail = computed(() => {
  const appId = props.todo?.brandApplicationId
  if (!appId || props.todo?.type !== 'brand') return null
  return getApplicationDetail(appId)
})

const brandCandidates = computed(() => {
  if (brandLiveDetail.value?.candidates?.length) return brandLiveDetail.value.candidates
  return (props.todo?.brandCandidates || []).map((c) => ({
    ...c,
    remark: c.remark || '',
    attachSlots: c.attachSlots || [],
  }))
})

const brandNodeLabel = computed(() => {
  if (props.todo?.brandNode === 'supervisor') return '待监理审'
  if (props.todo?.brandNode === 'pm') return '待项目经理审'
  return props.todo?.detail?.currentNode || ''
})
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">报审信息</div>
      <el-tag v-if="brandNodeLabel" size="small" type="warning" effect="light">
        {{ brandNodeLabel }}
      </el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="报审编号">
        {{ todo.detail?.applicationId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ todo.detail?.project || todo.projectName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="材料/设备">
        {{ todo.detail?.materialName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="材料类型">
        {{ todo.detail?.materialType || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="施工部位">
        {{ todo.detail?.usePart || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ todo.applicant || '—' }}
        <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="申请时间">
        {{ todo.applyTime || '—' }}
      </el-descriptions-item>
    </el-descriptions>
  </section>

  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">报审品牌</div>
      <el-tag size="small" type="info" effect="plain">共 {{ brandCandidates.length }} 条</el-tag>
    </div>
    <div class="brand-cand-list">
      <div
        v-for="(c, idx) in brandCandidates"
        :key="c.candidate_id || idx"
        class="brand-cand-card"
      >
        <div class="brand-cand-card-head">
          <div class="brand-cand-card-title">
            <span class="cand-badge">{{ idx + 1 }}</span>
            <el-tag v-if="c.is_primary || idx === 0" size="small" type="success" effect="plain">
              主选品牌
            </el-tag>
            <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
          </div>
        </div>
        <div class="cand-fields">
          <div class="cand-field-row">
            <span class="cand-label">品牌名称</span>
            <span class="cand-value">{{ c.brand_name || '—' }}</span>
          </div>
          <div class="cand-field-row">
            <span class="cand-label">生产厂家</span>
            <span class="cand-value">{{ c.manufacturer || '—' }}</span>
          </div>
        </div>
        <BrandCandidateAttachBlock :candidate="c" :editable="false" />
      </div>
    </div>
  </section>

  <section v-if="brandLiveDetail?.app" class="block block--panel">
    <div class="block-head">
      <div class="block-title">审批人配置</div>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="监理单位审批">
        {{ formatBrandApproverSnapshot(brandLiveDetail.app, 'supervisor') }}
      </el-descriptions-item>
      <el-descriptions-item label="项目经理审批">
        {{ formatBrandApproverSnapshot(brandLiveDetail.app, 'pm') }}
      </el-descriptions-item>
    </el-descriptions>
  </section>
</template>

<style scoped>
.brand-cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brand-cand-card {
  padding: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
}
.brand-cand-card-head {
  margin-bottom: 6px;
}
.brand-cand-card-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
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
  background: #fafbfc;
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
