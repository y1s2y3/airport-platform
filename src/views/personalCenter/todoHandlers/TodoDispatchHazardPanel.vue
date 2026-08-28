<script setup>
import { computed, reactive, toRef, watch } from 'vue'
import { DISPATCH_HAZARD_TODO_BIZ } from '../../../mock/personalCenter.js'
import {
  getDispatchHazards,
  resolveDispatchHazardPhotoSrc,
  resolveDispatchHazardPhotoName,
} from '../../../utils/dispatchHazardStorage.js'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'
import { usePersonalTodoSubmit } from '../composables/usePersonalTodoSubmit.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
  todoId: { type: String, default: '' },
  isReadonly: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

const todoRef = toRef(props, 'todo')
const todoIdRef = computed(() => props.todoId)
const { submitDispatchHazardRectifyTodo, submitDispatchHazardAcceptTodo } = usePersonalTodoSubmit({
  todo: todoRef,
  todoId: todoIdRef,
  goBack: () => emit('back'),
})

const mergedHazard = computed(() => {
  if (!props.todo || props.todo.type !== 'dispatch_hazard') return null
  const base = { ...(props.todo.hazard || {}) }
  const live = getDispatchHazards().find((item) => item.id === props.todo.hazardId)
  return live
    ? { ...base, ...live, id: live.id || base.id || props.todo.hazardId }
    : { ...base, id: base.id || props.todo.hazardId }
})

const rectifyPhotoUrls = computed(() =>
  (mergedHazard.value?.rectifyPhotos || []).map((photo, index) =>
    resolveDispatchHazardPhotoSrc(photo, index),
  ),
)

const dispatchHazardForm = reactive({
  remark: '',
  photos: [],
  decision: 'pass',
  rejectRemark: '',
})

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function sourceTypeLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type || '—'
}

function resetForm() {
  Object.assign(dispatchHazardForm, {
    remark: '',
    photos: [],
    decision: 'pass',
    rejectRemark: '',
  })
}

