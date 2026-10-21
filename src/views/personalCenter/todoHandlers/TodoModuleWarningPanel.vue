<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AttachmentUpload from '../../../components/common/AttachmentUpload.vue'
import '../../aiApp/ai-app.css'
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

const warningCenterId = computed(() => props.todo?.warningCenterId || props.todo?.id || '')

const detail = computed(() => {
  refreshTick.value
  if (!warningCenterId.value) return null
  return getPersonalWarningCenterItem(warningCenterId.value)
})

const isMajorHazardAlert = computed(() => detail.value?.module === '危大工程管理')
const isAiAlert = computed(() => detail.value?.module === 'AI应用')
const isMachineAlert = computed(() => detail.value?.module === '机械设备监管')
const disposalResultOptions = computed(() => {
  if (isMajorHazardAlert.value) return ['已关闭']
  if (isAiAlert.value) return ['已处理', '误报']
  return ['已处置', '误报']
})
const noteLabel = computed(() => {
  if (isMachineAlert.value) return '预警说明'
  return '处置说明'
})
watch(disposalResultOptions, (options) => {
  if (!options.includes(form.disposalResult)) form.disposalResult = options[0]
}, { immediate: true })

const canDispose = computed(
  () =>
    !props.isReadonly &&
    detail.value?.warnType === '处置任务' &&
    detail.value?.status === '待处理',
)

async function submitDispose() {
  if (!detail.value) return
  if (!form.disposalResult) return ElMessage.warning('请选择处置结果')
  if (isMajorHazardAlert.value && form.disposalResult === '误报') {
    return ElMessage.warning('危大工程异常不支持按误报处置')
  }
  const disposalNote = form.disposalNote.trim()
  if (!disposalNote && !isMachineAlert.value) return ElMessage.warning(`请填写${noteLabel.value}`)
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
    <div class="warning-primary" :class="{ 'with-snapshot': detail.business?.snapshot }">
    <section v-if="detail.business?.snapshot" class="detail-section">
      <div class="section-title">预警截图</div>
      <div class="ai-snapshot large">
        <span class="ai-snapshot-label">{{ detail.business.snapshot.alertType }} · {{ detail.business.snapshot.camera }}</span>
      </div>
    </section>
    <section class="detail-section">
      <div class="section-title">预警详情</div>
      <el-descriptions v-if="detail.business" :column="detail.business.snapshot ? 1 : 2" border>
        <el-descriptions-item
          v-for="item in detail.business.fields"
          :key="item.label"
          :label="item.label"
          :span="['预警内容', '异常内容', '隐患内容'].includes(item.label) ? 2 : 1"
        >{{ item.value || '--' }}</el-descriptions-item>
      </el-descriptions>
      <el-descriptions v-else :column="2" border>
        <el-descriptions-item label="预警编号">{{ detail.warningNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属模块">{{ detail.module || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警类型">{{ detail.alertType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警状态">{{ detail.status || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属项目">{{ detail.projectName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警时间">{{ detail.time || '—' }}</el-descriptions-item>
        <template v-if="isMajorHazardAlert">
          <el-descriptions-item label="施工部位">{{ detail.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="危大清单名称">{{ detail.sourceName || '—' }}</el-descriptions-item>
        </template>
        <template v-else>
          <el-descriptions-item label="发生位置">{{ detail.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="设备/监测源">{{ detail.sourceName || '—' }}</el-descriptions-item>
        </template>
        <el-descriptions-item label="当前处置人">{{ detail.handler || '—' }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ detail.warnType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="预警内容" :span="2">{{ detail.description || '—' }}</el-descriptions-item>
      </el-descriptions>
    </section>
    </div>

    <section v-if="detail.business?.disposalFields?.length" class="detail-section">
      <div class="section-title">处置信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item
          v-for="item in detail.business.disposalFields"
          :key="item.label"
          :label="item.label"
          :span="['处置说明', '处置记录', '预警说明'].includes(item.label) ? 2 : 1"
        >{{ item.value || '--' }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-else-if="!detail.business && detail.status === '已关闭'" class="detail-section">
      <div class="section-title">处置信息</div>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="处置结果">{{ detail.disposalResult || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置人">{{ detail.handler || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置时间">{{ (isMajorHazardAlert ? detail.disposalTime : detail.time) || '—' }}</el-descriptions-item>
        <el-descriptions-item label="处置附件">
          {{ detail.disposalAttachments?.join('、') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="处置说明" :span="2">{{ detail.disposalNote || '—' }}</el-descriptions-item>
      </el-descriptions>
    </section>

    <section v-if="canDispose" class="detail-section dispose-section">
      <div class="section-title">预警处置</div>
      <el-form :model="form" label-width="86px" class="dispose-form">
        <el-form-item :label="isMachineAlert ? '处理结果' : '处置结果'" required>
          <el-tag v-if="isMajorHazardAlert" type="success">已关闭</el-tag>
          <el-radio-group v-else v-model="form.disposalResult">
            <el-radio v-for="opt in disposalResultOptions" :key="opt" :value="opt">{{ opt }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="noteLabel" :required="!isMachineAlert">
          <el-input
            v-model="form.disposalNote"
            type="textarea"
            :rows="4"
            :maxlength="isAiAlert ? 300 : 500"
            show-word-limit
            :placeholder="form.disposalResult === '误报' ? '请说明判断为误报的原因' : `请填写${noteLabel}`"
            :aria-label="`请填写${noteLabel}`"
          />
        </el-form-item>
        <el-form-item label="处置附件">
          <AttachmentUpload v-model="attachmentList" preset="file" :min="0" :max="9" name-prefix="处置附件" />
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
.warning-primary {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.warning-primary.with-snapshot {
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
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
@media (max-width: 1100px) {
  .warning-primary.with-snapshot {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
