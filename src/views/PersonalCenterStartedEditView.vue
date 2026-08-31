<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { findPersonalProcess, resubmitInspectionStarted } from '../mock/personalCenter.js'
import DispatchImageAttachments from '../coc/components/DispatchImageAttachments.vue'

const route = useRoute()
const router = useRouter()

const recordId = computed(() => String(route.params.id || ''))
const record = ref(null)

const form = reactive({
  processDate: '',
  attachments: [],
  remark: '',
})

const approvalFlow = computed(() => record.value?.approvalFlow || [])
const inspectionRetryMode = computed(() => {
  const detail = record.value?.detail
  if (record.value?.type !== 'inspection' || !detail) return ''
  if (detail.status === '待整改' && (
    detail.reviewDate || detail.reviewResult || detail.reviewComment || /重新整改/.test(detail.currentNode || '')
  )) return 'rectify'
  if (detail.status === '待复查' && (
    detail.reviewDate || detail.reviewResult || detail.reviewComment || /重新复查/.test(detail.currentNode || '') || detail.approvalRejected
  )) return 'review'
  return ''
})
const showInspectionReviewInfo = computed(() => !inspectionRetryMode.value)
const showInspectionRectificationInfo = computed(() => inspectionRetryMode.value !== 'rectify')

function toStartedList() {
  router.push({ path: '/personal-center', query: { tab: 'started' } })
}

function loadRecord() {
  const row = findPersonalProcess(recordId.value, 'started')
  if (!row || row.status !== '已驳回') {
    ElMessage.warning('仅「已驳回」的巡检发起记录可编辑')
    toStartedList()
    return
  }
  record.value = row
  const detail = row.detail || {}
  form.processDate = detail.rectificationDate || ''
  form.attachments = (detail.rectificationPhotos || []).map((name) => ({
    name: typeof name === 'string' ? name : name?.name || name?.url || '',
    url: typeof name === 'object' ? name?.url || '' : '',
  }))
  form.remark = detail.rectificationNote || ''
}

onMounted(loadRecord)

watch(
  () => route.params.id,
  () => {
    record.value = null
    loadRecord()
  },
)

function flowType(status) {
  if (status === 'done') return 'success'
  if (status === 'current') return 'primary'
  return 'info'
}

function handleSubmit() {
  if (!form.processDate) return ElMessage.warning('请选择整改日期')
  if (!form.attachments.length) return ElMessage.warning('请至少上传一张整改照片')
  if (!form.remark.trim()) return ElMessage.warning('请填写整改说明')

  const updated = resubmitInspectionStarted(recordId.value, {
    rectDate: form.processDate,
    rectPhotos: form.attachments.map((item) => item.name || item.url || ''),
    rectNote: form.remark.trim(),
  })
  if (!updated) return ElMessage.error('重新提交失败，请确认该记录仍为「已驳回」状态')
  ElMessage.success('整改结果已重新提交，状态更新为审批中，并已生成复查待办')
  toStartedList()
}
</script>

