<script setup>
import { computed } from 'vue'
import {
  getApplicationDetail,
  MATERIAL_TYPE,
  statusLabel,
  statusTagType,
} from '../../../mock/brand.js'
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

const app = computed(() => brandLiveDetail.value?.app || null)

const brandCandidates = computed(() => {
  if (brandLiveDetail.value?.candidates?.length) return brandLiveDetail.value.candidates
  return (props.todo?.brandCandidates || []).map((c) => ({
    ...c,
    remark: c.remark || '',
    attachSlots: c.attachSlots || [],
  }))
})

const materialTypeText = computed(() => {
  if (app.value?.material_type) return MATERIAL_TYPE[app.value.material_type] || app.value.material_type
  return props.todo?.detail?.materialType || '—'
})
</script>

<template>
  <!-- 材料/设备信息：字段与字号对齐品牌报审详情 -->
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">材料/设备信息</div>
    </div>
    <el-descriptions :column="2" border class="info-desc">
      <el-descriptions-item label="报审编号">
        {{ app?.application_id || todo.detail?.applicationId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag v-if="app?.status" size="small" :type="statusTagType(app.status)">
          {{ statusLabel(app.status) }}
        </el-tag>
        <span v-else>—</span>
      </el-descriptions-item>
      <el-descriptions-item label="材料/设备名称">
        {{ app?.material_name || todo.detail?.materialName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="类型">{{ materialTypeText }}</el-descriptions-item>
      <el-descriptions-item label="施工部位">
        {{ app?.use_part || todo.detail?.usePart || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="所属项目">
        {{ todo.detail?.project || todo.projectName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ app?.applicant_name || todo.applicant || '—' }}
        <span v-if="todo.dept" class="meta-sep">· {{ todo.dept }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="提交时间">
        {{ app?.submit_time || todo.applyTime || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="办结时间" :span="2">{{ app?.finish_time || '—' }}</el-descriptions-item>
      <el-descriptions-item v-if="app?.remark" label="备注" :span="2">
        {{ app.remark }}
      </el-descriptions-item>
    </el-descriptions>
  </section>

  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">报审品牌</div>
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
        <el-descriptions :column="2" border class="cand-desc info-desc">
          <el-descriptions-item label="品牌名称">{{ c.brand_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="生产厂家">{{ c.manufacturer || '—' }}</el-descriptions-item>
        </el-descriptions>
        <BrandCandidateAttachBlock :candidate="c" :editable="false" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.brand-cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-cand-card {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.brand-cand-card-head {
  margin-bottom: 12px;
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

.cand-desc {
  margin-bottom: 12px;
}

/* 与详情页 el-descriptions 默认字号一致 */
.info-desc :deep(.el-descriptions__label) {
  color: #909399;
  font-size: 14px;
}

.info-desc :deep(.el-descriptions__content) {
  font-size: 14px;
  color: var(--ap-text, #303133);
}
</style>