watch(() => props.todo, resetForm, { immediate: true })
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">调度隐患详情</div>
      <el-tag size="small" type="warning" effect="light">
        {{ mergedHazard?.rectifyStatus || '待整改' }}
      </el-tag>
    </div>
    <el-descriptions v-if="mergedHazard" :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="项目名称">{{ mergedHazard.projectName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(mergedHazard.hazardType) }}</el-descriptions-item>
      <el-descriptions-item label="隐患描述" :span="2">{{ mergedHazard.description || '—' }}</el-descriptions-item>
      <el-descriptions-item label="隐患等级">{{ mergedHazard.hazardLevel || '—' }}</el-descriptions-item>
      <el-descriptions-item label="整改状态">{{ mergedHazard.rectifyStatus || '待整改' }}</el-descriptions-item>
      <el-descriptions-item label="整改人">{{ mergedHazard.rectifier || '—' }}</el-descriptions-item>
      <el-descriptions-item label="整改期限">{{ mergedHazard.hazardDeadline || '—' }}</el-descriptions-item>
      <el-descriptions-item label="摄像头">{{ mergedHazard.cameraName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="监控点位">{{ mergedHazard.cameraLocation || '—' }}</el-descriptions-item>
      <el-descriptions-item label="截图方式">{{ sourceTypeLabel(mergedHazard.sourceType) }}</el-descriptions-item>
      <el-descriptions-item label="登记来源">{{ mergedHazard.source || '问题截图' }}</el-descriptions-item>
      <el-descriptions-item label="登记时间" :span="2">{{ mergedHazard.uploadTime || '—' }}</el-descriptions-item>
      <el-descriptions-item :label="`${hazardTypeLabel(mergedHazard.hazardType)}隐患截图`" :span="2">
        <div class="detail-snapshot-thumb">
          <el-image
            v-if="mergedHazard.snapshot"
            :src="mergedHazard.snapshot"
            :preview-src-list="[mergedHazard.snapshot]"
            fit="cover"
            class="detail-photo-thumb"
            alt="隐患截图"
          />
          <div v-else class="detail-snapshot-empty">暂无截图</div>
        </div>
      </el-descriptions-item>
      <el-descriptions-item v-if="mergedHazard.rectifyStatus !== '待整改'" label="整改说明" :span="2">
        {{ mergedHazard.rectifyRemark || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-if="mergedHazard.rectifyStatus !== '待整改'" label="整改照片" :span="2">
        <div v-if="mergedHazard.rectifyPhotos?.length" class="detail-photo-thumbs">
          <el-image
            v-for="(photo, index) in mergedHazard.rectifyPhotos"
            :key="`${resolveDispatchHazardPhotoName(photo, index)}-${index}`"
            :src="resolveDispatchHazardPhotoSrc(photo, index)"
            :preview-src-list="rectifyPhotoUrls"
            :initial-index="index"
            fit="cover"
            class="detail-photo-thumb"
            :alt="resolveDispatchHazardPhotoName(photo, index)"
          />
        </div>
        <span v-else>—</span>
      </el-descriptions-item>
    </el-descriptions>
  </section>

  <section v-if="!isReadonly" class="block block--panel block--action">
    <div class="block-head">
      <div class="block-title">审批操作</div>
    </div>

    <template v-if="todo.bizType === DISPATCH_HAZARD_TODO_BIZ.RECTIFY">
      <el-form label-width="96px" class="op-form">
        <el-form-item label="整改说明" required>
          <el-input
            v-model="dispatchHazardForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请描述整改措施及完成情况"
            aria-label="请描述整改措施及完成情况"
          />
        </el-form-item>
        <el-form-item label="整改照片" required>
          <DispatchImageAttachments v-model="dispatchHazardForm.photos" name-prefix="整改照片" />
        </el-form-item>
      </el-form>
      <div class="op-actions">
        <el-button @click="emit('back')">取消</el-button>
        <el-button type="primary" @click="submitDispatchHazardRectifyTodo(mergedHazard, dispatchHazardForm)">
          提交整改
        </el-button>
      </div>
    </template>

    <template v-else-if="todo.bizType === DISPATCH_HAZARD_TODO_BIZ.ACCEPT">
      <el-form label-width="96px" class="op-form">
        <el-form-item label="验收结果" required>
          <el-radio-group v-model="dispatchHazardForm.decision">
            <el-radio value="pass">验收通过</el-radio>
            <el-radio value="reject">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="dispatchHazardForm.decision === 'pass'" label="验收意见">
          <el-input
            v-model="dispatchHazardForm.remark"
            type="textarea"
            :rows="3"
            placeholder="可填写验收说明"
            aria-label="可填写验收说明"
          />
        </el-form-item>
        <el-form-item v-else label="驳回原因" required>
          <el-input
            v-model="dispatchHazardForm.rejectRemark"
            type="textarea"
            :rows="4"
            placeholder="请说明整改不到位之处，退回继续整改"
            aria-label="请说明整改不到位之处，退回继续整改"
          />
        </el-form-item>
      </el-form>
      <div class="op-actions">
        <el-button @click="emit('back')">取消</el-button>
        <el-button
          :type="dispatchHazardForm.decision === 'pass' ? 'success' : 'danger'"
          @click="submitDispatchHazardAcceptTodo(mergedHazard, dispatchHazardForm)"
        >
          {{ dispatchHazardForm.decision === 'pass' ? '确认通过' : '确认驳回' }}
        </el-button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.detail-snapshot-thumb,
.detail-photo-thumb {
  width: 120px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
  border: 1px solid var(--ap-border, #e4e7ed);
}
.detail-snapshot-empty {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #a3a6ad;
  background: #f5f7fa;
  border-radius: 4px;
}
.detail-photo-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
