<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getWarningDetail,
  getProjectLabel,
  handleWarning,
  warningStatusTagClass,
  disposalTypeLabels,
  disposalTypeTagClass,
  getWarningHandleGuide,
} from '../../mock/laborWarningList'

const route = useRoute()
const router = useRouter()
const detail = ref(null)
const handleContent = ref('')
const attachmentList = ref([])
const submitting = ref(false)
const showHandleForm = ref(false)

const canHandle = computed(() => {
  if (!detail.value) return false
  return detail.value.handle_mode === '手动处理' && detail.value.status !== '已关闭'
})

const handleGuide = computed(() => {
  if (!detail.value) return ''
  return getWarningHandleGuide(detail.value.rule_key)
})

onMounted(() => {
  loadDetail()
  if (route.query.handle === '1') {
    openHandleForm()
  }
})

function loadDetail() {
  detail.value = getWarningDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到预警信息')
    router.replace({ name: 'LaborWarningList' })
  }
}

function goBack() {
  router.push({ name: 'LaborWarningList' })
}

function goPersonnel() {
  if (!detail.value?.personnel_id) return
  router.push({ name: 'RealNamePersonnelDetail', params: { id: detail.value.personnel_id } })
}

function resetHandleForm() {
  handleContent.value = ''
  attachmentList.value = []
}

