<script setup>
/**
 * App 审批详情 — 字段/流程对齐「实体验收（深度集成）」填报页
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  acceptancePlans,
  approveStep,
  approvalRecords,
  ARCHIVE_STATUS,
  createRectify,
  FILE_CATEGORY,
  findTask,
  getApprovalChain,
  getAttachments,
  getItemsByTaskId,
  getNextApprovalRole,
  getPassedApprovalRoles,
  hasOnlyGeneralFail,
  ITEM_CATEGORY,
  JUDGE_RESULT,
  ORG_LABEL,
  rejectTask,
  resolveProjectName,
  rollbackToDraft,
  SELF_CHECK,
  signatureRecords,
  TASK_STATUS,
  TASK_TYPE_LABEL,
  wbsNodes,
} from '../../mock/qm.js'

const route = useRoute()
const router = useRouter()

const task = ref(null)
const demoRole = ref('')
const sheetVisible = ref(false)
const sheetMode = ref('pass')
const opinion = ref('')
const submitting = ref(false)
const flowOpen = ref(true)
const itemsOpen = ref(false)
const siteOpen = ref(true)
const attTick = ref(0)

function load() {
  task.value = route.query.id ? findTask(route.query.id) : null
  if (task.value) {
    demoRole.value = getNextApprovalRole(task.value) || '监理'
  }
  sheetVisible.value = false
  opinion.value = ''
  attTick.value += 1
}

watch(() => route.query.id, load, { immediate: true })

const chain = computed(() => (task.value ? getApprovalChain(task.value) : []))
const nextRole = computed(() => (task.value ? getNextApprovalRole(task.value) : null))
const items = computed(() => (task.value ? getItemsByTaskId(task.value.id) : []))
const records = computed(() =>
  task.value ? approvalRecords.filter((r) => r.task_id === task.value.id) : [],
)
const signs = computed(() =>
  task.value ? signatureRecords.filter((s) => s.task_id === task.value.id) : [],
)
const nodeName = computed(
  () => wbsNodes.find((n) => n.id === task.value?.wbs_node_id)?.node_name || '—',
)
const canAct = computed(() => Number(task.value?.status) === 1)

const planLabel = computed(() => {
  if (!task.value) return '—'
  if (task.value.unplanned_flag === 1 || !task.value.plan_id) return '未挂计划'
  return acceptancePlans.find((p) => p.id === task.value.plan_id)?.plan_no || task.value.plan_id
})

function formatSelfCheck(val) {
  if (val == null || val === '') return ''
  return SELF_CHECK[val] || ''
}

function formatFirstPass(flag) {
  if (flag == null || flag === '') return ''
  return Number(flag) === 1 ? '是' : '否'
}

/** 与深度集成填报页一致：施工报验 → 审批链 → 办结 */
const flowSteps = computed(() => {
  if (!task.value) return []
  const roles = getApprovalChain(task.value)
  return [
    { title: '施工报验', desc: '自检提交' },
    ...roles.map((role) => ({ title: role, desc: '审核签章' })),
    { title: '办结通过', desc: TASK_TYPE_LABEL[task.value.task_type] || '验评' },
  ]
})

const flowActive = computed(() => {
  if (!task.value) return 0
  const t = task.value
  const roles = getApprovalChain(t)
  const end = roles.length + 2
  if (Number(t.status) === 0) return 0
  if (Number(t.status) === 2) return end
  if (Number(t.status) === 1) {
    const next = getNextApprovalRole(t)
    const idx = next ? roles.indexOf(next) : roles.length
    return 1 + Math.max(0, idx)
  }
  const passed = getPassedApprovalRoles(t.id).length
  return Math.min(1 + passed, end - 1)
})

const flowTip = computed(() => {
  if (!task.value) return ''
  const typeLabel = TASK_TYPE_LABEL[task.value.task_type] || '验评'
  const roles = getApprovalChain(task.value)
  const path = ['施工报验', ...roles, '办结通过'].join(' → ')
  const critical =
    task.value.task_type === 1 && task.value.owner_final_required === 1
      ? '（关键检验批含业主/总监终审）'
      : ''
  return `${typeLabel}默认流程${critical}：${path}`
})

