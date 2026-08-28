<script setup>
import { computed } from 'vue'
import { getEntryDetail, formatBatchNo } from '../../../mock/mat.js'
import { getEntryDetail as getEqEntryDetail } from '../../../mock/eq.js'

const props = defineProps({
  todo: { type: Object, required: true },
})

const isEquipment = computed(() => props.todo?.type === 'eq_entry')

const entryDetail = computed(() => {
  const id = isEquipment.value ? props.todo?.eqEntryId : props.todo?.matEntryId
  if (!id) return null
  return isEquipment.value ? getEqEntryDetail(id) : getEntryDetail(id)
})

const panelTitle = computed(() =>
  isEquipment.value ? '设备进场报验信息' : '材料进场报验信息',
)
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">{{ panelTitle }}</div>
      <el-tag size="small" type="warning" effect="light">审核中</el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="进场单号">
        {{
          entryDetail?.entry_id ||
          todo.detail?.entryId ||
          todo.matEntryId ||
          todo.eqEntryId ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ entryDetail?.project_label || todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item :label="isEquipment ? '设备名称' : '材料名称'">
        {{
          isEquipment
            ? entryDetail?.equipment_name || todo.detail?.equipmentName || '—'
            : entryDetail?.material_name || todo.detail?.materialName || '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="品牌">
        {{ entryDetail?.brand_name || todo.detail?.brandName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="定样单号">
        {{ entryDetail?.sample_id || todo.detail?.sampleId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="数量">
        <template v-if="entryDetail">
          {{ entryDetail.quantity }}{{ entryDetail.unit }}
        </template>
        <template v-else>{{ todo.detail?.quantity || '—' }}</template>
      </el-descriptions-item>
      <el-descriptions-item label="供应商">
        {{ entryDetail?.supplier || '—' }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- 材料明细 -->
    <div
      v-if="!isEquipment && entryDetail?.line_items?.length"
      class="mat-line-wrap"
      style="margin-top: 12px"
    >
      <div class="block-title" style="margin-bottom: 8px">材料进场明细</div>
      <el-table :data="entryDetail.line_items" border stripe size="small">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="material_name" label="材料名称" min-width="110" show-overflow-tooltip />
        <el-table-column prop="material_spec" label="规格型号" min-width="120" show-overflow-tooltip />
        <el-table-column label="数量" width="90">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column prop="purpose" label="用途" min-width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.purpose || '—' }}</template>
        </el-table-column>
        <el-table-column prop="use_part" label="使用部位" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.use_part || '—' }}</template>
        </el-table-column>
        <el-table-column label="批次号" width="90">
          <template #default="{ row }">{{ formatBatchNo(row.batch_no) }}</template>
        </el-table-column>
        <el-table-column prop="appearance_quality" label="外观质量" width="90">
          <template #default="{ row }">{{ row.appearance_quality || '—' }}</template>
        </el-table-column>
        <el-table-column prop="acceptance_result" label="验收结论" width="90">
          <template #default="{ row }">{{ row.acceptance_result || '—' }}</template>
        </el-table-column>
        <el-table-column prop="entry_date" label="进场日期" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.entry_date || '—' }}</template>
        </el-table-column>
        <el-table-column label="合格证" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.cert_file || entryDetail.cert_file || '—' }}</template>
        </el-table-column>
        <el-table-column label="质量证明文件" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.inspect_file || entryDetail.inspect_file || '—' }}</template>
        </el-table-column>
        <el-table-column label="现场照片" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.photo_file || entryDetail.photo_file || '—' }}</template>
        </el-table-column>
        <el-table-column label="其他" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.other_file || entryDetail.other_file || '—' }}</template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 设备明细 -->
    <div
      v-if="isEquipment && entryDetail?.line_items?.length"
      class="mat-line-wrap"
      style="margin-top: 12px"
    >
      <div class="block-title" style="margin-bottom: 8px">设备进场明细</div>
      <div
        v-for="(row, idx) in entryDetail.line_items"
        :key="`${row.equipment_name || row.material_name}-${idx}`"
        class="eq-line-block"
        style="margin-bottom: 12px"
      >
        <div class="block-title" style="margin-bottom: 8px; font-size: 13px">设备 {{ idx + 1 }}</div>
        <el-table :data="[row]" border stripe size="small" style="margin-bottom: 8px">
          <el-table-column prop="equipment_name" label="设备名称" min-width="110" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.equipment_name || r.material_name || '—' }}</template>
          </el-table-column>
          <el-table-column label="规格型号" min-width="110" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.model || r.material_spec || '—' }}</template>
          </el-table-column>
          <el-table-column label="数量" width="90">
            <template #default="{ row: r }">{{ r.quantity }}{{ r.unit }}</template>
          </el-table-column>
          <el-table-column prop="serial_no" label="序列号" min-width="100" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.serial_no || '—' }}</template>
          </el-table-column>
          <el-table-column prop="use_part" label="使用部位" min-width="110" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.use_part || '—' }}</template>
          </el-table-column>
          <el-table-column label="批次号" width="90">
            <template #default="{ row: r }">{{ formatBatchNo(r.batch_no) }}</template>
          </el-table-column>
          <el-table-column label="合格证" min-width="110" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.cert_file || entryDetail.cert_file || '—' }}</template>
          </el-table-column>
          <el-table-column label="质量证明文件" min-width="120" show-overflow-tooltip>
            <template #default="{ row: r }">{{ r.inspect_file || entryDetail.inspect_file || '—' }}</template>
          </el-table-column>
        </el-table>
        <el-row v-if="row.unpack_items?.length" :gutter="12" style="margin-bottom: 4px">
          <el-col
            v-for="unpackRow in row.unpack_items"
            :key="unpackRow.key || unpackRow.label"
            :span="6"
          >
            <div class="unpack-card">
              <div class="unpack-card-head">
                <span>{{ unpackRow.label }}</span>
                <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                  {{ unpackRow.ok ? '合格' : '不合格' }}
                </el-tag>
              </div>
              <div class="unpack-card-remark">{{ unpackRow.remark || '无备注' }}</div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
    <div v-else-if="isEquipment && entryDetail?.unpack_items?.length" style="margin-top: 12px">
      <div class="block-title" style="margin-bottom: 8px; font-size: 14px">开箱清单</div>
      <el-row :gutter="12">
        <el-col
          v-for="unpackRow in entryDetail.unpack_items"
          :key="unpackRow.key || unpackRow.label"
          :span="6"
        >
          <div class="unpack-card">
            <div class="unpack-card-head">
              <span>{{ unpackRow.label }}</span>
              <el-tag size="small" :type="unpackRow.ok ? 'success' : 'danger'">
                {{ unpackRow.ok ? '合格' : '不合格' }}
              </el-tag>
            </div>
            <div class="unpack-card-remark">{{ unpackRow.remark || '无备注' }}</div>
          </div>
        </el-col>
      </el-row>
    </div>
  </section>
</template>

<style scoped>
.unpack-card {
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}
.unpack-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.unpack-card-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
