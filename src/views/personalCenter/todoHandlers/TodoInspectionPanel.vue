<script setup>
import { getInspectionTaskPhotos } from '../../../utils/inspectionTaskPhotos.js'
import { getInspectionTaskForRectification } from '../../../mock/mobileInspectionTasks'
import InspectionPhotoList from '../../../components/InspectionPhotoList.vue'
import { inspectionDateKey } from '../../../utils/inspectionLedgerDates'
import InspectionPersonMultiSelect from '../../../components/InspectionPersonMultiSelect.vue'
import { computed, reactive, ref, toRef, watch } from 'vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'
import { userOptions, getUserLabel, checkCategoryTree, getItemLabel } from '../../../composables/useInspectionPlan.js'
import { validateInspectionHazard, normalizeInspectionCategories, resolveInspectionProjectId } from '../../../config/inspectionManagement.js'
import { COC_PROJECT_OPTIONS } from '../../../config/projectOptions.js'
import { getMajorHazardLedgerOptions } from '../../../utils/inspectionMajorHazardLink.js'
import { usePersonalTodoSubmit } from '../composables/usePersonalTodoSubmit.js'
import '../styles/todoHandleBlocks.css'
import { inspectorCandidates, getProjectRectifierLabel, getProjectReviewerLabel, getInspectionCopyDefaults, getInspectionCopyDetailFields, INSPECTION_COPY_FIELDS } from '../../../composables/useInspectionPersonConfig'
import { getMobileRectification, getTaskHazardRectification } from '../../../composables/useMobileRectification'
import { currentWorkflowStep, rectificationIssuedAt } from '../../../utils/inspectionRectificationWorkflow'

import { useInspectionHazardOptions } from '../../../composables/useInspectionCategoryForm'

const inspectionPersonOptions = inspectorCandidates.map(person => `${person.name}（${person.role}）`)

const props = defineProps({
  todo: { type: Object, required: true },
  todoId: { type: String, default: '' },
  isReadonly: { type: Boolean, default: false },
})

const assignmentRecord = computed(() => getMobileRectification(props.todo.rectifyId))
const inspectionPhotos = computed(() => getInspectionTaskPhotos(props.todo.detail))
const rectificationInspectionPhotos = computed(() => getInspectionTaskPhotos(getInspectionTaskForRectification(
  assignmentRecord.value || { ...props.todo.detail, id: props.todo.rectifyId },
)))
const rectificationCopyFields = computed(() => getInspectionCopyDetailFields(assignmentRecord.value, props.todo.detail))
const hazardCopyFields = hazard => getInspectionCopyDetailFields(getTaskHazardRectification(hazard), hazard)
const assignmentStage = computed(() => props.todo.expectedWorkflowStage)
const emit = defineEmits(['back'])

const todoRef = toRef(props, 'todo')
const todoIdRef = computed(() => props.todoId)
const { submitInspectionHandle } = usePersonalTodoSubmit({
  todo: todoRef,
  todoId: todoIdRef,
  goBack: () => emit('back'),
})

/** 单条隐患结构：与移动端执行巡检的 hazardItems 保持一致（有隐患即生成整改单，无需开关） */
function createHazardItem() {
  return {
    hazardCategory: '',
    hazardLevel: '',
    rectifyRequirement: '',
    desc: '',
    photos: [],
    rectifier: getProjectRectifierLabel(props.todo?.detail?.project, props.todo?.detail?.inspectionCategory || '安全'),
    reviewer: getProjectReviewerLabel(props.todo?.detail?.project, props.todo?.detail?.inspectionCategory || '安全'),
    rectifyDeadline: '',
    ...getInspectionCopyDefaults(props.todo?.detail?.projectId || props.todo?.detail?.project, props.todo?.detail?.inspectionCategory || '安全'),
  }
}

const inspectionForm = reactive({
  decision: 'pass',
  processDate: '',
  remark: '',
  inspector: '',
  // 同行人与移动端一致：执行巡检时按现场实际参加人员选择，不从下发任务预填
  companions: [],
  inspectionResult: '',  // 巡检照片 / 整改照片（整改环节）
  attachments: [],
  // 危大工程现场巡视：与移动端执行巡检一致，在执行时判定并选择危大清单
  isMajorHazardPatrol: '否',
  majorHazardProjectId: '',
  majorHazardLedgerId: '',
  // 隐患可多条：与移动端「新增隐患项」一致
  hazardItems: [createHazardItem()],
})

