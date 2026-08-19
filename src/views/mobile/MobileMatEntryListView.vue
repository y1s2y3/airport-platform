<script setup>
/**
 * APP · 进场申请列表（进场申报 / 重新申报均在此）
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ENTRY_TYPE_LABEL,
  listEntries,
  STATUS_LABEL,
  statusLabel,
  statusTagType,
  isReviewingStatus,
  withdrawEntry,
} from '../../mock/mat.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listEntries(scopeProjectId.value, {})
})

function displayName(row) {
  return row.entry_type === 'equipment' ? row.equipment_name : row.material_name
}

function goCreate() {
  router.push('/mobile/mat/entry/create')
}

function goReEdit(row) {
  router.push(
    `/mobile/mat/entry/create?id=${row.entry_id}&reEdit=1&entry_type=${row.entry_type || 'material'}`,
  )
}

function goCopyNew(row) {
  router.push(
    `/mobile/mat/entry/create?copyFrom=${row.entry_id}&entry_type=${row.entry_type || 'material'}`,
  )
}

function goResubmit(row) {
  if (row.status === 'withdrawn') goReEdit(row)
  else if (row.status === 'rejected') goCopyNew(row)
}

async function onWithdraw(row, e) {
  e?.stopPropagation?.()
  try {
    await ElMessageBox.confirm(`确认撤回进场单 ${row.entry_id}？仅待审批时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawEntry(row.entry_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

function goDetail(row) {
  router.push(`/qm/mat/applications/detail?id=${row.entry_id}`)
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">进场申请</h1>
      <button type="button" class="mh-action" @click="goCreate">申报</button>
    </header>

    <div v-if="isHqSelected" class="tip-banner">请先在顶部切换到具体项目</div>
    <div v-else class="tip-banner muted">当前：{{ scopeProjectLabel }} · 附件仅支持拍照</div>

    <div class="list-body">
      <div v-if="!list.length" class="empty">暂无进场申请</div>
      <div v-for="row in list" :key="row.entry_id" class="card">
        <button type="button" class="card-main" @click="goDetail(row)">
          <div class="card-top">
            <span class="card-id">{{ row.entry_id }}</span>
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ statusLabel(row.status) || STATUS_LABEL[row.status] || row.status }}
            </el-tag>
          </div>
          <div class="card-title">{{ displayName(row) }}</div>
          <div class="card-meta">
            {{ ENTRY_TYPE_LABEL[row.entry_type] || '材料' }} · {{ row.brand_name || '—' }}
          </div>
          <div class="card-meta">{{ row.submit_time }}</div>
        </button>
        <div class="card-actions">
          <button
            v-if="isReviewingStatus(row.status)"
            type="button"
            class="act warn"
            @click="onWithdraw(row, $event)"
          >
            撤回
          </button>
          <button
            v-if="row.status === 'withdrawn' || row.status === 'rejected'"
            type="button"
            class="act primary"
            @click="goResubmit(row)"
          >
            重新申报
          </button>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button type="button" class="submit-btn" @click="goCreate">＋ 进场申报</button>
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
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  position: relative;
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
.mh-action {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #fff;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tip-banner {
  margin: 10px 16px 0;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 12px;
  color: #ad6800;
}
.tip-banner.muted {
  background: #fff;
  color: #666;
}
.list-body {
  flex: 1;
  padding: 12px 16px;
}
.empty {
  text-align: center;
  color: #999;
  padding: 48px 0;
  font-size: 14px;
}
.card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.card-main {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 14px;
  cursor: pointer;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.card-id {
  font-size: 12px;
  color: #8f0045;
  font-weight: 600;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 4px;
}
.card-meta {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}
.card-actions {
  display: flex;
  gap: 8px;
  padding: 0 14px 12px;
  flex-wrap: wrap;
}
.act {
  border: 1px solid #e4e7ed;
  background: #fafafa;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: #333;
}
.act.primary {
  border-color: #8f0045;
  color: #8f0045;
  background: #fff5f8;
}
.act.warn {
  border-color: #e6a23c;
  color: #e6a23c;
  background: #fdf6ec;
}
.bottom-bar {
  position: sticky;
  bottom: 0;
  width: 100%;
  margin-top: auto;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 5;
}
.submit-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px;
  background: #8f0045;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
</style>
