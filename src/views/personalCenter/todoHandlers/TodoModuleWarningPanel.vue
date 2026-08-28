<script setup>
import { computed, reactive, ref } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  disposePersonalWarningCenterItem,
  getPersonalWarningCenterItem,
} from '../../../mock/personalCenter.js'

const props = defineProps({
  todo: { type: Object, default: null },
  fromTab: { type: String, default: 'warning-center' },
  isReadonly: { type: Boolean, default: false },
  onBack: { type: Function, default: null },
})

const refreshTick = ref(0)
const submitting = ref(false)
const attachmentList = ref([])
const form = reactive({ disposalResult: '已处置', disposalNote: '' })

const DISPOSAL_RESULT_OPTIONS = ['已处置', '误报']

const warningCenterId = computed(() => props.todo?.warningCenterId || props.todo?.id || '')

const detail = computed(() => {
  refreshTick.value
  if (!warningCenterId.value) return null
  return getPersonalWarningCenterItem(warningCenterId.value)
})

const canDispose = computed(
  () =>
    !props.isReadonly &&
    detail.value?.warnType === '处置任务' &&
    detail.value?.status === '待处理',
)

function onFileChange(_file, files) {
  attachmentList.value = files
}

function onFileRemove(_file, files) {
  attachmentList.value = files
}

async function submitDispose() {
  if (!detail.value) return
  if (!form.disposalResult) return ElMessage.warning('请选择处置结果')
  const disposalNote = form.disposalNote.trim()
  if (!disposalNote) return ElMessage.warning('请填写处置说明')
  await ElMessageBox.confirm('确认处置完成并关闭该预警？', '预警处置', {
    type: 'warning',
    confirmButtonText: '确认关闭',
    cancelButtonText: '取消',
  })
  submitting.value = true
  try {
    const updated = disposePersonalWarningCenterItem(detail.value.id, {
      disposalResult: form.disposalResult,
      disposalNote,
      attachments: attachmentList.value.map((file) => file.name || file),
      operator: '张明',
    })
    if (!updated) return ElMessage.warning('该预警已处置或状态已变化')
    refreshTick.value += 1
    form.disposalNote = ''
    attachmentList.value = []
    ElMessage.success('预警已处置并关闭')
  } finally {
    submitting.value = false
  }
}

function handleBack() {
  props.onBack?.()
}
</script>

<template>
  <div v-if="detail" class="module-warning-panel">
    <section class="detail-section">
      <div class="section-title">预警详情</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="预警编号">{{ detail.warningNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属模块">{{ detail.module || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警类型">{{ detail.alertType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警状态">{{ detail.status || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属项目">{{ detail.projectName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警时间">{{ detail.time || '—' }}</el-descriptions-item>
        <el-descriptions-item label="发生位置">{{ detail.location || '—' }}</el-descriptions-item>
        <el-descriptions-item label="设备/监测源">{{ detail.sourceName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="当前处置人">{{ detail.handler || '—' }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ detail.warnType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警内容" :span="2">{{ detail.description || '—' }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-if="detail.status === '已关闭'" class="detail-section">
      <div class="section-title">处置信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="处置结果">{{ detail.disposalResult || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置人">{{ detail.handler || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置时间">{{ detail.time || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置附件">
          {{ detail.disposalAttachments?.join('、') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="处置说明" :span="2">{{ detail.disposalNote || '—' }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-if="canDispose" class="detail-section dispose-section">
      <div class="section-title">预警处置</div>
      <el-form :model="form" label-width="86px" class="dispose-form">
        <el-form-item label="处置结果" required>
          <el-radio-group v-model="form.disposalResult">
            <el-radio v-for="opt in DISPOSAL_RESULT_OPTIONS" :key="opt" :value="opt">{{ opt }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处置说明" required>
          <el-input
            v-model="form.disposalNote"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            :placeholder="form.disposalResult === '误报' ? '请说明判断为误报的原因' : '请说明现场如何处理以及当前处理结果'"
            aria-label="请填写处置说明"
          />
        </el-form-item>
        <el-form-item label="处置附件">
          <el-upload
            :file-list="attachmentList"
            :auto-upload="false"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            :limit="5"
            multiple
          >
            <el-button size="small" :icon="Upload">上传附件</el-button>
            <template #tip>
              <div class="upload-tip">非必填，最多上传 5 个文件，支持图片、PDF 和常用文档。</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submitDispose">处置并关闭</el-button>
        </el-form-item>
      </el-form>
    </section>
  </div>

  <el-empty v-else description="未找到对应预警信息">
    <el-button type="primary" @click="handleBack">返回预警中心</el-button>
  </el-empty>
</template>

<style scoped>
.module-warning-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.detail-section {
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  background: #fff;
  padding: 20px 24px;
}
.section-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
}
.dispose-form {
  max-width: 760px;
}
.upload-tip {
  color: var(--ap-text-muted, #909399);
  font-size: 12px;
  line-height: 1.5;
}
</style>
