<script setup>
import { computed, reactive, ref, toRef, watch } from 'vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'
import { userOptions, getUserLabel } from '../../../composables/useInspectionPlan.js'
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
const { submitInspectionHandle } = usePersonalTodoSubmit({
  todo: todoRef,
  todoId: todoIdRef,
  goBack: () => emit('back'),
})

const inspectionForm = reactive({
  decision: 'pass',
  processDate: '',
  remark: '',
  inspector: '',
  companions: [],
  inspectionResult: '',
  attachments: [],
  hazardDescription: '',
  issueRectify: false,
  rectifier: '',
  reviewer: '',
  rectifyDeadline: '',
})

const inspectionActionMeta = computed(() => {
  const type = props.todo?.inspectionBizType || '巡检'
  const map = {
    巡检: { title: '巡检处理', remarkLabel: '巡检结果', pass: '完成巡检', reject: '退回任务' },
    整改: { title: '整改处理', remarkLabel: '整改说明', pass: '提交整改', reject: '退回' },
    复查: { title: '复查处理', remarkLabel: '复查意见', pass: '复查通过', reject: '复查不通过' },
    审批: { title: '项目经理审批', remarkLabel: '审批意见', pass: '审批通过', reject: '审批不通过' },
  }
  return map[type] || map.巡检
})

const personalCheckTree = computed(() => {
  const groups = new Map()
  for (const item of props.todo?.detail?.checkItems || []) {
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
    companions: [...(props.todo?.detail?.companions || [])],
    inspectionResult: props.todo?.detail?.inspectionResult || '',
    attachments: [],
    hazardDescription: '',
    issueRectify: false,
    rectifier: props.todo?.detail?.rectifier || '',
    reviewer: props.todo?.detail?.reviewer || '',
    rectifyDeadline: props.todo?.detail?.deadline?.slice?.(0, 10) || '',
  })
}

