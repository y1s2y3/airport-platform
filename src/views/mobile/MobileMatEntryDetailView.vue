<script setup>
/**
 * APP · 进场申请只读详情（布局对齐填报分区）
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ENTRY_TYPE_LABEL,
  STATUS_LABEL,
  formatBatchNo,
  findMatSupervisorApprover,
  formatMatSupervisorApproverLabel,
  getEntryDetail,
} from '../../mock/mat.js'

const route = useRoute()
const router = useRouter()

const entryId = computed(() => String(route.query.id || ''))
const entry = computed(() => (entryId.value ? getEntryDetail(entryId.value) : null))
const isEquipment = computed(() => entry.value?.entry_type === 'equipment')

const statusLabel = computed(() => {
  const s = entry.value?.status
  if (!s) return '—'
  return STATUS_LABEL[s] || s
})

function supervisorDisplay(row) {
  if (!row) return '—'
  const user = findMatSupervisorApprover(row.supervisor_approver_user_id)
  if (user) return formatMatSupervisorApproverLabel(user)
  if (row.supervisor_approver_name) {
    const post = row.supervisor_approver_post_label
    return post ? `${row.supervisor_approver_name}（${post}）` : row.supervisor_approver_name
  }
  return '—'
}

const lineItems = computed(() => {
  const header = entry.value
  if (!header) return []
  if (header.entry_type === 'equipment') {
    const rows = header.line_items?.length
      ? header.line_items
      : [
          {
            equipment_name: header.equipment_name,
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

function goBack() {
  router.back()
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">进场详情</h1>
      <span class="mh-spacer" />
    </header>

    <div v-if="!entry" class="empty">未找到进场单</div>

    <div v-else class="form-body">
      <section class="form-section">
        <div class="fs-title">进场类型</div>
        <div class="form-row">
          <span class="form-label">类型</span>
          <span class="form-value">{{ ENTRY_TYPE_LABEL[entry.entry_type] || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">状态</span>
          <span class="form-value">{{ statusLabel }}</span>
        </div>
      </section>

      <section class="form-section">
        <div class="fs-title">品牌与定样</div>
        <div class="form-row">
          <span class="form-label">进场单号</span>
          <span class="form-value">{{ entry.entry_no }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">项目</span>
          <span class="form-value">{{ entry.project_label || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">品牌</span>
          <span class="form-value">{{ entry.brand_name || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">生产厂家</span>
          <span class="form-value">{{ entry.manufacturer || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">供应商</span>
          <span class="form-value">{{ entry.supplier || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">关联定样</span>
          <span class="form-value">{{ entry.sample_application_id || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">申请人</span>
          <span class="form-value">{{ entry.applicant_name || '—' }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">监理审批人</span>
          <span class="form-value">{{ supervisorDisplay(entry) }}</span>
        </div>
        <div class="form-row">
          <span class="form-label">提交时间</span>
          <span class="form-value">{{ entry.submit_time || '—' }}</span>
        </div>
      </section>

      <template v-if="!isEquipment">
        <section v-for="(row, idx) in lineItems" :key="`m-${idx}`" class="form-section">
          <div class="fs-title">材料进场明细 {{ idx + 1 }}</div>
          <div class="form-row">
            <span class="form-label">材料名称</span>
            <span class="form-value">{{ row.material_name || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">规格型号</span>
            <span class="form-value">{{ row.material_spec || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">数量</span>
            <span class="form-value">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </span>
          </div>
          <div class="form-row">
            <span class="form-label">用途</span>
            <span class="form-value">{{ row.purpose || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">施工部位</span>
            <span class="form-value">{{ row.use_part || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">运单号</span>
            <span class="form-value">{{ row.waybill_no || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">批次号</span>
            <span class="form-value">{{ formatBatchNo(row.batch_no) }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">外观质量</span>
            <span class="form-value">{{ row.appearance_quality || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">验收结论</span>
            <span class="form-value">{{ row.acceptance_result || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">进场日期</span>
            <span class="form-value">{{ row.entry_date || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">合格证</span>
            <span class="form-value">{{ row.cert_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">质量证明文件</span>
            <span class="form-value">{{ row.inspect_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">现场照片</span>
            <span class="form-value">{{ row.photo_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">其他</span>
            <span class="form-value">{{ row.other_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">已完成送检</span>
            <span class="form-value">{{ row.inspect_result_checked ? '是' : '否' }}</span>
          </div>
          <div v-if="row.inspect_result_checked" class="form-row">
            <span class="form-label">送检附件</span>
            <span class="form-value">{{ row.inspect_result_file || '未上传' }}</span>
          </div>
        </section>
      </template>

      <template v-else>
        <section v-for="(row, idx) in lineItems" :key="`e-${idx}`" class="form-section">
          <div class="fs-title">设备信息 {{ idx + 1 }}</div>
          <div class="form-row">
            <span class="form-label">设备名称</span>
            <span class="form-value">{{ row.equipment_name || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">规格型号</span>
            <span class="form-value">{{ row.model || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">数量</span>
            <span class="form-value">
              <template v-if="row.quantity != null && row.quantity !== ''">
                {{ row.quantity }}{{ row.unit || '' }}
              </template>
              <template v-else>—</template>
            </span>
          </div>
          <div class="form-row">
            <span class="form-label">序列号</span>
            <span class="form-value">{{ row.serial_no || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">用途</span>
            <span class="form-value">{{ row.purpose || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">施工部位</span>
            <span class="form-value">{{ row.use_part || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">运单号</span>
            <span class="form-value">{{ row.waybill_no || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">批次号</span>
            <span class="form-value">{{ formatBatchNo(row.batch_no) }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">外观质量</span>
            <span class="form-value">{{ row.appearance_quality || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">验收结论</span>
            <span class="form-value">{{ row.acceptance_result || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">进场日期</span>
            <span class="form-value">{{ row.entry_date || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">合格证</span>
            <span class="form-value">{{ row.cert_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">质量证明文件</span>
            <span class="form-value">{{ row.inspect_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">现场照片</span>
            <span class="form-value">{{ row.photo_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">其他</span>
            <span class="form-value">{{ row.other_file || '未上传' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">已完成送检</span>
            <span class="form-value">{{ row.inspect_result_checked ? '是' : '否' }}</span>
          </div>
          <div v-if="row.inspect_result_checked" class="form-row">
            <span class="form-label">送检附件</span>
            <span class="form-value">{{ row.inspect_result_file || '未上传' }}</span>
          </div>
          <div class="sub-title">开箱清单</div>
          <div v-if="!row.unpack_items?.length" class="muted">无开箱记录</div>
          <div v-for="u in row.unpack_items || []" :key="u.key || u.label" class="unpack-row">
            <span>{{ u.label }}</span>
            <b :class="u.ok ? 'ok' : 'bad'">{{ u.ok ? '合格' : '不合格' }}</b>
            <em>{{ u.remark || '无备注' }}</em>
          </div>
        </section>
      </template>

      <section
        v-if="entry.status === 'approved'"
        class="form-section"
        :class="{ 'exit-section': entry.exited }"
      >
        <div class="fs-title">退场信息</div>
        <template v-if="entry.exited && entry.exit">
          <div class="form-row">
            <span class="form-label">退场单号</span>
            <span class="form-value">{{ entry.exit.exit_no || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">登记人</span>
            <span class="form-value">{{ entry.exit.operator_name || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">退场数量</span>
            <span class="form-value">
              {{ entry.exit.exit_qty }}{{ entry.unit || '' }}
            </span>
          </div>
          <div class="form-row">
            <span class="form-label">登记时间</span>
            <span class="form-value">{{ entry.exit.exit_time || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">退场原因</span>
            <span class="form-value">{{ entry.exit.reason || '—' }}</span>
          </div>
          <div class="form-row">
            <span class="form-label">退场照片</span>
            <span class="form-value">{{ entry.exit.photo_file || '未上传' }}</span>
          </div>
        </template>
        <div v-else class="muted exit-empty">尚未登记退场</div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mp {
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}
.mh {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mb {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  padding: 0 4px 0 0;
  line-height: 1;
  cursor: pointer;
}
.mt {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.mh-spacer {
  width: 28px;
}
.empty {
  margin: 40px 16px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}
.form-body {
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 14px 14px 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.fs-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;
}
.form-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f7f8fa;
  font-size: 13px;
  line-height: 1.5;
}
.form-row:last-child {
  border-bottom: none;
}
.form-label {
  flex: 0 0 96px;
  color: #909399;
}
.form-value {
  flex: 1;
  color: #303133;
  word-break: break-all;
  text-align: right;
}
.sub-title {
  margin: 8px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.unpack-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f7f8fa;
  font-size: 12px;
}
.unpack-row em {
  grid-column: 1 / -1;
  font-style: normal;
  color: #909399;
}
.unpack-row .ok {
  color: #67c23a;
}
.exit-section {
  border: 1px solid #f5dab1;
}
.exit-empty {
  padding: 4px 0 10px;
  font-size: 13px;
}
.unpack-row .bad {
  color: #f56c6c;
}
.muted {
  font-size: 12px;
  color: #c0c4cc;
  padding-bottom: 8px;
}
</style>