const taskCategory = computed(() => normalizeInspectionCategories(props.todo?.detail?.inspectionCategories || props.todo?.detail?.inspectionCategory).join('、'))
const { hazardCategoryOptions, hazardLevelOptions } = useInspectionHazardOptions(taskCategory, computed(() => inspectionForm.hazardItems))

/** 本次巡视项目：下发任务只带一个项目；保留多项目任务的兼容分支（与移动端一致） */
const patrolProjectOptions = computed(() => {
  const detail = props.todo?.detail || {}
  const names = [...new Set([...(Array.isArray(detail.projects) ? detail.projects : []), detail.project].filter(Boolean))]
  const options = names.map((name) => {
    const project = COC_PROJECT_OPTIONS.find((item) => item.label === name || item.fullName === name)
    return project ? { id: project.id, label: project.label } : { id: resolveInspectionProjectId(name), label: name }
  })
  const deduped = options.filter((item, index) => options.findIndex((other) => other.id === item.id) === index)
  return deduped.length ? deduped : [{ id: resolveInspectionProjectId(detail.project), label: detail.project || '当前任务项目' }]
})

const selectedPatrolProject = computed(() =>
  patrolProjectOptions.value.find((item) => item.id === inspectionForm.majorHazardProjectId) || null,
)

/** 危大清单候选：仅取本次巡视项目下的危大工程 */
const majorHazardLedgerOptions = computed(() =>
  inspectionForm.isMajorHazardPatrol === '是' && inspectionForm.majorHazardProjectId
    ? getMajorHazardLedgerOptions(inspectionForm.majorHazardProjectId)
    : [],
)

watch(() => inspectionForm.majorHazardProjectId, () => {
  if (!majorHazardLedgerOptions.value.some((item) => item.id === inspectionForm.majorHazardLedgerId)) {
    inspectionForm.majorHazardLedgerId = ''
  }
})
watch(() => inspectionForm.isMajorHazardPatrol, (value) => {
  if (value === '是') return
  inspectionForm.majorHazardLedgerId = ''
})

function addInspectionHazard() {
  inspectionForm.hazardItems.push(createHazardItem())
}

function removeInspectionHazard(index) {
  if (inspectionForm.hazardItems.length <= 1) return
  inspectionForm.hazardItems.splice(index, 1)
}

const inspectionActionMeta = computed(() => {
  const type = props.todo?.inspectionBizType || '巡检'
  const map = {
    巡检: { title: '巡检处理', remarkLabel: '巡检结果', pass: '完成巡检', reject: '退回任务' },
    整改: { title: '整改处理', remarkLabel: '整改说明', pass: '提交整改', reject: '退回' },
    复查: { title: '复查处理', remarkLabel: '复查意见', pass: '复查通过', reject: '复查不通过' },
    施工验收: { title: '施工单位项目经理验收', remarkLabel: '施工单位验收意见', pass: '验收通过', reject: '验收不通过' },
    总监验收: { title: '监理单位项目总监验收', remarkLabel: '总监验收意见', pass: '验收通过', reject: '验收不通过' },    项目部长确认: { title: '项目部长确认', remarkLabel: '确认意见', pass: '通过', reject: '不通过' },
    作废审批: { title: '指挥部安全和整改负责人审批', remarkLabel: '作废审批意见', pass: '通过', reject: '不通过' },
    审批: { title: '项目经理审批', remarkLabel: '审批意见', pass: '审批通过', reject: '审批不通过' },
  }
  if (['项目部长确认', '作废审批'].includes(type)) return map[type]
  const step = currentWorkflowStep(getMobileRectification(props.todo?.rectifyId))
  if (step && props.todo?.liveInspectionWorkflow) {
    const action = { rectify: '整改', contractorAcceptance: '施工验收', review: '复核', directorAcceptance: '总监验收', approval: '审批' }[step.key]
    return { title: step.label, remarkLabel: action + (step.key === 'rectify' ? '说明' : '意见'), pass: '通过', reject: '不通过' }
  }
  return map[type] || map.巡检
})
const processDateLabel = computed(() => ({ 项目部长确认: '确认日期', 整改: '整改日期', 复查: '复核日期', 施工验收: '施工验收日期', 总监验收: '总监验收日期' })[props.todo.inspectionBizType] || '审批日期')
// 两类验收通过时意见可不填；其余节点仍必填。
const remarkRequired = computed(() => !(['施工验收', '总监验收'].includes(props.todo?.inspectionBizType) && inspectionForm.decision === 'pass'))