const taskSiteAttachments = computed(() => {
  void attTick.value
  if (!task.value) return []
  return getAttachments('TASK', task.value.id)
})

const siteMediaList = computed(() =>
  taskSiteAttachments.value.filter((a) => [1, 2].includes(Number(a.file_category))),
)

const siteMaterialList = computed(() =>
  taskSiteAttachments.value.filter((a) => ![1, 2].includes(Number(a.file_category))),
)

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function isVideoExt(ext) {
  return ['mp4', 'mov', 'avi', 'wmv', 'webm'].includes(String(ext || '').toLowerCase())
}

const sheetTitle = computed(() => {
  if (sheetMode.value === 'pass') return '确认通过'
  if (sheetMode.value === 'reject') return '审核不通过'
  return '退回重报'
})

function goBack() {
  router.push('/qm/inspect/app/approve')
}

function openSheet(mode) {
  if (!canAct.value) return ElMessage.warning('当前任务不可审批')
  sheetMode.value = mode
  opinion.value = ''
  sheetVisible.value = true
}

function closeSheet() {
  sheetVisible.value = false
}

async function confirmSheet() {
  if (!task.value) return
  const text = opinion.value.trim()
  if (sheetMode.value === 'reject' && !text) {
    return ElMessage.warning('请填写退回意见')
  }
  if (sheetMode.value === 'pass' && hasOnlyGeneralFail(task.value.id) && !text) {
    return ElMessage.warning('一般项目不合格时须填写审批意见')
  }

  submitting.value = true
  try {
    if (sheetMode.value === 'pass') {
      const r = approveStep(task.value, {
        opinion: text,
        operator_role: demoRole.value || nextRole.value,
      })
      if (!r.ok) return ElMessage.error(r.msg)
      ElMessage.success(r.finished ? '审批完成，任务已通过' : `本级通过，下一岗：${r.next}`)
      if (r.next) demoRole.value = r.next
      load()
      if (r.finished) setTimeout(goBack, 450)
    } else if (sheetMode.value === 'reject') {
      const r = rejectTask(task.value, text, demoRole.value || nextRole.value || '监理')
      if (!r.ok) return ElMessage.error(r.msg)
      ElMessage.warning('已判定不通过')
      const cr = createRectify(task.value, text)
      if (cr.ok) ElMessage.success(`已下发整改单 ${cr.order.order_no}`)
      load()
      setTimeout(goBack, 450)
    } else {
      const r = rollbackToDraft(task.value)
      if (!r.ok) return ElMessage.error(r.msg)
      ElMessage.success('已退回待验评')
      load()
      setTimeout(goBack, 450)
    }
    closeSheet()
  } finally {
    submitting.value = false
  }
}

function judgeTone(result) {
  if (result === 1) return 'ok'
  if (result === 2) return 'danger'
  return 'muted'
}

function actionLabel(action) {
  return { 1: '提交', 2: '通过', 3: '不通过' }[action] || '操作'
}

function stepClass(idx) {
  const active = flowActive.value
  if (idx < active) return 'done'
  if (idx === active) return Number(task.value?.status) === 2 ? 'done' : 'current'
  return ''
}
</script>

