<script setup>
import './mat-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEntryDetail, STATUS_LABEL, statusTagType } from '../../../mock/mat.js'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getEntryDetail(id) : null
})

const lineItems = computed(() => {
  if (!detail.value) return []
  if (detail.value.line_items?.length) return detail.value.line_items
  return [
    {
      material_name: detail.value.material_name,
      material_spec: detail.value.material_spec || '—',
      quantity: detail.value.quantity,
      unit: detail.value.unit,
      waybill_no: detail.value.waybill_no || '',
      batch_no: detail.value.batch_no || '',
    },
  ]
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 进场详情</div>
      <div class="title-row">
        <h1 class="page-title">进场详情 {{ detail?.entry_id || '' }}</h1>
        <el-tag v-if="detail?.exited" type="warning" effect="plain">已退场</el-tag>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到进场单" />

    <template v-else>
      <h3 class="section-title">定样与品牌</h3>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
        <el-descriptions-item label="审批状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ STATUS_LABEL[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.related_reject_id" label="关联驳回原单">
          <el-button
            link
            type="primary"
            @click="router.push(`/qm/mat/applications/detail?id=${detail.related_reject_id}`)"
          >
            {{ detail.related_reject_id }}
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="关联定样">{{ detail.sample_id || '—' }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="材料名称">{{ detail.material_name }}</el-descriptions-item>
        <el-descriptions-item label="施工部位">{{ detail.use_part || '—' }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand_name }}</el-descriptions-item>
        <el-descriptions-item label="品牌一致">
          <el-tag size="small" :type="detail.brand_match ? 'success' : 'danger'">
            {{ detail.brand_match ? '一致' : '不一致' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="生产厂家">{{ detail.manufacturer || '—' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="办结时间">{{ detail.finish_time || '—' }}</el-descriptions-item>
        <el-descriptions-item label="退场状态">
          <el-tag size="small" :type="detail.exited ? 'warning' : 'info'" effect="plain">
            {{ detail.exited ? '已退场' : '未退场' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <h3 class="section-title">进场信息</h3>
      <el-table :data="lineItems" border stripe size="small" empty-text="无进场明细" class="mb">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="material_name" label="材料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="material_spec" label="材料规格" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.material_spec || '—' }}</template>
        </el-table-column>
        <el-table-column label="数量" width="90">
          <template #default="{ row }">{{ row.quantity }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="waybill_no" label="运单号" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.waybill_no || '—' }}</template>
        </el-table-column>
        <el-table-column prop="batch_no" label="批次号" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.batch_no || '—' }}</template>
        </el-table-column>
      </el-table>

      <h3 class="section-title">附件</h3>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="合格证">{{ detail.cert_file || '—' }}</el-descriptions-item>
        <el-descriptions-item label="质检报告">{{ detail.inspect_file || '—' }}</el-descriptions-item>
        <el-descriptions-item label="现场照片">{{ detail.photo_file || '—' }}</el-descriptions-item>
        <el-descriptions-item label="送检结果">
          {{
            detail.inspect_result_checked
              ? detail.inspect_result_file || '已勾选未上传'
              : '未勾选'
          }}
        </el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="mb" :class="{ 'exit-card': detail.exited }">
        <template #header>
          <div class="title-row">
            <span>退场信息</span>
            <el-tag v-if="detail.exited" size="small" type="warning">已登记退场</el-tag>
          </div>
        </template>
        <el-empty
          v-if="!detail.exited || !detail.exit"
          description="尚未登记退场"
          :image-size="56"
        />
        <el-descriptions v-else :column="2" border size="small">
          <el-descriptions-item label="退场单号">{{ detail.exit.exit_id }}</el-descriptions-item>
          <el-descriptions-item label="登记人">{{ detail.exit.operator || '—' }}</el-descriptions-item>
          <el-descriptions-item label="退场数量">
            {{ detail.exit.exit_qty }}{{ detail.unit }}
            <span class="muted">（进场 {{ detail.quantity }}{{ detail.unit }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ detail.exit.exit_time }}</el-descriptions-item>
          <el-descriptions-item label="退场原因" :span="2">{{ detail.exit.reason }}</el-descriptions-item>
          <el-descriptions-item label="退场照片" :span="2">
            {{ detail.exit.photo_file || '未上传' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <h3 class="section-title">审批记录</h3>
      <el-table :data="detail.approvals" stripe border empty-text="暂无审批记录">
        <el-table-column prop="time" label="时间" width="170" />
        <el-table-column prop="operator" label="处理人" width="120" />
        <el-table-column label="动作" width="100">
          <template #default="{ row }">
            {{ row.action === 'agree' ? '同意' : '退回' }}
          </template>
        </el-table-column>
        <el-table-column prop="opinion" label="意见" min-width="200" />
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.exit-card :deep(.el-card__header) {
  background: #fdf6ec;
}
.muted {
  margin-left: 6px;
  color: #909399;
  font-size: 12px;
}
.mb {
  margin-bottom: 16px;
}
</style>