const personalCheckTree = computed(() => {
  const detail = props.todo?.detail || {}
  const groups = new Map()
  // 新版下发任务保存的是分类 ID + 检查项 ID；个人中心优先按这份配置还原，
  // 旧待办仍兼容原有的文字检查项数据。
  for (const config of Array.isArray(detail.checkConfig) ? detail.checkConfig : []) {
    const category = checkCategoryTree.find((item) => item.id === config.categoryId)
    if (!category) continue
    groups.set(category.id, {
      id: category.id,
      label: category.label,
      inspectionCategory: category.inspectionCategory,
      items: (config.itemIds || []).map((itemId) => getItemLabel(category.id, itemId)).filter(Boolean),
    })
  }
  if (groups.size) return [...groups.values()]

  for (const item of detail.checkItems || []) {
    let id = 'general'
    let label = '安全管理行为'
    if (/临时用电|配电|电缆/.test(item)) {
      id = 'electric'
      label = '临时用电'
    } else if (/临边|高处|安全带/.test(item)) {
      id = 'height'
      label = '高处作业'
    } else if (/消防|灭火/.test(item)) {
      id = 'fire'
      label = '消防安全'
    } else if (/机械|设备|塔吊/.test(item)) {
      id = 'machine'
      label = '机械设备'
    }
    if (!groups.has(id)) groups.set(id, { id, label, items: [] })
    groups.get(id).items.push(item)
  }
  return [...groups.values()]
})

const activePersonalCheckCategoryId = ref('')
watch(
  personalCheckTree,
  (tree) => {
    if (!tree.some((item) => item.id === activePersonalCheckCategoryId.value)) {
      activePersonalCheckCategoryId.value = tree[0]?.id || ''
    }
  },
  { immediate: true },
)
const activePersonalCheckCategory = computed(() =>
  personalCheckTree.value.find((item) => item.id === activePersonalCheckCategoryId.value),
)

function resetInspectionForm() {
  Object.assign(inspectionForm, {
    decision: 'pass',
    processDate: new Date().toISOString().slice(0, 10),
    remark: '',
    inspector: props.todo?.detail?.executor || '',
    // 同行人与移动端一致：执行巡检时按现场实际参加人员选择，不从下发任务预填
    companions: [],
    inspectionResult: props.todo?.detail?.inspectionResult || '',    attachments: [],
    hazardItems: [createHazardItem()],
    // 危大工程现场巡视：已选择过则回显，否则按任务项目预置（多项目任务留空待选）
    isMajorHazardPatrol: props.todo?.detail?.isMajorHazardPatrol === '是' ? '是' : '否',
    majorHazardProjectId:
      props.todo?.detail?.majorHazardProjectId
      || (patrolProjectOptions.value.length === 1 ? patrolProjectOptions.value[0].id : ''),
    majorHazardLedgerId: props.todo?.detail?.majorHazardLedgerId || '',
  })
}

watch(() => props.todo, resetInspectionForm, { immediate: true })

// 选择「有隐患」时保证至少有一条隐患可填
watch(
  () => inspectionForm.inspectionResult,
  (value) => {
    if (value === 'hazard' && !inspectionForm.hazardItems.length) addInspectionHazard()
  },
)