<template>
  <div class="app-page">
    <div class="phone">
      <div class="status-bar">
        <span>09:41</span>
        <span class="status-icons">5G · ████</span>
      </div>

      <header class="nav-bar">
        <button type="button" class="nav-back" aria-label="返回" @click="goBack">‹</button>
        <h1 class="nav-title">审批详情</h1>
        <span class="nav-right">{{ canAct ? '待办' : '只读' }}</span>
      </header>

      <div v-if="!task" class="empty-wrap">
        <p>未找到验评任务</p>
        <button type="button" class="ghost-btn" @click="goBack">返回列表</button>
      </div>

      <template v-else>
        <div class="body" :class="{ 'with-bar': canAct }">
          <section class="hero">
            <div class="hero-top">
              <strong>{{ task.task_no }}</strong>
              <span
                class="status-pill"
                :class="task.status === 1 ? 'warn' : task.status === 2 ? 'ok' : 'danger'"
              >
                {{ TASK_STATUS[task.status] }}
              </span>
            </div>
            <div class="hero-node">{{ nodeName }}</div>
            <div class="hero-meta">
              {{ TASK_TYPE_LABEL[task.task_type] }} · {{ resolveProjectName(task.project_id) }}
            </div>
            <div class="hero-meta">
              归档：{{ ARCHIVE_STATUS[task.archive_status] || '—' }}
              <template v-if="task.submit_time"> · 报验 {{ task.submit_time }}</template>
            </div>
          </section>

          <section class="card">
            <div class="card-title">任务信息</div>
            <div class="info-grid">
              <div class="info-item"><span class="k">部位</span><span class="v">{{ task.location_name || '—' }}</span></div>
              <div class="info-item"><span class="k">隐蔽工程</span><span class="v">{{ task.is_hidden_work === 1 ? '是' : '否' }}</span></div>
              <div class="info-item"><span class="k">业主终审</span><span class="v">{{ task.owner_final_required === 1 ? '需要' : '否' }}</span></div>
              <div class="info-item"><span class="k">计划</span><span class="v">{{ planLabel }}</span></div>
              <div class="info-item"><span class="k">自检结果</span><span class="v">{{ formatSelfCheck(task.self_check_result) || '—' }}</span></div>
              <div class="info-item"><span class="k">一次通过</span><span class="v">{{ formatFirstPass(task.first_pass_flag) || '—' }}</span></div>
              <div class="info-item full">
                <span class="k">施工单位</span>
                <span class="v">{{ ORG_LABEL[task.contractor_org_id] || task.contractor_org_id || '—' }}</span>
              </div>
            </div>
          </section>

          <section class="card">
            <button type="button" class="card-title collapsible" @click="siteOpen = !siteOpen">
              <span>现场资料</span>
              <span class="caret">{{ siteOpen ? '收起' : '展开' }}</span>
            </button>
            <div v-show="siteOpen">
              <div class="sub-title">工程影像 · {{ siteMediaList.length }}</div>
              <div v-if="siteMediaList.length" class="att-list">
                <div v-for="a in siteMediaList" :key="a.id" class="att-row">
                  <span class="att-tag" :class="isVideoExt(a.file_ext) || a.file_category === 2 ? 'video' : 'img'">
                    {{ isVideoExt(a.file_ext) || a.file_category === 2 ? '视频' : '图片' }}
                  </span>
                  <div class="att-body">
                    <div class="att-name">{{ a.file_name }}</div>
                    <div class="att-meta">
                      {{ FILE_CATEGORY[a.file_category] || '—' }} · {{ formatFileSize(a.file_size) }}
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="hint">暂无工程影像</p>

              <div class="sub-title">材料附件 · {{ siteMaterialList.length }}</div>
              <div v-if="siteMaterialList.length" class="att-list">
                <div v-for="a in siteMaterialList" :key="a.id" class="att-row">
                  <span class="att-tag doc">{{ String(a.file_ext || 'FILE').toUpperCase() }}</span>
                  <div class="att-body">
                    <div class="att-name">{{ a.file_name }}</div>
                    <div class="att-meta">
                      {{ FILE_CATEGORY[a.file_category] || '—' }} · {{ formatFileSize(a.file_size) }}
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="hint">暂无材料附件</p>
            </div>
          </section>

          <section class="card">
            <div class="card-title">审批轨迹</div>
            <p class="flow-tip">{{ flowTip }}</p>
            <div class="chain">
              <div
                v-for="(step, idx) in flowSteps"
                :key="`${step.title}-${idx}`"
                class="chain-item"
                :class="stepClass(idx)"
              >
                <div class="chain-dot" />
                <div class="chain-label">{{ step.title }}</div>
                <div class="chain-desc">{{ step.desc }}</div>
              </div>
            </div>
            <p v-if="canAct && nextRole" class="hint">当前待审：{{ nextRole }}</p>
            <p v-else-if="task.status === 2" class="hint ok">已办结通过</p>
            <div v-if="canAct && chain.length" class="role-row">
              <span>演示角色</span>
              <select v-model="demoRole" class="role-select">
                <option v-for="role in chain" :key="role" :value="role">{{ role }}</option>
              </select>
            </div>
          </section>

          <section class="card">
            <button type="button" class="card-title collapsible" @click="itemsOpen = !itemsOpen">
              <span>检查项核查 · {{ items.length }}</span>
              <span class="caret">{{ itemsOpen ? '收起' : '展开' }}</span>
            </button>
            <div v-show="itemsOpen" class="item-list">
              <div v-for="item in items" :key="item.id" class="item-row">
                <div class="item-head">
                  <span class="item-seq">{{ item.seq_no }}</span>
                  <span class="item-cat">{{ ITEM_CATEGORY[item.item_category] }}</span>
                  <span class="judge" :class="judgeTone(item.judge_result)">
                    {{ JUDGE_RESULT[item.judge_result] || '未判定' }}
                  </span>
                </div>
                <div class="item-name">{{ item.item_name }}</div>
                <div v-if="item.measured_value" class="item-val">实测：{{ item.measured_value }}</div>
              </div>
              <p v-if="!items.length" class="hint">暂无检查项</p>
              <p class="hint">主控/观感不合格禁止通过；仅一般不合格可填意见后通过。</p>
            </div>
          </section>

          <section class="card">
            <div class="card-title">签章记录</div>
            <div v-if="signs.length" class="sign-list">
              <div v-for="s in signs" :key="s.id" class="sign-row">
                <div class="sign-role">{{ s.signer_role }}</div>
                <div class="sign-meta">{{ s.sign_time || '—' }}</div>
                <div class="sign-meta">{{ s.ca_cert_id || '—' }}</div>
              </div>
            </div>
            <p v-else class="hint">暂无签章</p>
          </section>

          <section class="card">
            <button type="button" class="card-title collapsible" @click="flowOpen = !flowOpen">
              <span>办理记录</span>
              <span class="caret">{{ flowOpen ? '收起' : '展开' }}</span>
            </button>
            <div v-show="flowOpen" class="flow">
              <div v-for="r in records" :key="r.id" class="flow-item">
                <div class="flow-dot" />
                <div class="flow-body">
                  <div class="flow-row">
                    <span>{{ r.operator_role }} · {{ actionLabel(r.action) }}</span>
                    <span class="flow-time">{{ r.action_time }}</span>
                  </div>
                  <div v-if="r.opinion" class="flow-opinion">{{ r.opinion }}</div>
                </div>
              </div>
              <p v-if="!records.length" class="hint">暂无办理记录</p>
            </div>
          </section>
        </div>

        <div v-if="canAct" class="action-bar">
          <button type="button" class="act ghost" @click="openSheet('rollback')">退回</button>
          <button type="button" class="act danger" @click="openSheet('reject')">不通过</button>
          <button type="button" class="act primary" @click="openSheet('pass')">通过并签章</button>
        </div>
      </template>

      <div class="home-indicator" />

      <div v-if="sheetVisible" class="sheet-mask" @click.self="closeSheet">
        <div class="sheet">
          <div class="sheet-handle" />
          <h3 class="sheet-title">{{ sheetTitle }}</h3>
          <p class="sheet-tip">
            <template v-if="sheetMode === 'pass'">确认以「{{ demoRole || nextRole }}」通过本级审批</template>
            <template v-else-if="sheetMode === 'reject'">不通过将结束本验评并建议下发整改</template>
            <template v-else>退回后任务回到待验评，可修改后重报</template>
          </p>
          <textarea
            v-model="opinion"
            class="sheet-textarea"
            rows="4"
            :placeholder="
              sheetMode === 'reject'
                ? '请填写退回意见（必填）'
                : sheetMode === 'pass'
                  ? '审批意见（一般不合格时必填）'
                  : '备注（可选）'
            "
          />
          <div class="sheet-actions">
            <button type="button" class="sheet-btn cancel" @click="closeSheet">取消</button>
            <button
              type="button"
              class="sheet-btn confirm"
              :class="sheetMode === 'pass' ? 'ok' : 'danger'"
              :disabled="submitting"
              @click="confirmSheet"
            >
              {{ submitting ? '提交中…' : '确认' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-page {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12px 8px 24px;
  background: linear-gradient(180deg, #f3e6eb 0%, #eef1f5 40%, #f5f6f8 100%);
}

.phone {
  width: 100%;
  max-width: 402px;
  height: min(844px, calc(100vh - 48px));
  max-height: calc(100vh - 48px);
  background: #f4f5f7;
  border-radius: 28px;
  overflow: hidden;
  box-shadow:
    0 0 0 10px #1c1c1e,
    0 0 0 12px #3a3a3c,
    0 24px 48px rgba(28, 28, 30, 0.28);
  display: flex;
  flex-direction: column;
  font-family: 'PingFang SC', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 10px 22px 4px;
  background: #8f0045;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.nav-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 14px;
  background: #8f0045;
  color: #fff;
  flex-shrink: 0;
}

.nav-back {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  border-radius: 10px;
  cursor: pointer;
  padding: 0 0 2px;
}

.nav-title {
  flex: 1;
  margin: 0;
  font-size: 17px;
  font-weight: 650;
}

.nav-right {
  font-size: 12px;
  opacity: 0.85;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 14px 20px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.body.with-bar {
  padding-bottom: 88px;
}

.hero,
.card {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.hero-top strong {
  font-size: 16px;
  color: #1f2329;
}

.status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
}

.status-pill.warn {
  background: #fff7e6;
  color: #d48806;
}

.status-pill.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-pill.danger {
  background: #ffebee;
  color: #c62828;
}

.hero-node {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.hero-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.card-title {
  font-size: 13px;
  font-weight: 650;
  color: #1f2329;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #8f0045;
}

.card-title.collapsible {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  background: none;
  border-left: 3px solid #8f0045;
  padding: 0 0 0 8px;
  margin-bottom: 12px;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
  color: #1f2329;
  text-align: left;
}

.caret {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-item.full {
  grid-column: 1 / -1;
}

.info-item .k {
  font-size: 11px;
  color: #909399;
}

.info-item .v {
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}

.sub-title {
  margin: 8px 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.att-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.att-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 10px;
}

.att-tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.att-tag.img {
  background: #e8f5e9;
  color: #2e7d32;
}

.att-tag.video {
  background: #fff7e6;
  color: #d48806;
}

.att-tag.doc {
  background: #eef2ff;
  color: #4338ca;
}

.att-name {
  font-size: 13px;
  color: #303133;
}

.att-meta {
  margin-top: 2px;
  font-size: 11px;
  color: #909399;
}

.flow-tip {
  margin: 0 0 10px;
  font-size: 11px;
  color: #909399;
  line-height: 1.45;
}

.chain {
  display: flex;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.chain-item {
  flex: 1;
  min-width: 64px;
  text-align: center;
  position: relative;
}

.chain-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 7px;
  left: calc(50% + 10px);
  right: calc(-50% + 10px);
  height: 2px;
  background: #e5e7eb;
}

.chain-item.done:not(:last-child)::after,
.chain-item.current:not(:last-child)::after {
  background: #8f0045;
}

.chain-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin: 0 auto 6px;
  background: #dcdfe6;
  position: relative;
  z-index: 1;
}

.chain-item.done .chain-dot {
  background: #34a853;
}

.chain-item.current .chain-dot {
  background: #8f0045;
  box-shadow: 0 0 0 3px #fceef4;
}

.chain-label {
  font-size: 11px;
  color: #909399;
}

.chain-desc {
  font-size: 10px;
  color: #c0c4cc;
  margin-top: 2px;
}

.chain-item.done .chain-label,
.chain-item.current .chain-label {
  color: #303133;
  font-weight: 600;
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}

.hint.ok {
  color: #67c23a;
}

.role-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}

.role-select {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
  background: #fafafa;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  background: #fafafa;
  border-radius: 10px;
  padding: 10px 12px;
}

.item-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.item-seq {
  font-size: 11px;
  color: #909399;
  width: 18px;
}

.item-cat {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4338ca;
}

.judge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
}

.judge.ok {
  color: #2e7d32;
}

.judge.danger {
  color: #c62828;
}

.judge.muted {
  color: #909399;
}

.item-name {
  font-size: 13px;
  color: #303133;
  line-height: 1.45;
}

.item-val {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.sign-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sign-row {
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
}

.sign-role {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.sign-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.flow {
  padding-left: 4px;
}

.flow-item {
  display: flex;
  gap: 10px;
  padding-bottom: 14px;
  position: relative;
}

.flow-item::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 14px;
  bottom: 0;
  width: 1px;
  background: #e5e7eb;
}

.flow-item:last-child {
  padding-bottom: 0;
}

.flow-item:last-child::before {
  display: none;
}

.flow-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8f0045;
  margin-top: 3px;
  flex-shrink: 0;
}

.flow-body {
  flex: 1;
  min-width: 0;
}

.flow-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.flow-time {
  font-size: 11px;
  color: #909399;
  font-weight: 400;
  flex-shrink: 0;
}

.flow-opinion {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 6px 8px;
}

.action-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 22px;
  display: flex;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #eee;
  backdrop-filter: blur(10px);
  z-index: 5;
}

.sheet-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-radius: inherit;
}

.sheet {
  width: 100%;
  max-height: 78%;
  overflow-y: auto;
  background: #fff;
  border-radius: 18px 18px 0 0;
  padding: 10px 16px calc(16px + env(safe-area-inset-bottom, 0));
  animation: sheet-up 0.22s ease-out;
  -webkit-overflow-scrolling: touch;
}

@keyframes sheet-up {
  from {
    transform: translateY(40%);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.act {
  border-radius: 12px;
  font-size: 14px;
  font-weight: 650;
  padding: 12px 10px;
  cursor: pointer;
  border: 1.5px solid transparent;
}

.act.ghost {
  flex: 0.9;
  background: #fff;
  border-color: #dcdfe6;
  color: #606266;
}

.act.danger {
  flex: 1.1;
  background: #ffebee;
  border-color: #e53935;
  color: #e53935;
}

.act.primary {
  flex: 1.4;
  background: #8f0045;
  border-color: #8f0045;
  color: #fff;
}

.home-indicator {
  height: 22px;
  background: #f4f5f7;
  position: relative;
  flex-shrink: 0;
}

.home-indicator::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: #1c1c1e;
  opacity: 0.85;
}

.empty-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #909399;
}

.ghost-btn {
  border: 1px solid #8f0045;
  background: #fceef4;
  color: #8f0045;
  border-radius: 10px;
  padding: 8px 16px;
  cursor: pointer;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdfe6;
  margin: 4px auto 12px;
}

.sheet-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 650;
}

.sheet-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: #909399;
}

.sheet-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  background: #fafafa;
}

.sheet-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.sheet-btn {
  flex: 1;
  border-radius: 12px;
  padding: 12px;
  font-size: 15px;
  font-weight: 650;
  cursor: pointer;
  border: none;
}

.sheet-btn.cancel {
  background: #f3f4f6;
  color: #606266;
}

.sheet-btn.confirm.ok {
  background: #8f0045;
  color: #fff;
}

.sheet-btn.confirm.danger {
  background: #e53935;
  color: #fff;
}

.sheet-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .app-page {
    padding: 0;
    background: #f4f5f7;
  }

  .phone {
    max-width: none;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
