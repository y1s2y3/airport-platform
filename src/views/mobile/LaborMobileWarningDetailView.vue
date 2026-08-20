<script setup>
/**
 * 人员实名制 · 移动端预警详情（只读，APP 不做处置）
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getWarningDetail,
  getProjectLabel,
  warningStatusTagClass,
  disposalTypeLabels,
} from '../../mock/laborWarningList'

const route = useRoute()
const router = useRouter()
const detail = ref(null)

const showHandleInfo = computed(() => {
  if (!detail.value) return false
  return detail.value.handle_mode === '手动处理' && detail.value.status === '已关闭'
})

const closeHandleInfo = computed(() => {
  if (!showHandleInfo.value) return null
  const records = detail.value.disposal_records || []
  const closeRec = [...records].reverse().find((r) => r.type === 'close')
  if (!closeRec) {
    return { disposal_result: '-', content: '-', attachments: [] }
  }
  return {
    disposal_result: closeRec.disposal_result || '-',
    content: closeRec.content || '-',
    attachments: closeRec.attachments || [],
  }
})

const backTab = computed(() => {
  const tab = String(route.query.tab || 'todo')
  return ['todo', 'done', 'notice', 'initiated', 'copied', 'warning-center'].includes(tab)
    ? tab
    : 'todo'
})

onMounted(() => {
  document.querySelector('.page-viewport')?.scrollTo({ top: 0 })
  detail.value = getWarningDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到预警信息')
    goBack()
  }
})

function goBack() {
  router.push({
    name: 'LaborMobilePersonalCenter',
    query: backTab.value === 'todo' ? {} : { tab: backTab.value },
  })
}

function typeLabel(type) {
  return disposalTypeLabels[type] || type
}
</script>

<template>
  <div v-if="detail" class="detail-page">
    <header class="mobile-header">
      <button class="back-button" type="button" @click="goBack">‹</button>
      <h1>预警详情</h1>
      <span class="header-tip">仅查看</span>
    </header>

    <section class="summary-card">
      <h2>{{ detail.rule_label }}</h2>
      <div class="meta-row">
        <span>{{ detail.warning_no }}</span>
        <span class="status-chip" :class="warningStatusTagClass[detail.status]">{{ detail.status }}</span>
        <span class="mode-chip">{{ detail.handle_mode }}</span>
      </div>
      <p class="readonly-tip">移动端仅支持查看，请在 Web 端个人中心或预警清单完成处置。</p>
    </section>

    <section class="block-card">
      <h3>预警信息</h3>
      <div class="field"><span>所属项目</span><b>{{ getProjectLabel(detail.project_id) || '—' }}</b></div>
      <div class="field"><span>触发时间</span><b>{{ detail.triggered_at }}</b></div>
      <div class="field"><span>关闭时间</span><b>{{ detail.closed_at || '—' }}</b></div>
      <div class="field"><span>当前层级</span><b>{{ detail.status === '已关闭' || detail.status === '未读' || detail.status === '已读' ? '—' : `${detail.current_level} 级` }}</b></div>
      <div class="field"><span>触发原因</span><b>{{ detail.trigger_reason }}</b></div>
    </section>

    <section v-if="showHandleInfo && closeHandleInfo" class="block-card">
      <h3>处置信息</h3>
      <div class="field"><span>处置结果</span><b>{{ closeHandleInfo.disposal_result }}</b></div>
      <div class="field"><span>处置说明</span><b>{{ closeHandleInfo.content }}</b></div>
      <div class="field">
        <span>处置附件</span>
        <b v-if="closeHandleInfo.attachments.length">{{ closeHandleInfo.attachments.join('、') }}</b>
        <b v-else>—</b>
      </div>
    </section>

    <section class="block-card">
      <h3>关联人员</h3>
      <div class="field"><span>姓名</span><b>{{ detail.name }}</b></div>
      <div class="field"><span>人员编号</span><b>{{ detail.personnel_no }}</b></div>
      <div class="field"><span>参建单位</span><b>{{ detail.unit_name }}</b></div>
      <div class="field"><span>工种/职务</span><b>{{ detail.work_type }}</b></div>
    </section>

    <section class="block-card">
      <h3>处置时间线</h3>
      <div v-if="!detail.disposal_records?.length" class="empty">暂无记录</div>
      <ul v-else class="timeline">
        <li v-for="(record, index) in detail.disposal_records" :key="index">
          <div class="time">{{ record.time }}</div>
          <div class="line-card">
            <div class="line-head">
              <span>{{ typeLabel(record.type) }}</span>
              <em>{{ record.operator }}</em>
            </div>
            <template v-if="!(showHandleInfo && record.type === 'close')">
              <p>{{ record.content }}</p>
            </template>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  width: 100%;
  max-width: 402px;
  min-height: 100vh;
  margin: 0 auto;
  background: #f4f5f7;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  color: #1f2329;
  padding-bottom: 24px;
}
.mobile-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mobile-header h1 {
  flex: 1;
  margin: 0;
  font-size: 18px;
}
.back-button {
  padding: 0 6px 0 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.header-tip {
  font-size: 12px;
  opacity: 0.85;
}
.summary-card,
.block-card {
  margin: 12px 14px 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.summary-card h2 {
  margin: 0 0 8px;
  font-size: 17px;
  line-height: 1.4;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: #666;
}
.status-chip,
.mode-chip {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
}
.status-chip {
  background: #fff4e5;
  color: #f5a623;
}
.mode-chip {
  background: #fceef4;
  color: #8f0045;
}
.readonly-tip {
  margin: 10px 0 0;
  font-size: 12px;
  color: #8f0045;
  line-height: 1.5;
}
.block-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #333;
}
.field {
  display: flex;
  gap: 10px;
  margin: 7px 0;
  font-size: 12px;
  line-height: 1.5;
}
.field span {
  width: 66px;
  flex: none;
  color: #999;
}
.field b {
  color: #555;
  font-weight: 400;
  word-break: break-all;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}
.timeline li {
  margin-bottom: 12px;
}
.timeline .time {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}
.line-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fafafa;
}
.line-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #8f0045;
}
.line-head em {
  font-style: normal;
  color: #888;
}
.line-card p {
  margin: 0;
  font-size: 12px;
  color: #555;
  line-height: 1.5;
}
.empty {
  font-size: 12px;
  color: #aaa;
}
</style>
