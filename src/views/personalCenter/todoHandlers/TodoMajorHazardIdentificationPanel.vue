<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  finishPersonalTodo,
  handleMajorHazardIdentificationTodo,
} from '../../../mock/personalCenter.js'
import {
  ensureMajorHazardData,
  getControlPointsForDescription,
  getMajorHazardData,
} from '../../../utils/majorHazardManualStorage.js'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
  todoId: { type: String, default: '' },
  isReadonly: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

const form = reactive({ decision: 'pass', remark: '' })
watch(
  () => props.todo,
  () => Object.assign(form, { decision: 'pass', remark: '' }),
  { immediate: true },
)

const majorHazardIdentificationContext = computed(() => {
  if (props.todo?.type !== 'major_hazard_identification') return null
  const projectId = props.todo.majorHazardProjectId
  const identificationId = props.todo.majorHazardIdentificationId
  if (projectId && identificationId) {
    ensureMajorHazardData(projectId)
    const data = getMajorHazardData(projectId)
    const record = data.identifications?.find((item) => item.id === identificationId)
    if (record) return { record, data }
  }

  const detail = props.todo.detail || {}
  return {
    record: {
      categoryName: detail.hazardCategory || '—',
      identifiedBy: props.todo.applicant || '—',
      identifiedAt: String(props.todo.applyTime || '').slice(0, 10) || '—',
      remark: detail.summary || '—',
      approvalStatus: props.todo.status || (props.todo.handleLabel ? '已通过' : '审批中'),
      items: [
        {
          id: `${props.todo.id}-item`,
          description: detail.workName || '—',
          isSuperMajor: detail.superMajor || '—',
          conclusion: '√',
          plannedStart: detail.plannedStart || '—',
          plannedEnd: detail.plannedEnd || '—',
          controlPoints: detail.identificationPoints || [
            ...(detail.identificationBasis
              ? [{ id: `${props.todo.id}-point`, classification: '辨识依据', content: detail.identificationBasis }]
              : []),
          ],
        },
      ],
    },
    data: null,
  }
})

const pointDialogVisible = ref(false)
const pointDialogRows = ref([])
const pointDialogName = ref('')

function pointsOf(item) {
  const context = majorHazardIdentificationContext.value
  if (context?.data) {
    return getControlPointsForDescription(context.data, {
      id: item?.id,
      categoryId: context.record?.categoryId,
    })
  }
  return Array.isArray(item?.controlPoints) ? item.controlPoints : []
}

function openPointDialog(item) {
  pointDialogName.value = item?.description || '类别描述'
  pointDialogRows.value = pointsOf(item)
  pointDialogVisible.value = true
}

function approvalTagType(status) {
  return status === '已通过' ? 'success' : status === '已驳回' ? 'danger' : status === '审批中' ? 'warning' : 'info'
}

function onSubmit() {
  if (form.decision === 'reject' && !String(form.remark || '').trim()) {
    return ElMessage.warning('驳回时请填写审批意见')
  }
  const result = handleMajorHazardIdentificationTodo(props.todoId || props.todo.id, {
    approved: form.decision === 'pass',
    opinion: form.remark,
  })
  if (!result?.ok) return ElMessage.warning(result?.msg || '审批失败')
  const handleLabel = form.decision === 'pass' ? '审批通过' : '审批驳回'
  finishPersonalTodo(props.todoId || props.todo.id, handleLabel)
  ElMessage.success(
    form.decision === 'pass'
      ? '危大工程辨识已审批通过，已同步纳入危大工程清单'
      : '危大工程辨识已驳回，发起人可修改后重新提交',
  )
  emit('back')
}
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">危大工程清单辨识记录</div>
      <el-tag size="small" :type="approvalTagType(majorHazardIdentificationContext?.record?.approvalStatus)">
        {{ majorHazardIdentificationContext?.record?.approvalStatus || '审批中' }}
      </el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="危大工程类别">
        {{ majorHazardIdentificationContext?.record?.categoryName || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="辨识人">
        {{ majorHazardIdentificationContext?.record?.identifiedBy || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="辨识时间">
        {{ majorHazardIdentificationContext?.record?.identifiedAt || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="备注">
        {{ majorHazardIdentificationContext?.record?.remark || '—' }}
      </el-descriptions-item>
    </el-descriptions>
  </section>

  <section class="block block--panel">
    <div class="block-head"><div class="block-title">危大工程辨识明细</div></div>
    <el-table
      :data="majorHazardIdentificationContext?.record?.items || []"
      border
      size="small"
      empty-text="暂无危大工程辨识明细"
    >
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column prop="description" label="类别描述" min-width="300" show-overflow-tooltip />
      <el-table-column prop="isSuperMajor" label="是否超危" width="100" />
      <el-table-column label="本次辨识结论" width="120">
        <template #default="{ row }">
          <el-tag size="small" :type="row.conclusion === '√' ? 'success' : 'info'">{{ row.conclusion }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="计划施工起止时间" width="205">
        <template #default="{ row }">
          <span>{{ row.plannedStart || '—' }} 至 {{ row.plannedEnd || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="管控要点" width="100" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openPointDialog(row)">{{ pointsOf(row).length }}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>

  <el-dialog v-model="pointDialogVisible" :title="`${pointDialogName} · 管控要点`" width="980px" destroy-on-close>
    <el-table :data="pointDialogRows" border stripe size="small" empty-text="暂无管控要点">
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column prop="content" label="管控内容" min-width="360" />
      <el-table-column label="显示状态（红）" width="150">
        <template #default="{ row }"><el-tag type="danger">{{ row.redStatusText || '未落实' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="显示状态（绿）" width="150">
        <template #default="{ row }"><el-tag type="success">{{ row.greenStatusText || '已落实' }}</el-tag></template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button type="primary" @click="pointDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <section v-if="!isReadonly" class="block block--panel block--action">
    <div class="block-head"><div class="block-title">审批操作</div></div>
    <el-form label-width="96px" class="op-form">
      <el-form-item label="处理意见" required>
        <el-radio-group v-model="form.decision">
          <el-radio value="pass">通过</el-radio>
          <el-radio value="reject">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="说明" :required="form.decision === 'reject'">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          :placeholder="form.decision === 'reject' ? '驳回意见必填' : '审批意见选填'"
        />
      </el-form-item>
    </el-form>
    <div class="op-actions">
      <el-button @click="emit('back')">取消</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </section>
</template>
