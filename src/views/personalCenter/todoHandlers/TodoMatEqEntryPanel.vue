<script setup>
import { computed } from 'vue'
import {
  getEntryDetail,
  formatBatchNo,
  ENTRY_TYPE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/mat.js'
import FileAttachmentPreview from '../../../components/basicData/FileAttachmentPreview.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

const entryDetail = computed(() => {
  const id = props.todo?.matEntryId || props.todo?.eqEntryId
  if (!id) return null
  return getEntryDetail(id)
})

const isEquipment = computed(
  () =>
    entryDetail.value?.entry_type === 'equipment' ||
    props.todo?.entryType === 'equipment' ||
    props.todo?.detail?.entryType === 'equipment' ||
    props.todo?.type === 'eq_entry',
)

const panelTitle = '材料设备进场报验信息'

const statusLabel = computed(() => {
  const s = entryDetail.value?.status
  if (!s) return props.todo?.detail?.currentNode || '监理审批'
  return STATUS_LABEL[s] || s
})

/** 与进场详情页一致：多组明细 + 表头附件回填首组 */
const lineItems = computed(() => {
  const header = entryDetail.value
  if (!header) return []
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
    inspect_result_checked: !!(
      row.inspect_result_checked ??
      (idx === 0 ? header.inspect_result_checked : false)
    ),
    inspect_result_file:
      row.inspect_result_file ||
      (idx === 0 && header.inspect_result_checked ? header.inspect_result_file : '') ||
      '',
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
    inspect_result_checked: !!(
      row.inspect_result_checked ??
      (idx === 0 ? header.inspect_result_checked : false)
    ),
    inspect_result_file:
      row.inspect_result_file ||
      (idx === 0 && header.inspect_result_checked ? header.inspect_result_file : '') ||
      '',
  }))
})
</script>

<template>
  <section class="block block--panel mat-todo-panel">
    <div class="block-head">
      <div class="block-title">{{ panelTitle }}</div>
    </div>

    <el-empty v-if="!entryDetail" description="未找到关联进场单" :image-size="64" />

    <template v-else>
      <!-- 品牌与定样（字号对齐进场详情；审批状态置于本模块内） -->
      <div class="section-label">品牌与定样</div>
      <el-descriptions :column="2" border class="info-desc">
        <el-descriptions-item label="进场单号">{{ entryDetail.entry_no }}</el-descriptions-item>
        <el-descriptions-item label="进场类型">
          {{ ENTRY_TYPE_LABEL[entryDetail.entry_type] || (isEquipment ? '设备' : '材料') }}
        </el-descriptions-item>
        <el-descriptions-item label="审批状态">
          <el-tag size="small" :type="statusTagType(entryDetail.status) || 'warning'">
            {{ statusLabel }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目">
          {{ entryDetail.project_label || todo.detail?.project || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="品牌">
          {{ entryDetail.brand_name || todo.detail?.brandName || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="生产厂家">
          {{ entryDetail.manufacturer || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="供应商">
          {{ entryDetail.supplier || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="关联定样">
          {{
            entryDetail.sample_application_id ||
            todo.detail?.sampleId ||
            '—'
          }}
        </el-descriptions-item>
        <el-descriptions-item label="申请人">
          {{ entryDetail.applicant_name || todo.applicant || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ entryDetail.submit_time || todo.applyTime || '—' }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 材料进场明细：多组卡片 -->
      <template v-if="!isEquipment">
        <div class="section-label">材料进场明细</div>
        <div
          v-for="(row, idx) in lineItems"
          :key="`mat-${row.material_name || idx}-${idx}`"
          class="line-card"
        >
          <div class="line-card-title">材料 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border class="info-desc">
            <el-descriptions-item label="材料名称">
              {{ row.material_name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="规格型号">
              {{ row.material_spec || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">
              {{ formatBatchNo(row.batch_no) }}
            </el-descriptions-item>
            <el-descriptions-item label="外观质量">
              {{ row.appearance_quality || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="验收结论">
              {{ row.acceptance_result || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证" :span="2">
              <FileAttachmentPreview :name="row.cert_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="质量证明文件" :span="2">
              <FileAttachmentPreview :name="row.inspect_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="现场照片" :span="2">
              <FileAttachmentPreview :name="row.photo_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="其他" :span="2">
              <FileAttachmentPreview :name="row.other_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="已完成送检">
              {{ row.inspect_result_checked ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="送检附件">
              <template v-if="row.inspect_result_checked">
                <FileAttachmentPreview :name="row.inspect_result_file" empty-text="未上传" />
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </template>

      <!-- 设备进场明细：多组卡片 + 开箱 -->
      <template v-else>
        <div class="section-label">设备进场明细</div>
        <div
          v-for="(row, idx) in lineItems"
          :key="`eq-${row.equipment_name || idx}-${idx}`"
          class="line-card"
        >
          <div class="line-card-title">设备 {{ idx + 1 }}</div>
          <el-descriptions :column="2" border class="info-desc">
            <el-descriptions-item label="设备名称">
              {{ row.equipment_name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="规格型号">{{ row.model || '—' }}</el-descriptions-item>
            <el-descriptions-item label="数量">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
            <el-descriptions-item label="序列号">{{ row.serial_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="用途">{{ row.purpose || '—' }}</el-descriptions-item>
            <el-descriptions-item label="施工部位">{{ row.use_part || '—' }}</el-descriptions-item>
            <el-descriptions-item label="运单号">{{ row.waybill_no || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次号">
              {{ formatBatchNo(row.batch_no) }}
            </el-descriptions-item>
            <el-descriptions-item label="外观质量">
              {{ row.appearance_quality || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="验收结论">
              {{ row.acceptance_result || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ row.entry_date || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合格证" :span="2">
              <FileAttachmentPreview :name="row.cert_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="质量证明文件" :span="2">
              <FileAttachmentPreview :name="row.inspect_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="现场照片" :span="2">
              <FileAttachmentPreview :name="row.photo_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="其他" :span="2">
              <FileAttachmentPreview :name="row.other_file" empty-text="未上传" />
            </el-descriptions-item>
            <el-descriptions-item label="已完成送检">
              {{ row.inspect_result_checked ? '是' : '否' }}
            </el-descriptions-item>
            <el-descriptions-item label="送检附件">
              <template v-if="row.inspect_result_checked">
                <FileAttachmentPreview :name="row.inspect_result_file" empty-text="未上传" />
              </template>
              <template v-else>—</template>
            </el-descriptions-item>
          </el-descriptions>
          <div class="sub-label">开箱清单</div>
          <el-row v-if="row.unpack_items?.length" :gutter="16">
            <el-col
              v-for="unpackRow in row.unpack_items"
              :key="unpackRow.key || unpackRow.label"
              :xs="24"
              :sm="12"
              :md="6"
            >
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
          <div v-else class="muted-empty">无开箱记录</div>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
/* 字号对齐进场详情：分区标题 16px，描述列表默认 14px（非 size=small） */
.mat-todo-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-label {
  margin: 16px 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.section-label:first-of-type {
  margin-top: 0;
}

.line-card {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.line-card-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.sub-label {
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
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
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.unpack-remark {
  margin-top: 6px;
  font-size: 13px;
  color: #909399;
}

.muted-empty {
  margin-bottom: 8px;
  font-size: 13px;
  color: #909399;
}

.info-desc :deep(.el-descriptions__label) {
  color: #909399;
  font-size: 14px;
}

.info-desc :deep(.el-descriptions__content) {
  font-size: 14px;
  color: #303133;
}
</style>