function openHandleForm() {
  showHandleForm.value = true
  nextTick(() => {
    document.querySelector('.handle-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function handleFileChange(_uploadFile, uploadFiles) {
  attachmentList.value = uploadFiles
}

function removeFile(_uploadFile, uploadFiles) {
  attachmentList.value = uploadFiles
}

function previewAttachment(name) {
  ElMessage.info(`预览附件：${name}`)
}

async function submitHandle(close = false) {
  const content = handleContent.value.trim()
  if (!content) {
    ElMessage.warning('请填写处置说明')
    return
  }
  if (close) {
    await ElMessageBox.confirm('确认处置完成并关闭该预警？', '提示', { type: 'warning' })
  }
  submitting.value = true
  try {
    handleWarning(detail.value.id, {
      content,
      close,
      attachments: close ? attachmentList.value : [],
    })
    resetHandleForm()
    loadDetail()
    if (!close) showHandleForm.value = true
    else showHandleForm.value = false
    ElMessage.success(close ? '预警已关闭' : '处置记录已提交')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="detail" class="warning-detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 预警清单 / 详情</div>
      <div class="page-toolbar">
        <div class="toolbar-left">
          <el-button size="small" :icon="ArrowLeft" class="back-btn" @click="goBack">返回列表</el-button>
          <h1 class="page-title">预警详情</h1>
        </div>
        <el-button
          v-if="canHandle"
          type="primary"
          class="ap-btn-primary"
          @click="openHandleForm"
        >
          处置预警
        </el-button>
      </div>
      <div class="title-main">
        <div>
          <h2 class="warning-name">{{ detail.rule_label }}</h2>
          <div class="sub-meta">
            <span>{{ detail.warning_no }}</span>
            <span>{{ getProjectLabel(detail.project_id) }}</span>
            <span class="ap-status-tag" :class="warningStatusTagClass[detail.status]">{{ detail.status }}</span>
            <el-tag
              size="small"
              :type="detail.handle_mode === '系统自动关闭' ? 'success' : detail.handle_mode === '通知' ? 'info' : 'warning'"
              effect="plain"
            >
              {{ detail.handle_mode }}
            </el-tag>
            <span v-if="detail.status !== '已关闭'">当前 {{ detail.current_level }} 级</span>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <section class="detail-section">
        <div class="section-title">预警信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预警编号">{{ detail.warning_no }}</el-descriptions-item>
          <el-descriptions-item label="预警类型">{{ detail.rule_label }}</el-descriptions-item>
          <el-descriptions-item label="触发时间">{{ detail.triggered_at }}</el-descriptions-item>
          <el-descriptions-item label="关闭时间">{{ detail.closed_at || '-' }}</el-descriptions-item>
          <el-descriptions-item label="处置方式">{{ detail.handle_mode }}</el-descriptions-item>
          <el-descriptions-item label="当前层级">
            {{ detail.status === '已关闭' ? '-' : `${detail.current_level} 级` }}
          </el-descriptions-item>
          <el-descriptions-item label="触发原因" :span="2">{{ detail.trigger_reason }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title">关联人员</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="人员姓名">
            <el-button link type="primary" @click="goPersonnel">{{ detail.name }}</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="人员编号">{{ detail.personnel_no }}</el-descriptions-item>
          <el-descriptions-item label="参建单位">{{ detail.unit_name }}</el-descriptions-item>
          <el-descriptions-item label="工种/职务">{{ detail.work_type }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-section">
        <div class="section-title">处置详情</div>

        <div class="handle-mode-guide">
          <div class="guide-title">处置方法说明</div>
          <div class="guide-content">{{ handleGuide }}</div>
        </div>

        <el-timeline>
          <el-timeline-item
            v-for="(record, index) in detail.disposal_records"
            :key="index"
            :timestamp="record.time"
            placement="top"
          >
            <div class="timeline-card">
              <div class="timeline-head">
                <span class="ap-status-tag" :class="disposalTypeTagClass[record.type]">
                  {{ disposalTypeLabels[record.type] }}
                </span>
                <span class="timeline-operator">{{ record.operator }}</span>
              </div>
              <div class="timeline-content">{{ record.content }}</div>
              <div v-if="record.attachments?.length" class="timeline-attachments">
                <span class="attach-label">附件：</span>
                <el-button
                  v-for="file in record.attachments"
                  :key="file"
                  link
                  type="primary"
                  size="small"
                  @click="previewAttachment(file)"
                >
                  {{ file }}
                </el-button>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>

        <div v-if="canHandle && showHandleForm" class="handle-form">
          <div class="handle-form-title">新增处置</div>
          <el-form label-width="80px">
            <el-form-item label="处置说明" required>
              <el-input
                v-model="handleContent"
                type="textarea"
                :rows="3"
                placeholder="请填写本次处置措施及结果"
              />
            </el-form-item>
            <el-form-item label="处置附件">
              <el-upload
                :file-list="attachmentList"
                :auto-upload="false"
                :on-change="handleFileChange"
                :on-remove="removeFile"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
              >
                <el-button size="small" :icon="Upload">上传附件</el-button>
                <template #tip>
                  <div class="upload-tip">处置并关闭时可上传相关证明材料，支持 PDF、Word、图片</div>
                </template>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button :loading="submitting" @click="submitHandle(false)">提交处置</el-button>
              <el-button type="primary" class="ap-btn-primary" :loading="submitting" @click="submitHandle(true)">
                处置并关闭
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.warning-detail-page { padding: 20px 24px 32px; }
.page-header { margin-bottom: 20px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.back-btn { padding: 5px 11px; height: 28px; font-size: 13px; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; white-space: nowrap; }
.title-main { margin-bottom: 4px; }
.warning-name { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
.sub-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 13px; color: var(--ap-text-muted); }
.detail-section { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 20px 24px; margin-bottom: 16px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
.handle-mode-guide {
  margin-bottom: 20px;
  padding: 12px 16px;
  border-radius: 6px;
  background: var(--ap-info-bg, #f0f7ff);
  border: 1px solid var(--ap-border);
}
.guide-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 6px;
}
.guide-content {
  font-size: 13px;
  color: var(--ap-text-secondary, #606266);
  line-height: 1.7;
}
.timeline-card { padding: 4px 0; }
.timeline-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.timeline-operator { font-size: 13px; color: var(--ap-text-muted); }
.timeline-content { font-size: 14px; color: var(--ap-text); line-height: 1.6; }
.timeline-attachments { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 8px; }
.attach-label { font-size: 13px; color: var(--ap-text-muted); }
.handle-form { margin-top: 20px; padding-top: 20px; border-top: 1px dashed var(--ap-border); }
.handle-form-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--ap-text); }
.upload-tip { font-size: 12px; color: var(--ap-text-muted); line-height: 1.5; }
</style>