<template>
  <div class="handle-page page-card">
    <div class="page-header">
      <div class="title-row">
        <el-button :icon="ArrowLeft" @click="toStartedList">返回</el-button>
        <div class="title-meta">
          <div class="title-line">
            <h1 class="page-title">整改处理</h1>
            <el-tag size="small" type="danger" effect="plain" class="source-tag">巡检管理</el-tag>
            <el-tag v-if="record" size="small" type="warning" effect="plain">已驳回</el-tag>
          </div>
          <p v-if="record?.processName" class="page-sub">{{ record.processName }}</p>
        </div>
      </div>
    </div>

    <el-empty v-if="!record" description="记录不存在或已删除" :image-size="80">
      <el-button type="primary" @click="toStartedList">返回</el-button>
    </el-empty>

    <template v-else>
      <!-- 详情信息（与待办处理页一致） -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">详情信息</div>
        </div>
        <div class="inspection-stage-banner">
          <div>
            <span class="inspection-stage-label">当前业务</span>
            <strong>{{ record.inspectionBizType }}</strong>
          </div>
          <el-tag type="warning" effect="light">{{ record.detail?.currentNode || '—' }}</el-tag>
        </div>
        <el-descriptions :column="2" border size="small" class="desc-panel">
          <el-descriptions-item label="整改单编号">{{ record.detail?.rectifyNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="巡检任务单编号">{{ record.detail?.taskNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ record.detail?.project || '—' }}</el-descriptions-item>
          <el-descriptions-item label="巡检分类">
            <el-tag size="small" effect="plain">{{ record.detail?.inspectionCategory || '—' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="整改人">{{ record.detail?.rectifier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="复查人">{{ record.detail?.reviewer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="截止日期">{{ record.detail?.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ record.detail?.status || record.status || '—' }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <!-- 隐患信息 -->
      <section v-if="record.detail?.hazard" class="block block--panel">
        <div class="block-head">
          <div class="block-title">隐患信息</div>
        </div>
        <div class="inspection-kv"><span>隐患说明</span><b>{{ record.detail.hazard }}</b></div>
        <div v-if="record.detail?.hazardPhotos?.length" class="inspection-kv">
          <span>隐患照片</span><b>{{ record.detail.hazardPhotos.join('、') }}</b>
        </div>
      </section>

      <!-- 整改信息 -->
      <section v-if="showInspectionRectificationInfo && (record.detail?.rectificationDate || record.detail?.rectificationNote)" class="block block--panel">
        <div class="block-head">
          <div class="block-title">整改信息</div>
        </div>
        <div v-if="record.detail?.rectificationDate" class="inspection-kv">
          <span>整改日期</span><b>{{ record.detail.rectificationDate }}</b>
        </div>
        <div v-if="record.detail?.rectificationPhotos?.length" class="inspection-kv">
          <span>整改照片</span><b>{{ record.detail.rectificationPhotos.join('、') }}</b>
        </div>
        <div v-if="record.detail?.rectificationNote" class="inspection-kv">
          <span>整改说明</span><b>{{ record.detail.rectificationNote }}</b>
        </div>
      </section>

      <!-- 复查结果 -->
      <section v-if="showInspectionReviewInfo && (record.detail?.reviewDate || record.detail?.reviewResult || record.detail?.reviewComment)" class="block block--panel">
        <div class="block-head">
          <div class="block-title">复查信息</div>
        </div>
        <div v-if="record.detail?.reviewDate" class="inspection-kv">
          <span>复查日期</span><b>{{ record.detail.reviewDate }}</b>
        </div>
        <div v-if="record.detail?.reviewResult" class="inspection-kv">
          <span>复查结果</span><b class="inspection-pass-text">{{ record.detail.reviewResult }}</b>
        </div>
        <div v-if="record.detail?.reviewComment" class="inspection-kv">
          <span>复查意见</span><b>{{ record.detail.reviewComment }}</b>
        </div>
      </section>

      <!-- 整改处理：与待办处理页的整改表单一致 -->
      <section class="block block--panel block--action">
        <div class="block-head">
          <div class="block-title">整改处理</div>
        </div>
        <el-form label-width="108px" class="op-form inspection-op-form">
          <el-form-item label="整改日期" required>
            <el-date-picker
              v-model="form.processDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择整改日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="整改照片" required>
            <DispatchImageAttachments v-model="form.attachments" name-prefix="整改照片" />
          </el-form-item>
          <el-form-item label="整改说明" required>
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="请描述整改情况..."
            />
          </el-form-item>
        </el-form>
        <div class="op-actions">
          <el-button @click="toStartedList">取消</el-button>
          <el-button type="primary" @click="handleSubmit">提交整改结果</el-button>
        </div>
      </section>

      <!-- 流程记录 -->
      <section class="block block--panel">
        <div class="block-head">
          <div class="block-title">流程记录</div>
        </div>
        <el-timeline class="flow-timeline">
          <el-timeline-item
            v-for="(step, index) in approvalFlow"
            :key="`${step.title}-${index}`"
            :type="flowType(step.status)"
            :hollow="step.status === 'pending'"
            :timestamp="step.time || '待进行'"
            placement="top"
          >
            <div class="flow-card" :class="step.status">
              <div class="flow-title">
                {{ step.title }}
                <el-tag v-if="step.status === 'current'" size="small" type="warning">当前</el-tag>
              </div>
              <div class="flow-meta">处理人：{{ step.user || '—' }}</div>
              <div v-if="step.remark" class="flow-remark">{{ step.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>
    </template>
  </div>
</template>

<style scoped>
.handle-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  background: #fff;
  padding: 16px 20px 28px;
}

.page-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.title-meta {
  flex: 1;
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.source-tag {
  flex-shrink: 0;
}

.page-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.block {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 14px 16px 16px;
  background: #fafbfc;
}

.block--panel {
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.block-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.desc-panel :deep(.el-descriptions__label) {
  width: 96px;
  color: #909399;
}

.inspection-stage-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.inspection-stage-label {
  margin-right: 8px;
  font-size: 13px;
  color: #909399;
}

.inspection-kv {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;
  line-height: 1.6;
}

.inspection-kv span {
  flex: 0 0 80px;
  color: #909399;
}

.inspection-kv b {
  flex: 1;
  color: #303133;
  font-weight: 500;
}

.inspection-pass-text {
  color: #e53935 !important;
  font-weight: 600 !important;
}

.block--action {
  background: #fafbfc;
}

.op-form {
  max-width: 860px;
}

.op-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.flow-timeline {
  padding-left: 4px;
}

.flow-card {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.flow-card.current {
  border-color: #f0c78a;
  background: #fffbe6;
}

.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.flow-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.flow-remark {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}
</style>