watch(() => props.todo, resetInspectionForm, { immediate: true })

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
      <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="计划名称">{{ todo.detail?.planName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="计划编号">{{ todo.detail?.planNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="任务来源">{{ todo.detail?.source || '—' }}</el-descriptions-item>
      <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
      <el-descriptions-item label="执行人">{{ todo.detail?.executor || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检分类">
        <el-tag size="small" effect="plain">{{ todo.detail?.inspectionCategory || '—' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="同行人">{{ todo.detail?.companions?.join('、') || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检类型">{{ todo.detail?.planType || '—' }}</el-descriptions-item>
      <el-descriptions-item :label="todo.detail?.status === '已完成' ? '巡检日期' : '截止日期'">
        {{
          todo.detail?.status === '已完成'
            ? todo.detail?.inspectionDate || '—'
            : todo.detail?.deadline || '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
      <el-descriptions-item v-if="todo.detail?.summary" label="任务说明" :span="2">
        {{ todo.detail.summary }}
      </el-descriptions-item>
    </el-descriptions>
    <el-descriptions v-else :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="整改单编号">{{ todo.detail?.rectifyNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检任务单编号">{{ todo.detail?.taskNo || '—' }}</el-descriptions-item>
      <el-descriptions-item label="项目名称">{{ todo.detail?.project || '—' }}</el-descriptions-item>
      <el-descriptions-item label="巡检分类">
        <el-tag size="small" effect="plain">{{ todo.detail?.inspectionCategory || '—' }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="整改人">{{ todo.detail?.rectifier || '—' }}</el-descriptions-item>
      <el-descriptions-item label="复查人">{{ todo.detail?.reviewer || '—' }}</el-descriptions-item>
      <el-descriptions-item label="截止日期">{{ todo.detail?.deadline || '—' }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ todo.detail?.status || '—' }}</el-descriptions-item>
      <el-descriptions-item v-if="todo.detail?.closeDate" label="关闭日期">
        {{ todo.detail.closeDate }}
      </el-descriptions-item>
    </el-descriptions>
    <div v-if="todo.inspectionBizType !== '巡检' && todo.detail?.hazard" class="inspection-detail-block">
      <div class="inspection-section-title">隐患信息</div>
      <div class="inspection-kv"><span>隐患说明</span><b>{{ todo.detail.hazard }}</b></div>
      <div v-if="todo.detail?.hazardPhotos?.length" class="inspection-kv">
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
      <div v-if="todo.detail?.reviewDate" class="inspection-kv">
        <span>复查日期</span><b>{{ todo.detail.reviewDate }}</b>
      </div>
      <div v-if="todo.detail?.reviewResult" class="inspection-kv">
        <span>复查结果</span><b class="inspection-pass-text">{{ todo.detail.reviewResult }}</b>
      </div>
      <div v-if="todo.detail?.reviewComment" class="inspection-kv">
        <span>复查意见</span><b>{{ todo.detail.reviewComment }}</b>
      </div>
    </div>
    <div v-if="todo.detail?.manager" class="inspection-detail-block">
      <div class="inspection-section-title">项目经理审批</div>
      <div class="inspection-kv"><span>审批人</span><b>{{ todo.detail.manager }}</b></div>
      <div class="inspection-kv">
        <span>审批状态</span>
        <b>{{
          todo.detail?.approvalResult || (todo.detail.status === '已关闭' ? '通过' : '审批中')
        }}</b>
      </div>
      <div v-if="todo.detail?.approvalDate" class="inspection-kv">
        <span>审批日期</span><b>{{ todo.detail.approvalDate }}</b>
      </div>
      <div v-if="todo.detail?.approvalComment" class="inspection-kv">
        <span>审批意见</span><b>{{ todo.detail.approvalComment }}</b>
      </div>
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
      <span v-if="todo.detail?.normalPhotos?.length" class="inspection-file-text">
        巡检照片：{{ todo.detail.normalPhotos.join('、') }}
      </span>
      <div
        v-for="(hazard, index) in todo.detail?.hazardItems || []"
        :key="index"
        class="inspection-hazard-card"
      >
        <strong>隐患 {{ index + 1 }}</strong>
        <span>说明：{{ hazard.desc }}</span>
        <span v-if="hazard.photos?.length">照片：{{ hazard.photos.join('、') }}</span>
        <span>下发整改单：{{ hazard.issueRectify ? '是' : '否' }}</span>
        <span v-if="hazard.issueRectify">
          整改人：{{ hazard.rectifier }}　复查人：{{ hazard.reviewer }}　截止：{{
            hazard.rectifyDeadline
          }}
        </span>
      </div>
    </div>
  </section>

  <section v-if="!isReadonly" class="block block--panel block--action">
    <div class="block-head">
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
        </el-form-item>
        <el-form-item label="巡检结果" required>
          <el-radio-group v-model="inspectionForm.inspectionResult">
            <el-radio value="normal">全部正常</el-radio>
            <el-radio value="hazard">有隐患</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="inspectionForm.inspectionResult === 'hazard' ? '隐患照片' : '巡检照片'">
          <DispatchImageAttachments v-model="inspectionForm.attachments" />
        </el-form-item>
        <template v-if="inspectionForm.inspectionResult === 'hazard'">
          <el-form-item label="隐患说明" required>
            <el-input
              v-model="inspectionForm.hazardDescription"
              type="textarea"
              :rows="3"
              placeholder="请描述隐患情况"
              aria-label="请描述隐患情况"
            />
          </el-form-item>
          <el-form-item label="下发整改单">
            <el-switch v-model="inspectionForm.issueRectify" />
          </el-form-item>
          <template v-if="inspectionForm.issueRectify">
            <el-form-item label="整改人" required>
              <el-select
                v-model="inspectionForm.rectifier"
                filterable
                placeholder="请选择整改人"
                style="width: 100%"
                aria-label="请选择整改人"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.id"
                  :label="getUserLabel(u.id)"
                  :value="getUserLabel(u.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="复查人" required>
              <el-select
                v-model="inspectionForm.reviewer"
                filterable
                placeholder="请选择复查人"
                style="width: 100%"
                aria-label="请选择复查人"
              >
                <el-option
                  v-for="u in userOptions"
                  :key="u.id"
                  :label="getUserLabel(u.id)"
                  :value="getUserLabel(u.id)"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="整改截止日期" required>
              <el-date-picker
                v-model="inspectionForm.rectifyDeadline"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择整改截止日期"
                style="width: 100%"
                aria-label="请选择整改截止日期"
              />
            </el-form-item>
          </template>
        </template>
      </template>
      <template v-else>
        <el-form-item
          :label="
            todo.inspectionBizType === '整改'
              ? '整改日期'
              : todo.inspectionBizType === '复查'
                ? '复查日期'
                : '审批日期'
          "
          required
        >
          <el-date-picker
            v-model="inspectionForm.processDate"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="`请选择${todo.inspectionBizType === '整改' ? '整改' : todo.inspectionBizType === '复查' ? '复查' : '审批'}日期`"
            style="width: 100%"
            :aria-label="`请选择${todo.inspectionBizType === '整改' ? '整改' : todo.inspectionBizType === '复查' ? '复查' : '审批'}日期`"
          />
        </el-form-item>
        <el-form-item v-if="todo.inspectionBizType === '整改'" label="整改照片" required>
          <DispatchImageAttachments v-model="inspectionForm.attachments" />
        </el-form-item>
        <el-form-item v-if="todo.inspectionBizType !== '整改'" :label="`${todo.inspectionBizType}结果`" required>
          <el-radio-group v-model="inspectionForm.decision">
            <el-radio value="pass">{{ inspectionActionMeta.pass }}</el-radio>
            <el-radio value="reject">{{ inspectionActionMeta.reject }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="inspectionActionMeta.remarkLabel" required>
          <el-input
            v-model="inspectionForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="`请填写${inspectionActionMeta.remarkLabel}`"
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
  width: 76px;
  flex-shrink: 0;
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
</style>
