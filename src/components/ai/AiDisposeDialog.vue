<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { disposeAiAlert } from '../../mock/aiApp.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  alert: { type: Object, default: null },
  alerts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'submitted'])
const formRef = ref(null)
const submitting = ref(false)
const form = reactive({ disposition: '已处理', disposalNote: '' })
const fileList = ref([])
const targets = computed(() => (props.alerts.length ? props.alerts : props.alert ? [props.alert] : []))
const isBatch = computed(() => props.alerts.length > 0)
const dialogTitle = computed(() => (isBatch.value ? `批量处置（${targets.value.length} 条）` : '预警处置'))

const rules = {
  disposition: [{ required: true, message: '请选择处置结果', trigger: 'change' }],
  disposalNote: [{ required: true, message: '请填写处置说明', trigger: 'blur' }],
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    form.disposition = '已处理'
    form.disposalNote = ''
    fileList.value = []
    formRef.value?.clearValidate?.()
  },
)

function close() {
  if (submitting.value) return
  emit('update:modelValue', false)
}

async function submit() {
  if (!targets.value.length) return
  const valid = await formRef.value?.validate?.().catch(() => false)
  if (!valid) return
  submitting.value = true
  const attachments = fileList.value.map((file) => ({ name: file.name, size: file.size || 0 }))
  targets.value.forEach((item) => {
    disposeAiAlert(item.id, form.disposition, form.disposalNote, item.handler, attachments)
  })
  ElMessage.success(isBatch.value ? `已批量处置 ${targets.value.length} 条预警` : '预警处置成功')
  submitting.value = false
  emit('submitted', targets.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="620px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @close="close"
  >
    <div v-if="targets.length" class="dispose-dialog-body">
      <div v-if="isBatch" class="batch-summary">
        已选择 {{ targets.length }} 条未处置预警，将使用相同的处置结果、说明和附件统一处置。
      </div>
      <div v-else class="alert-summary">
        <div class="summary-visual">
          <span>{{ alert.alertType }}</span>
        </div>
        <div class="summary-info">
          <div class="summary-title">{{ alert.alertType }}</div>
          <div class="summary-line">预警时间：{{ alert.occurredAt }}</div>
          <div class="summary-line">发生位置：{{ alert.location }}</div>
          <div class="summary-line">处置人：{{ alert.handler }}</div>
        </div>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="86px" class="dispose-form">
        <el-form-item label="处置结果" prop="disposition">
          <el-radio-group v-model="form.disposition">
            <el-radio value="已处理">已处理</el-radio>
            <el-radio value="误报">误报</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处置说明" prop="disposalNote">
          <el-input
            v-model="form.disposalNote"
            type="textarea"
            :rows="4"
            maxlength="300"
            show-word-limit
            :placeholder="form.disposition === '误报' ? '请说明判断为误报的原因' : '请说明现场如何处理以及当前处理结果'"
          />
        </el-form-item>
        <el-form-item label="处置附件">
          <el-upload
            v-model:file-list="fileList"
            action="#"
            :auto-upload="false"
            :limit="5"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
          >
            <el-button>上传附件</el-button>
            <template #tip>
              <div class="upload-tip">非必填，最多上传 5 个文件，支持图片、PDF 和常用文档。</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.alert-summary {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 22px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fafbfc;
  padding: 14px;
}

.batch-summary {
  margin-bottom: 20px;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  background: #f4f9ff;
  padding: 12px 14px;
  color: var(--ap-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.upload-tip {
  color: var(--ap-text-muted);
  font-size: 12px;
}

.summary-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  border-radius: 6px;
  background: linear-gradient(135deg, #565d67, #24282e);
  color: #fff;
  font-size: 13px;
}

.summary-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
}

.summary-title {
  color: var(--ap-text);
  font-size: 16px;
  font-weight: 600;
}

.summary-line {
  color: var(--ap-text-secondary);
  font-size: 13px;
}

.dispose-form {
  padding-right: 12px;
}

@media (max-width: 640px) {
  .alert-summary {
    grid-template-columns: 1fr;
  }
}
</style>
