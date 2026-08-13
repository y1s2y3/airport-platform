<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getMaterialDetail,
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

const sampleSpec = computed(() => detail.value?.sample_spec || null)
const compareItems = computed(() =>
  Array.isArray(detail.value?.compare_items) ? detail.value.compare_items : [],
)
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        样板管理 / {{ isApproveMode ? '材料定样审批' : '材料定样报审' }} / 详情
      </div>
      <h1 class="page-title">材料定样详情 {{ id }}</h1>
    </div>

    <el-empty v-if="!detail" description="单据不存在" />

    <template v-else>
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="报审编号">{{ detail.application_id }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="材料名称">{{ detail.material_name }}</el-descriptions-item>
        <el-descriptions-item label="施工部位">{{ detail.use_part }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">{{
            STATUS_LABEL[detail.status]
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="section-title">定版定样</h3>
      <el-descriptions v-if="sampleSpec" :column="2" border class="mb" size="small">
        <el-descriptions-item label="材料规格" :span="2">
          {{ sampleSpec.material_spec || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="供应商" :span="2">
          {{ sampleSpec.supplier || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="效果图" :span="2">
          <span v-if="sampleSpec.effect_images?.length">{{
            sampleSpec.effect_images.join('、')
          }}</span>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="无定版定样资料" :image-size="48" class="mb" />

      <h3 class="section-title">比选记录</h3>
      <el-table
        :data="compareItems"
        border
        stripe
        size="small"
        empty-text="无比选记录"
        class="mb"
      >
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="material_name" label="材料名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="material_spec" label="材料规格" min-width="180" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" min-width="140" show-overflow-tooltip />
        <el-table-column label="效果图" min-width="180">
          <template #default="{ row }">
            {{ row.effect_images?.length ? row.effect_images.join('、') : '—' }}
          </template>
        </el-table-column>
      </el-table>

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
</style>
