<script setup>
import './mat-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import {
  getEntryDetail,
  ENTRY_TYPE_LABEL,
  STATUS_LABEL,
  statusTagType,
  formatBatchNo,
} from '../../../mock/mat.js'
import { exportMatEntryArchive } from '../../../utils/matEntryArchiveExport.js'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getEntryDetail(id) : null
})

const canExportArchive = computed(() => detail.value?.status === 'approved')
const exportLoading = ref(false)

async function onExportArchive() {
  if (!detail.value || exportLoading.value) return
  exportLoading.value = true
  try {
    const r = await exportMatEntryArchive(detail.value)
    if (!r.ok) ElMessage.warning(r.msg)
    else ElMessage.success('归档文件已导出')
  } finally {
    exportLoading.value = false
  }
}

const lineItems = computed(() => {
  if (!detail.value) return []
  const header = detail.value
  if (header.entry_type === 'equipment') {
    const rows = header.line_items?.length
      ? header.line_items
      : [
          {
            equipment_name: header.equipment_name,
            material_spec: header.model || '',
            model: header.model || '',
            quantity: header.quantity,
            unit: header.unit,
            serial_no: header.serial_no || '',
            waybill_no: header.waybill_no || '',
            batch_no: header.batch_no || '',
            unpack_items: header.unpack_items || [],
          },
        ]
    return rows.map((row, idx) => ({
      ...row,
      equipment_name: row.equipment_name || row.material_name || '',
      model: row.model || row.material_spec || '',
      purpose: row.purpose || '',
      use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
      appearance_quality: row.appearance_quality || '',
      acceptance_result: row.acceptance_result || '',
      entry_date: row.entry_date || header.submit_time || '',
      cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
      inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
      photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
      other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
      unpack_items:
        row.unpack_items?.length
          ? row.unpack_items
          : idx === 0 && header.unpack_items?.length
            ? header.unpack_items
            : [],
    }))
  }
  const rows = header.line_items?.length
    ? header.line_items
    : [
        {
          material_name: header.material_name,
          material_spec: header.material_spec || '',
          quantity: header.quantity,
          unit: header.unit,
          waybill_no: header.waybill_no || '',
          batch_no: header.batch_no || '',
        },
      ]
  return rows.map((row, idx) => ({
    ...row,
    purpose: row.purpose || '',
    use_part: row.use_part || (idx === 0 ? header.use_part : '') || '',
    appearance_quality: row.appearance_quality || '',
    acceptance_result: row.acceptance_result || '',
    entry_date: row.entry_date || header.submit_time || '',
    cert_file: row.cert_file || (idx === 0 ? header.cert_file : '') || '',
    inspect_file: row.inspect_file || (idx === 0 ? header.inspect_file : '') || '',
    photo_file: row.photo_file || (idx === 0 ? header.photo_file : '') || '',
    other_file: row.other_file || (idx === 0 ? header.other_file : '') || '',
  }))
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场管理 / 进场详情</div>
      <div class="title-row">
        <h1 class="page-title">进场详情 {{ detail?.entry_id || '' }}</h1>
        <el-tag v-if="detail?.exited" type="warning" effect="plain">已退场</el-tag>
        <el-button
          v-if="canExportArchive"
          type="primary"
          :icon="Download"
          :loading="exportLoading"
          @click="onExportArchive"
        >
          导出归档文件
        </el-button>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到进场单" />

    <template v-else>
      <h3 class="section-title">品牌与定样</h3>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
        <el-descriptions-item label="进场类型">
          {{ ENTRY_TYPE_LABEL[detail.entry_type] || '材料' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ STATUS_LABEL[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.copy_from_entry_id" label="复制来源">
          {{ detail.copy_from_entry_id }}
        </el-descriptions-item>
        <el-descriptions-item v-else-if="detail.related_reject_id" label="关联驳回原单">
          {{ detail.related_reject_id }}
        </el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand_name }}</el-descriptions-item>
        <el-descriptions-item label="生产厂家">{{ detail.manufacturer || '—' }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
        <el-descriptions-item label="关联定样">{{
          detail.sample_application_id || detail.sample_id || '—'
        }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="办结时间">{{ detail.finish_time || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.entry_type === 'material'" label="退场状态">
          <el-tag size="small" :type="detail.exited ? 'warning' : 'info'" effect="plain">
            {{ detail.exited ? '已退场' : '未退场' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="detail.entry_type !== 'equipment'">
        <h3 class="section-title">材料进场明细</h3>
        <div v-for="(row, idx) in lineItems" :key="`${row.material_name}-${idx}`" class="line-card mb">
          <div class="line-card-title">材料 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="材料名称">{{ row.material_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ row.material_spec || '—' }}</el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="使用部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ formatBatchNo(row.batch_no) }}</el-descriptions-item>
            <el-descriptions-item label="外观质量">{{ row.appearance_quality || '—' }}</el-descriptions-item>
            <el-descriptions-item label="验收结论">{{ row.acceptance_result || '—' }}</el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证">{{ row.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质量证明文件">{{ row.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ row.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="其他">{{ row.other_file || '—' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <template v-if="detail.entry_type === 'equipment'">
        <h3 class="section-title">设备进场明细</h3>
        <div
          v-for="(row, idx) in lineItems"
          :key="`${row.equipment_name}-${idx}`"
          class="line-card mb"
        >
          <div class="line-card-title">设备 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="设备名称">{{ row.equipment_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ row.model || '—' }}</el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="序列号">{{ row.serial_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="使用部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">{{ formatBatchNo(row.batch_no) }}</el-descriptions-item>
            <el-descriptions-item label="外观质量">{{ row.appearance_quality || '—' }}</el-descriptions-item>
            <el-descriptions-item label="验收结论">{{ row.acceptance_result || '—' }}</el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证">{{ row.cert_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="质量证明文件">{{ row.inspect_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="现场照片">{{ row.photo_file || '—' }}</el-descriptions-item>
            <el-descriptions-item label="其他">{{ row.other_file || '—' }}</el-descriptions-item>
          </el-descriptions>
          <h4 class="sub-title">开箱清单</h4>
          <el-row v-if="row.unpack_items?.length" :gutter="16" class="unpack-grid">
            <el-col v-for="unpackRow in row.unpack_items" :key="unpackRow.key || unpackRow.label" :span="6">
              <div class="unpack-card">
                <div class="unpack-card-head">
                  <span class="unpack-label">{{ unpackRow.label }}</span>
                  <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                    {{ unpackRow.ok ? '合格' : '不合格' }}
                  </el-tag>
                </div>
                <div class="unpack-remark">{{ unpackRow.remark || '无备注' }}</div>
              </div>
            </el-col>
          </el-row>
          <el-empty v-else description="无开箱记录" :image-size="48" class="mb" />
        </div>
      </template>

      <el-card
        v-if="detail.entry_type !== 'equipment'"
        shadow="never"
        class="mb"
        :class="{ 'exit-card': detail.exited }"
      >
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
.sub-title {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}
.exit-card :deep(.el-card__header) {
  background: #fdf6ec;
}
.muted {
  margin-left: 6px;
  color: #909399;
  font-size: 12px;
}
.line-card {
  padding: 10px 12px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.line-card-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.unpack-grid {
  margin-bottom: 8px;
}
.unpack-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}
.unpack-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.unpack-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.unpack-remark {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.mb {
  margin-bottom: 16px;
}
</style>