function onSubmit() {
  submitInspectionHandle(inspectionForm, inspectionActionMeta.value)
}
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">详情信息</div>
    </div>
    <div class="inspection-stage-banner">
      <div>
        <span class="inspection-stage-label">当前业务</span>
        <strong>{{ todo.inspectionBizType }}</strong>
      </div>
      <el-tag type="warning" effect="light">{{ todo.detail?.currentNode || '—' }}</el-tag>
    </div>
    <el-descriptions
      v-if="todo.inspectionBizType === '巡检'"
      :column="2"
      border
      size="small"
      class="desc-panel"
    >
      <!-- 字段与顺序对齐移动端「巡检任务详情 · 巡检信息」 -->
      <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="任务名称">{{ todo.detail?.taskName || todo.detail?.planName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="任务来源">{{ todo.detail?.source || '—' }}</el-descriptions-item>
      <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
      <el-descriptions-item label="登记人">{{ todo.detail?.executor || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检分类">
        <el-tag
          v-for="category in normalizeInspectionCategories(todo.detail?.inspectionCategories || todo.detail?.inspectionCategory)"
          :key="category"
          size="small"
          :type="category === '质量' ? 'warning' : 'success'"
          effect="plain"
          style="margin-right:4px"
        >{{ category }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="检查类型">{{ todo.detail?.inspectionType || '值班检查' }}</el-descriptions-item>
      <el-descriptions-item v-if="todo.detail?.isMajorHazardPatrol === '是'" label="危大工程名称">{{ todo.detail?.majorHazardName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="截止日期">{{ todo.detail?.deadline || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检日期">{{ todo.detail?.inspectionDate || '—' }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
    </el-descriptions>
    <el-descriptions v-else :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="整改单编号">{{ todo.detail?.rectifyNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检分类">
        <el-tag
          v-for="category in normalizeInspectionCategories(todo.detail?.inspectionCategories || todo.detail?.inspectionCategory)"
          :key="category"
          size="small"
          :type="category === '质量' ? 'warning' : 'success'"
          effect="plain"
          style="margin-right:4px"
        >{{ category }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="登记人">{{ todo.detail?.inspector || '—' }}</el-descriptions-item>
      <el-descriptions-item label="整改单下发日期">{{ inspectionDateKey(rectificationIssuedAt(todo.detail)) || '—' }}</el-descriptions-item>
      <el-descriptions-item label="整改人">{{ todo.detail?.rectifier || '—' }}</el-descriptions-item>
      <el-descriptions-item label="复查人">{{ todo.detail?.reviewer || '—' }}</el-descriptions-item>
      <el-descriptions-item v-for="field in rectificationCopyFields" :key="field.key" :label="field.label">
        {{ field.value }}
      </el-descriptions-item>
      <el-descriptions-item label="截止日期">{{ todo.detail?.deadline || '—' }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
      <el-descriptions-item v-if="todo.detail?.closeDate" label="关闭日期">
        {{ todo.detail.closeDate }}
      </el-descriptions-item>
    </el-descriptions>
    <div v-if="todo.inspectionBizType !== '巡检' && todo.detail?.hazard" class="inspection-detail-block">
      <div class="inspection-section-title">巡检照片</div>
      <InspectionPhotoList v-if="rectificationInspectionPhotos.length" :photos="rectificationInspectionPhotos" />
      <span v-else>未上传</span>
    </div>
    <div v-if="todo.inspectionBizType !== '巡检' && todo.detail?.hazard" class="inspection-detail-block">
      <div class="inspection-section-title">隐患信息</div>
      <div class="inspection-kv"><span>隐患类别</span><b>{{ todo.detail.hazardCategory || '安全管理' }}</b></div>
      <div class="inspection-kv"><span>隐患等级</span><b>{{ todo.detail.hazardLevel || '未设置' }}</b></div>
      <div class="inspection-kv"><span>整改要求</span><b style="white-space:pre-wrap">{{ todo.detail.rectifyRequirement || '未填写' }}</b></div>
      <div class="inspection-kv"><span>隐患说明</span><b>{{ todo.detail.hazard }}</b></div>
      <div v-if="todo.detail.hazardPhotos?.length" class="inspection-kv">
        <span>隐患照片</span><b>{{ todo.detail.hazardPhotos.join('、') }}</b>
      </div>
    </div>
    <div
      v-if="todo.detail?.rectificationDate || todo.detail?.rectificationNote"
      class="inspection-detail-block"
    >
      <div class="inspection-section-title">整改信息</div>
      <div v-if="todo.detail?.rectificationDate" class="inspection-kv">
        <span>整改日期</span><b>{{ todo.detail.rectificationDate }}</b>
      </div>
      <div v-if="todo.detail?.rectificationPhotos?.length" class="inspection-kv">
        <span>整改照片</span><b>{{ todo.detail.rectificationPhotos.join('、') }}</b>
      </div>
      <div v-if="todo.detail?.rectificationNote" class="inspection-kv">
        <span>整改说明</span><b>{{ todo.detail.rectificationNote }}</b>
      </div>
    </div>
    <div
      v-if="todo.detail?.reviewDate || todo.detail?.reviewResult || todo.detail?.reviewComment"
      class="inspection-detail-block"
    >
      <div class="inspection-section-title">复查信息</div>
      <div v-if="todo.detail?.reviewDate" class="inspection-kv"><span>复查日期</span><b>{{ todo.detail.reviewDate }}</b></div>
      <div v-if="todo.detail?.reviewResult" class="inspection-kv"><span>复查结果</span><b>{{ todo.detail.reviewResult }}</b></div>
      <div v-if="todo.detail?.reviewComment" class="inspection-kv"><span>复查意见</span><b>{{ todo.detail.reviewComment }}</b></div>
    </div>
    <div v-if="todo.detail?.checkItems?.length" class="inspection-detail-block">
      <div class="inspection-section-title">检查项</div>
      <div class="inspection-tree-layout">
        <div class="inspection-tree-side">
          <button
            v-for="category in personalCheckTree"
            :key="category.id"
            type="button"
            class="inspection-tree-node"
            :class="{ active: activePersonalCheckCategoryId === category.id }"
            @click="activePersonalCheckCategoryId = category.id"
          >
            <span>{{ category.label }}</span>
            <b>{{ category.items.length }}</b>
          </button>
        </div>
        <div class="inspection-tree-content">
          <div class="inspection-tree-heading">
            {{ activePersonalCheckCategory?.label || '检查项' }}（{{
              activePersonalCheckCategory?.items?.length || 0
            }}项）
          </div>
          <div
            v-for="item in activePersonalCheckCategory?.items || []"
            :key="item"
            class="inspection-tree-item"
          >
            {{ item }}
          </div>
        </div>
      </div>
    </div>
    <div v-if="todo.detail?.inspectionResult" class="inspection-detail-block">
      <div class="inspection-section-title">巡检结果</div>
      <el-tag :type="todo.detail.inspectionResult === 'normal' ? 'success' : 'danger'">
        {{ todo.detail.inspectionResult === 'normal' ? '全部正常' : '有隐患' }}
      </el-tag>
      <div class="inspection-file-text">
        <span>巡检照片</span>
        <InspectionPhotoList v-if="inspectionPhotos.length" :photos="inspectionPhotos" />
        <span v-else>未上传</span>
      </div>
      <div
        v-for="(hazard, index) in todo.detail?.hazardItems || []"
        :key="index"
        class="inspection-hazard-card"
      >
        <strong>隐患 {{ index + 1 }}</strong>
        <span>类别：{{ hazard.hazardCategory || '安全管理' }}</span>
        <span>等级：{{ hazard.hazardLevel || '未设置' }}</span>
        <span>说明：{{ hazard.desc }}</span>
        <span style="white-space:pre-wrap">整改要求：{{ hazard.rectifyRequirement || '未填写' }}</span>
        <div v-if="hazard.photos?.length">
          <span>隐患照片</span>
          <InspectionPhotoList :photos="hazard.photos" name-prefix="隐患照片" />
        </div>
        <span>下发整改单：{{ hazard.issueRectify || hazard.hasRectify ? '是' : '否' }}</span>
        <span v-if="hazard.issueRectify || hazard.hasRectify">
          整改单编号：{{ hazard.rectifyNo || '—' }}
        </span>
        <span v-if="getTaskHazardRectification(hazard)?.status">
          整改单状态：{{ getTaskHazardRectification(hazard).status }}{{ getTaskHazardRectification(hazard).deletion ? '（已删除）' : '' }}
        </span>
        <span v-if="hazard.issueRectify || hazard.hasRectify">
          整改人：{{ hazard.rectifier || hazard.rectifyPerson || '—' }}　复查人：{{
            hazard.reviewer || hazard.reviewPerson || '—'
          }}　截止：{{ hazard.rectifyDeadline || '—' }}
        </span>
        <template v-if="hazard.issueRectify || hazard.hasRectify">
          <span v-for="field in hazardCopyFields(hazard)" :key="field.key">{{ field.label }}：{{ field.value }}</span>
        </template>
      </div>
    </div>
    <div v-if="todo.detail?.voidRequest" class="inspection-detail-block">
      <div class="inspection-section-title">作废申请</div>
      <div class="inspection-kv"><span>申请人</span><b>{{ todo.detail.voidRequest.applicant }}</b></div>
      <div class="inspection-kv"><span>申请时间</span><b>{{ todo.detail.voidRequest.requestedAt }}</b></div>
      <div class="inspection-kv"><span>作废理由</span><b style="white-space:pre-wrap">{{ todo.detail.voidRequest.reason }}</b></div>
      <div class="inspection-kv"><span>审批人</span><b>{{ todo.detail.voidRequest.approver }}</b></div>
      <div class="inspection-kv"><span>结果</span><b>{{ { pending: '作废审批中', approved: '已作废', rejected: '作废申请未通过' }[todo.detail.voidRequest.status] }}</b></div>
      <div v-if="todo.detail.voidRequest.decidedAt" class="inspection-kv"><span>审批意见</span><b>{{ todo.detail.voidRequest.comment }}</b></div>
    </div>
  </section>

  <section v-if="!isReadonly" class="block block--panel block--action">    <div class="block-head">
      <div class="block-title">{{ inspectionActionMeta.title }}</div>
    </div>
    <el-form label-width="108px" class="op-form inspection-op-form">
      <template v-if="todo.inspectionBizType === '巡检'">
        <el-form-item label="同行人">
          <el-select
            v-model="inspectionForm.companions"
            multiple
            filterable
            placeholder="请选择同行人"
            style="width: 100%"
            aria-label="请选择同行人"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="getUserLabel(u.id)"
              :value="getUserLabel(u.id)"
            />
          </el-select>
          <div class="field-tip">同行人为执行巡检时的实际参加人员，请按现场情况选择（下发任务中的同行人仅作参考）。</div>
        </el-form-item>
        <el-form-item label="危大工程现场巡视" required>
          <el-radio-group v-model="inspectionForm.isMajorHazardPatrol">
            <el-radio value="是">是</el-radio>
            <el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="inspectionForm.isMajorHazardPatrol === '是'">
          <el-form-item label="本次巡视项目" required>
            <el-select
              v-if="patrolProjectOptions.length > 1"
              v-model="inspectionForm.majorHazardProjectId"
              placeholder="请选择本次实际巡视项目"
              style="width: 100%"
              aria-label="请选择本次实际巡视项目"
            >
              <el-option
                v-for="project in patrolProjectOptions"
                :key="project.id"
                :label="project.label"
                :value="project.id"
              />
            </el-select>
            <span v-else class="static-value">{{ selectedPatrolProject?.label || '—' }}</span>
          </el-form-item>
          <el-form-item label="危大工程名称" required>
            <el-select
              v-model="inspectionForm.majorHazardLedgerId"
              filterable
              placeholder="请选择危大工程"
              style="width: 100%"
              :disabled="!inspectionForm.majorHazardProjectId"
              aria-label="请选择危大工程"
            >
              <el-option
                v-for="item in majorHazardLedgerOptions"
                :key="item.id"
                :label="item.label"
                :value="item.id"
              />
            </el-select>
            <div class="field-tip">
              仅展示「{{ selectedPatrolProject?.label || '本次巡视项目' }}」下的危大工程；提交后自动同步至该工程当前在施施工部位的现场巡视台账。
            </div>
          </el-form-item>
        </template>
        <el-form-item label="巡检结果" required>
          <el-radio-group v-model="inspectionForm.inspectionResult">
            <el-radio value="normal">全部正常</el-radio>
            <el-radio value="hazard">有隐患</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="inspectionForm.inspectionResult" :label="inspectionForm.inspectionResult === 'hazard' ? '巡检照片（选填）' : '巡检照片'" :required="inspectionForm.inspectionResult === 'normal'">
          <DispatchImageAttachments
            v-model="inspectionForm.attachments"
            :min="inspectionForm.inspectionResult === 'normal' ? 1 : 0"
            :max="9"
            name-prefix="巡检照片"
            upload-text="上传巡检照片"
          />
        </el-form-item>
        <template v-if="inspectionForm.inspectionResult === 'hazard'">
          <el-form-item label="隐患清单" required>
            <div class="hazard-editor">
              <div
                v-for="(hazard, index) in inspectionForm.hazardItems"
                :key="index"
                class="hazard-item"
              >
                <div class="hazard-item-head">
                  <strong>隐患 {{ index + 1 }}</strong>
                  <el-button
                    v-if="inspectionForm.hazardItems.length > 1"
                    link
                    type="danger"
                    @click="removeInspectionHazard(index)"
                  >删除</el-button>
                </div>
                <div class="hazard-row">
                  <span class="hazard-label">隐患类别<i>*</i></span>
                  <el-select
                    v-model="hazard.hazardCategory"
                    filterable
                    placeholder="请选择隐患类别"
                    no-data-text="请先由指挥部配置此分类的隐患类别"
                    style="width: 100%"
                    :aria-label="`隐患${index + 1}类别`"
                  >
                    <el-option
                      v-for="option in hazardCategoryOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
                <div class="hazard-row">
                  <span class="hazard-label">隐患等级<i>*</i></span>
                  <el-select v-model="hazard.hazardLevel" placeholder="请选择隐患等级" style="width: 100%" :aria-label="`隐患${index + 1}等级`">
                    <el-option v-for="level in hazardLevelOptions" :key="level" :label="level" :value="level" />
                  </el-select>
                </div>
                <div class="hazard-row">
                  <span class="hazard-label">隐患说明<i>*</i></span>
                  <el-input
                    v-model="hazard.desc"
                    type="textarea"
                    :rows="2"
                    placeholder="请描述隐患情况"
                    :aria-label="`隐患${index + 1}说明`"
                  />
                </div>
                <div class="hazard-row">
                  <span class="hazard-label">隐患照片<i>*</i></span>
                  <DispatchImageAttachments
                    v-model="hazard.photos"
                    :min="1"
                    :max="9"
                    :name-prefix="`隐患${index + 1}照片`"
                    upload-text="上传隐患照片"
                  />
                </div>
                <div class="hazard-row">
                  <span class="hazard-label">整改要求<i>*</i></span>
                  <el-input v-model="hazard.rectifyRequirement" type="textarea" :rows="3" placeholder="请输入整改要求" :aria-label="`隐患${index + 1}整改要求`" />
                </div>
                <div class="hazard-rectify">
                  <div class="rectify-tip">发现隐患后系统将自动生成整改单，请完善整改信息</div>
                  <div class="hazard-row">
                    <span class="hazard-label">整改人<i>*</i></span>
                    <InspectionPersonMultiSelect v-model="hazard.rectifier" :options="inspectionPersonOptions" :aria-label="`隐患${index + 1}整改人`" />
                  </div>
                  <div class="hazard-row">
                    <span class="hazard-label">复查人<i>*</i></span>
                    <InspectionPersonMultiSelect v-model="hazard.reviewer" :options="inspectionPersonOptions" :aria-label="`隐患${index + 1}复核人`" />
                  </div>
                  <div v-for="field in INSPECTION_COPY_FIELDS" :key="field.key" class="hazard-row">
                    <span class="hazard-label">{{ field.label }}</span>
                    <InspectionPersonMultiSelect v-model="hazard[field.key]" :options="inspectionPersonOptions" placeholder="请选择（选填，可多选）" :aria-label="field.label" />
                  </div>
                  <div class="hazard-row">
                    <span class="hazard-label">整改截止日期<i>*</i></span>
                    <el-date-picker
                      v-model="hazard.rectifyDeadline"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="请选择整改截止日期"
                      style="width: 100%"
                      :aria-label="`隐患${index + 1}整改截止日期`"
                    />
                  </div>
                </div>
              </div>
              <el-button class="hazard-add" @click="addInspectionHazard">+ 新增隐患</el-button>
            </div>
          </el-form-item>
        </template>
      </template>
      <template v-else>
        <el-form-item
          :label="processDateLabel"
          required
        >
          <el-date-picker
            v-model="inspectionForm.processDate"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="`请选择${processDateLabel}`"
            style="width: 100%"
            :aria-label="`请选择${processDateLabel}`"
          />
        </el-form-item>
        <el-form-item v-if="todo.inspectionBizType === '整改'" label="整改照片" required>
          <DispatchImageAttachments v-model="inspectionForm.attachments" :min="1" :max="9" name-prefix="整改照片" />
        </el-form-item>
        <el-form-item v-if="todo.inspectionBizType !== '整改'" label="办理结果" required>
          <el-radio-group v-model="inspectionForm.decision">
            <el-radio value="pass">{{ inspectionActionMeta.pass }}</el-radio>
            <el-radio value="reject">{{ inspectionActionMeta.reject }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="inspectionActionMeta.remarkLabel" :required="remarkRequired">
          <el-input
            v-model="inspectionForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="remarkRequired ? `请填写${inspectionActionMeta.remarkLabel}` : `${inspectionActionMeta.remarkLabel}（选填）`"
            :aria-label="`请填写${inspectionActionMeta.remarkLabel}`"
          />
        </el-form-item>
      </template>
    </el-form>
    <div class="op-actions">
      <el-button @click="emit('back')">取消</el-button>
      <el-button type="primary" @click="onSubmit">
        {{
          todo.inspectionBizType === '巡检'
            ? '提交检查结果'
            : todo.inspectionBizType === '整改'
              ? '提交整改结果'
              : '提交'
        }}
      </el-button>
    </div>
  </section>

</template>

<style scoped>
.inspection-stage-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f7f0f4 0%, #fff 100%);
  border-left: 4px solid #8f0045;
}
.inspection-stage-banner > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.inspection-stage-label {
  font-size: 13px;
  color: #909399;
}
.inspection-stage-banner strong {
  color: #8f0045;
  font-size: 17px;
}
.inspection-op-form {
  max-width: 760px;
}
/* 详情字段标签不折行，避免「巡检任务单编号」等被拆成两行 */
.desc-panel :deep(.el-descriptions__label) {
  white-space: nowrap;
}
.field-tip {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
.static-value {
  color: #303133;
  font-size: 14px;
  line-height: 32px;
}
.inspection-detail-block {
  margin-top: 14px;
  padding: 16px 20px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
}
.inspection-section-title {
  margin-bottom: 14px;
  padding-left: 10px;
  border-left: 3px solid #8f0045;
  color: #212529;
  font-size: 14px;
  font-weight: 600;
}
.inspection-kv {
  display: flex;
  padding: 2px 0;
  color: #212529;
  font-size: 13px;
  line-height: 1.7;
}
.inspection-kv > span {
  min-width: 76px;
  flex-shrink: 0;
  margin-right: 12px;
  white-space: nowrap;
  color: #868e96;
}
.inspection-kv > b {
  font-weight: 400;
}
.inspection-pass-text {
  color: #34a853;
}
.inspection-tree-layout {
  display: flex;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.inspection-tree-side {
  width: 168px;
  flex-shrink: 0;
  padding: 8px 0;
  border-right: 1px solid #ebeef5;
  background: #fafafa;
}
.inspection-tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  background: transparent;
  color: #606266;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.inspection-tree-node span {
  flex: 1;
}
.inspection-tree-node b {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #ebeef5;
  color: #909399;
  font-size: 11px;
  font-weight: 400;
}
.inspection-tree-node.active {
  background: #fceef4;
  color: #8f0045;
  font-weight: 600;
}
.inspection-tree-node.active b {
  background: rgba(143, 0, 69, 0.12);
  color: #8f0045;
}
.inspection-tree-content {
  flex: 1;
  padding: 16px 20px;
}
.inspection-tree-heading {
  margin-bottom: 12px;
  padding-bottom: 9px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}
.inspection-tree-item {
  margin-bottom: 8px;
  padding: 11px 12px;
  border-radius: 6px;
  background: #fafafa;
  color: #303133;
  font-size: 13px;
}
.inspection-file-text {
  margin-left: 12px;
  color: #606266;
  font-size: 13px;
}
.inspection-hazard-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
  padding: 10px 12px;
  border-left: 3px solid #e53935;
  border-radius: 6px;
  background: #fff5f5;
  color: #606266;
  font-size: 13px;
}
.inspection-hazard-card strong {
  color: #e53935;
}
/* 隐患清单：支持多条，样式对齐移动端执行巡检 */
.hazard-editor {
  width: 100%;
}
.hazard-item {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.hazard-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.hazard-item-head strong {
  color: #e53935;
  font-size: 13px;
}
.hazard-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
}
.hazard-rectify {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #ebeef5;
}
.rectify-tip {
  margin-bottom: 2px;
  padding: 7px 9px;
  border-radius: 6px;
  background: #fff3e0;
  color: #b26a00;
  font-size: 12px;
  line-height: 1.5;
}
.hazard-label {
  flex: 0 0 96px;
  padding-top: 7px;
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
}
.hazard-label i {
  margin-left: 2px;
  color: #e53935;
  font-style: normal;
}
.hazard-row > *:last-child {
  flex: 1;
  min-width: 0;
}
.hazard-add {
  width: 100%;
  border-style: dashed;
}
</style>
