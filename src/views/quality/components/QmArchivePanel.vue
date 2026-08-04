<script setup>
/**
 * 验评任务 · 档案系统填报面板（填报向导第 2 步）
 * 按档案系统页面展示：WBS+工序表格列表 → 表格填写页；保存时完成档案登记。
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Fold, Expand, Folder } from '@element-plus/icons-vue'
import {
  archiveSign,
  ARCHIVE_FORM_STATUS,
  ARCHIVE_SIGN_STATUS,
  buildWbsTree,
  checkArchiveBlock,
  getArchiveChain,
  getArchiveInstance,
  getArchiveSync,
  nodeRequiredArchiveDocs,
  pullArchiveStatus,
  registerArchiveDoc,
  SYNC_SOURCE_LABEL,
  WBS_TREE_NODE_TYPE_LABEL,
  wbsNodes,
} from '../../../mock/qm.js'

const props = defineProps({
  task: { type: Object, required: true },
})

const emit = defineEmits(['changed'])

const tick = ref(0)
/** list = 档案列表页；fill = 表格填写页 */
const viewMode = ref('list')
const onlyMine = ref(false)
const projectKeyword = ref('')
const selectedNodeId = ref('')
const selectedLocationIdx = ref(0)
const formTab = ref('todo')
const fillFilter = ref('all')
const collapsedBottom = ref(false)
const selectedFormIds = ref([])
const showObsolete = ref(false)
const currentFormId = ref('')

const instance = computed(() => {
  void tick.value
  return getArchiveInstance(props.task.id)
})
const sync = computed(() => {
  void tick.value
  return getArchiveSync(props.task.id)
})
const requiredDocs = computed(() => nodeRequiredArchiveDocs(props.task))
const block = computed(() => {
  void tick.value
  return checkArchiveBlock(props.task)
})
const chain = computed(() => {
  void tick.value
  return getArchiveChain(props.task)
})
const chainRows = computed(() =>
  chain.value.map((role) => ({
    role,
    signed: instance.value?.signed_roles?.includes(role) || false,
  })),
)

const canFill = computed(() => Number(props.task?.status) === 0)

const treeData = computed(() => {
  if (!props.task?.project_id) return []
  return buildWbsTree(props.task.project_id)
})

const flatWbsRows = computed(() => {
  const rows = []
  const kw = projectKeyword.value.trim()
  const walk = (nodes, depth = 0) => {
    for (const n of nodes || []) {
      const name = n.label || n.raw?.node_name || ''
      const code = n.raw?.location_code || n.id
      const match = !kw || name.includes(kw) || String(code).includes(kw)
      if (match) {
        rows.push({
          id: n.id,
          name,
          typeLabel: n.type_label || WBS_TREE_NODE_TYPE_LABEL[n.node_type] || '',
          depth,
          node_type: n.node_type,
          location_code: n.raw?.location_code || '',
          raw: n.raw,
        })
      }
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(treeData.value)
  return onlyMine.value ? rows.filter((r) => r.node_type === 6 || r.id === props.task.wbs_node_id) : rows
})

const selectedNode = computed(() => flatWbsRows.value.find((r) => r.id === selectedNodeId.value) || null)

const locationRows = computed(() => {
  if (!selectedNode.value) return []
  const code = selectedNode.value.location_code || props.task.location_name || selectedNode.value.name
  const base = code || '—'
  // 演示：同一节点下挂若干工程部位
  return [
    { no: 1, location: base },
    { no: 2, location: `${base}-A` },
    { no: 3, location: `${base}-B` },
  ].filter((r, i) => i === 0 || selectedNode.value.node_type === 6)
})

const selectedLocation = computed(
  () => locationRows.value[selectedLocationIdx.value] || locationRows.value[0] || null,
)

const FORM_CATALOG = [
  {
    id: 'f-soil',
    group: '测试',
    name: 'GD-C5-711500 素土、灰土地基检验批质量验收记录表',
    remark: '',
    sgFilledNo: '',
    jlFilledNo: '',
    needSg: true,
    needJl: false,
    filled: false,
    obsolete: false,
  },
  {
    id: 'f-compact',
    group: '测试',
    name: 'GD-C5-711501 强夯地基检验批质量验收记录表',
    remark: '',
    sgFilledNo: '',
    jlFilledNo: '',
    needSg: true,
    needJl: true,
    filled: false,
    obsolete: false,
  },
  {
    id: 'f-rebar',
    group: '结构',
    name: 'GD-C5-712000 钢筋工程检验批质量验收记录表',
    remark: '省统表',
    sgFilledNo: 'REBAR-2026-003',
    jlFilledNo: 'REBAR-JL-003',
    needSg: true,
    needJl: true,
    filled: true,
    obsolete: false,
  },
  {
    id: 'f-concrete',
    group: '结构',
    name: 'GD-C5-713000 混凝土结构检验批质量验收记录表',
    remark: '',
    sgFilledNo: '',
    jlFilledNo: '',
    needSg: true,
    needJl: false,
    filled: false,
    obsolete: true,
  },
]

/** 表格填写状态（演示可变） */
const formFillState = reactive(
  Object.fromEntries(
    FORM_CATALOG.map((f) => [
      f.id,
      { filled: f.filled, sgFilledNo: f.sgFilledNo, jlFilledNo: f.jlFilledNo },
    ]),
  ),
)

const formRows = computed(() => {
  let list = FORM_CATALOG.map((f) => {
    const st = formFillState[f.id] || {}
    return {
      ...f,
      filled: !!st.filled,
      sgFilledNo: st.sgFilledNo || '',
      jlFilledNo: st.jlFilledNo || '',
    }
  })
  if (!showObsolete.value) list = list.filter((f) => !f.obsolete)
  if (formTab.value === 'todo') list = list.filter((f) => !f.filled || f.needSg || f.needJl)
  if (formTab.value === 'done') list = list.filter((f) => f.filled)
  if (fillFilter.value === 'sg') list = list.filter((f) => f.needSg)
  if (fillFilter.value === 'jl') list = list.filter((f) => f.needJl)
  return list
})

const currentForm = computed(() => FORM_CATALOG.find((f) => f.id === currentFormId.value) || FORM_CATALOG[0])

const inspectDate = ref(new Date().toISOString().slice(0, 10))
const formNo = ref('')
const docNos = reactive(['0', '0', '4'])
const foreman = ref('')
const projectLead = ref('')
const subLead = ref('')
const subUnit = ref('中国电建集团航空港建设有限公司')
const constructBasis = ref('《建筑地基基础工程施工规范》GB 51004')
const acceptBasis = ref('《建筑地基基础工程施工质量验收标准》GB 50202')
const capacity = ref('')
const overwriteCapacity = ref(false)
const sgConclusion = ref(
  '主控项目全部符合设计要求及规范规定，一般项目符合规范规定，本检验批质量验收合格。',
)
const jlConclusion = ref('验收合格，同意验收。')
const sgForeman = ref('')
const sgInspector = ref('')
const sgSignDate = ref('')
const jlEngineer = ref('')
const jlSignDate = ref('')
/** 折叠面板：默认收起「项目信息」 */
const projectInfoOpen = ref([])

const inspectItems = reactive([
  { cat: '主控项目', name: '地基承载力', req: '不小于设计要求', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '主控项目', name: '配合比', req: '设计值', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '主控项目', name: '压实系数', req: '不小于设计要求', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '一般项目', name: '石灰粒径', req: '≤5mm', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '一般项目', name: '土料有机质含量', req: '≤5%', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '一般项目', name: '土料粒径', req: '≤15mm', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '一般项目', name: '含水量', req: '最优含水量±2%', sampleMin: '', sampleActual: '', record: '', result: '' },
  { cat: '一般项目', name: '分层厚度', req: '±50mm', sampleMin: '', sampleActual: '', record: '', result: '' },
])

watch(
  flatWbsRows,
  (rows) => {
    if (!rows.length) {
      selectedNodeId.value = ''
      return
    }
    const prefer = props.task.wbs_node_id
    if (prefer && rows.some((r) => r.id === prefer)) {
      selectedNodeId.value = prefer
      return
    }
    if (!rows.some((r) => r.id === selectedNodeId.value)) {
      selectedNodeId.value = rows.find((r) => r.node_type === 6)?.id || rows[0].id
    }
  },
  { immediate: true },
)

watch(
  () => props.task.id,
  () => {
    viewMode.value = 'list'
    tick.value += 1
    const node = wbsNodes.find((n) => n.id === props.task.wbs_node_id)
    formNo.value =
      instance.value?.archive_doc_id ||
      `CSJCGKJ-GTC-${node?.location_code || props.task.wbs_node_id || '01.01.01.01.TFW02'}`
    capacity.value = props.task.location_name || selectedLocation.value?.location || ''
  },
  { immediate: true },
)

function selectNode(row) {
  selectedNodeId.value = row.id
  selectedLocationIdx.value = 0
}

function selectLocation(row) {
  selectedLocationIdx.value = Math.max(0, locationRows.value.findIndex((r) => r.no === row.no))
}

function onPushQm() {
  ElMessage.success('已推送质量验评（演示）')
}

function openFill() {
  if (!canFill.value) return ElMessage.warning('当前任务不可编辑档案填报')
  if (!selectedNode.value) return ElMessage.warning('请先选择 WBS 节点')
  if (!selectedFormIds.value.length && !formRows.value.length) {
    return ElMessage.warning('请先勾选需填写的表格')
  }
  currentFormId.value = selectedFormIds.value[0] || formRows.value[0]?.id || 'f-soil'
  capacity.value = selectedLocation.value?.location || props.task.location_name || ''
  viewMode.value = 'fill'
}

function closeFill() {
  viewMode.value = 'list'
}

function onToolbar(action) {
  ElMessage.info(`「${action}」为档案系统演示能力`)
}

function onSaveFill() {
  if (!canFill.value) return
  if (!instance.value) {
    const r = registerArchiveDoc(props.task)
    if (!r.ok) return ElMessage.error(r.msg)
  }
  const id = currentFormId.value || 'f-soil'
  if (!formFillState[id]) {
    formFillState[id] = { filled: false, sgFilledNo: '', jlFilledNo: '' }
  }
  formFillState[id].filled = true
  formFillState[id].sgFilledNo =
    formFillState[id].sgFilledNo || formNo.value || `SG-${Date.now().toString().slice(-6)}`
  tick.value += 1
  emit('changed')
  ElMessage.success('表格已保存，档案数据已登记')
  viewMode.value = 'list'
}

function onPull() {
  const r = pullArchiveStatus(props.task)
  if (!r.ok) return ElMessage.warning(r.msg)
  tick.value += 1
  emit('changed')
  ElMessage.success('已从档案系统同步最新状态')
}

function onArchiveSign(role) {
  const r = archiveSign(props.task, role)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  emit('changed')
  ElMessage.success(`档案侧「${role}」签章完成`)
}

function onSubmitAudit() {
  if (!foreman.value) return ElMessage.warning('请先选择专业工长')
  ElMessage.success('已提交审核（档案系统演示）')
}

function formStatusTagType(s) {
  return { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger', 4: 'warning', 5: 'success' }[s] || 'info'
}
</script>

<template>
  <div class="archive-panel">
    <div class="archive-head">
      <div>
        <div class="archive-title">档案系统</div>
        <div class="archive-tip">按档案系统页面填写表格；保存后完成本系统档案登记与状态同步</div>
      </div>
      <div class="archive-head-actions">
        <template v-if="instance">
          <el-tag size="small" :type="formStatusTagType(instance.form_status)">
            {{ ARCHIVE_FORM_STATUS[instance.form_status] }}
          </el-tag>
          <el-tag
            size="small"
            :type="instance.sign_status === 2 ? 'success' : instance.sign_status === 1 ? 'warning' : 'info'"
          >
            {{ ARCHIVE_SIGN_STATUS[instance.sign_status] }}
          </el-tag>
          <el-button size="small" @click="onPull">同步档案状态</el-button>
        </template>
        <el-tag v-else size="small" type="info" effect="plain">未登记</el-tag>
      </div>
    </div>

    <el-alert
      v-if="block.blocked"
      type="warning"
      :closable="false"
      show-icon
      class="mb"
      :title="`本节点需填报档案文件：${requiredDocs.join('、')}；未完成登记将拦截提交报验与审批通过`"
    />

    <!-- ========== 列表页（截图 1） ========== -->
    <div v-if="viewMode === 'list'" class="tp-shell">
      <div class="tp-toolbar">
        <el-checkbox v-model="onlyMine">显示我的WBS节点</el-checkbox>
        <el-input
          v-model="projectKeyword"
          clearable
          placeholder="工程名称"
          style="width: 200px"
          :prefix-icon="Search"
        />
      </div>

      <div class="tp-upper">
        <div class="tp-wbs">
          <el-table
            :data="flatWbsRows"
            border
            stripe
            height="260"
            highlight-current-row
            :row-class-name="({ row }) => (row.id === selectedNodeId ? 'is-current' : '')"
            @row-click="selectNode"
          >
            <el-table-column label="WBS代码" width="150" show-overflow-tooltip>
              <template #default="{ row }">{{ row.location_code || row.id }}</template>
            </el-table-column>
            <el-table-column label="工程名称" min-width="220">
              <template #default="{ row }">
                <span class="wbs-name" :style="{ paddingLeft: `${row.depth * 14}px` }">
                  <span v-if="row.node_type === 6" class="leaf-dot" />
                  {{ row.name }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="工程类型" width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.typeLabel }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div class="tp-location">
          <div class="loc-title">工程部位</div>
          <el-table
            :data="locationRows"
            border
            size="small"
            height="200"
            highlight-current-row
            :row-class-name="({ row }) => (row.no === selectedLocation?.no ? 'is-current' : '')"
            @row-click="selectLocation"
          >
            <el-table-column prop="no" label="编号" width="56" align="center" />
            <el-table-column prop="location" label="工程部位" min-width="140" show-overflow-tooltip />
          </el-table>
          <div class="loc-actions">
            <el-button size="small" type="primary">搜索</el-button>
            <el-button size="small" type="primary" @click="onPushQm">推送质量验评</el-button>
          </div>
        </div>
      </div>

      <div class="tp-bottom" :class="{ collapsed: collapsedBottom }">
        <div class="tp-tabs-bar">
          <el-radio-group v-model="formTab" size="small">
            <el-radio-button label="todo">工序需填写表格</el-radio-button>
            <el-radio-button label="done">已填写表格</el-radio-button>
          </el-radio-group>
          <div class="tp-filters">
            <el-radio-group v-model="fillFilter" size="small">
              <el-radio label="all">全部</el-radio>
              <el-radio label="sg">施工需填</el-radio>
              <el-radio label="jl">监理需填</el-radio>
            </el-radio-group>
            <el-checkbox v-model="showObsolete">显示作废规范表格</el-checkbox>
            <el-button size="small" :icon="collapsedBottom ? Expand : Fold" @click="collapsedBottom = !collapsedBottom">
              {{ collapsedBottom ? '展开' : '收缩' }}
            </el-button>
            <el-button size="small">所有表格</el-button>
            <el-button size="small" type="primary" :disabled="!canFill" @click="openFill">填写</el-button>
          </div>
        </div>

        <el-table
          v-show="!collapsedBottom"
          :data="formRows"
          border
          stripe
          height="240"
          @selection-change="(rows) => (selectedFormIds = rows.map((r) => r.id))"
        >
          <el-table-column type="selection" width="44" :selectable="() => canFill" />
          <el-table-column label="工序/表格名称" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="form-name-cell">
                <el-icon class="form-folder"><Folder /></el-icon>
                <span v-if="row.group" class="form-group">{{ row.group }} / </span>
                {{ row.name }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" width="100" show-overflow-tooltip />
          <el-table-column prop="sgFilledNo" label="施工已填写表格编号" min-width="150" show-overflow-tooltip />
          <el-table-column prop="jlFilledNo" label="监理已填写表格编号" min-width="150" show-overflow-tooltip />
          <el-table-column label="施工需填" width="88" align="center">
            <template #default="{ row }"><el-checkbox :model-value="row.needSg" disabled /></template>
          </el-table-column>
          <el-table-column label="监理需填" width="88" align="center">
            <template #default="{ row }"><el-checkbox :model-value="row.needJl" disabled /></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 已登记时保留签章进度（提交/审批依赖） -->
      <div v-if="instance" class="sign-box">
        <div class="sign-title">
          档案文档号 {{ instance.archive_doc_id }}
          <span class="snapshot-tip">
            最近同步：{{ instance.last_sync_at }}（{{ SYNC_SOURCE_LABEL[instance.last_sync_source] || instance.last_sync_source }}）
            · 审批链：{{ sync ? sync.chain_snapshot.join(' → ') : '—' }}
          </span>
        </div>
        <div class="sign-list">
          <div v-for="row in chainRows" :key="row.role" class="sign-item">
            <el-tag size="small" :type="row.signed ? 'success' : 'info'" effect="plain">
              {{ row.signed ? '已签章' : '未签章' }}
            </el-tag>
            <span class="sign-role">{{ row.role }}</span>
            <el-button
              v-if="!row.signed && canFill"
              link
              type="primary"
              size="small"
              @click="onArchiveSign(row.role)"
            >
              模拟档案侧签章
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 填写页（截图 2） ========== -->
    <div v-else class="fill-shell">
      <div class="fill-toolbar">
        <div class="fill-toolbar-left">
          <el-button size="small" @click="onToolbar('打印')">打印</el-button>
          <el-button size="small" @click="onToolbar('预览')">预览</el-button>
          <el-button size="small" @click="onToolbar('导出PDF')">导出PDF</el-button>
          <el-button size="small" @click="onToolbar('导出Excel')">导出Excel</el-button>
          <el-button size="small" @click="onToolbar('附件')">附件(0)</el-button>
          <el-button size="small" @click="onToolbar('从...复制')">从...复制</el-button>
          <el-button size="small" @click="onToolbar('统计')">统计</el-button>
          <el-button size="small" @click="onToolbar('填表说明')">填表说明</el-button>
          <el-button size="small" @click="onToolbar('我的范例')">我的范例</el-button>
          <el-button size="small" @click="onToolbar('选择外检资料附件')">选择外检资料附件(0)</el-button>
        </div>
        <div class="fill-toolbar-right">
          <el-button type="primary" size="small" :disabled="!canFill" @click="onSaveFill">保存</el-button>
          <el-button type="warning" size="small" @click="closeFill">关闭</el-button>
        </div>
      </div>

      <div class="form-dlg-body">
        <aside class="form-side">
          <el-collapse v-model="projectInfoOpen">
            <el-collapse-item title="项目信息" name="project">
              <el-descriptions :column="1" size="small" border>
                <el-descriptions-item label="任务">{{ task.task_name || task.task_no }}</el-descriptions-item>
                <el-descriptions-item label="部位">{{ task.location_name || '—' }}</el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>
          </el-collapse>

          <div class="side-block">
            <div class="side-title">检测对象</div>
            <el-form label-position="top" size="small">
              <el-form-item label="检验批部位">
                <el-input
                  type="textarea"
                  :rows="2"
                  :model-value="selectedLocation?.location || task.location_name || ''"
                />
              </el-form-item>
              <el-form-item label="检验日期">
                <el-date-picker
                  v-model="inspectDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                  :disabled="!canFill"
                />
              </el-form-item>
              <el-form-item label="表格编号">
                <el-input v-model="formNo" :disabled="!canFill" />
              </el-form-item>
              <el-form-item label="资料号">
                <div class="doc-nos">
                  <el-input v-for="(_, i) in docNos" :key="i" v-model="docNos[i]" :disabled="!canFill" />
                </div>
              </el-form-item>
            </el-form>
          </div>

          <div class="side-block">
            <div class="side-title">审核流程</div>
            <el-form label-position="top" size="small">
              <el-form-item label="专业工长">
                <el-select v-model="foreman" placeholder="请选择" style="width: 100%" :disabled="!canFill">
                  <el-option label="张工" value="zhang" />
                  <el-option label="李工" value="li" />
                  <el-option label="王工" value="wang" />
                </el-select>
              </el-form-item>
              <div class="side-btns">
                <el-button size="small" @click="onToolbar('审核人员')">审核人员</el-button>
                <el-button size="small" type="primary" :disabled="!canFill" @click="onSubmitAudit">提交审核</el-button>
              </div>
            </el-form>
          </div>
        </aside>

        <main class="form-main">
          <div class="form-title-bar">{{ currentForm.name }}</div>

          <el-form inline size="small" class="form-meta-row">
            <el-form-item label="项目负责人">
              <el-select v-model="projectLead" placeholder="请选择" style="width: 140px" :disabled="!canFill">
                <el-option label="尹永强" value="1" />
                <el-option label="赵强" value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="分包单位项目负责人">
              <el-select v-model="subLead" placeholder="请选择" style="width: 140px" :disabled="!canFill">
                <el-option label="阮政鹏" value="1" />
                <el-option label="刘涛" value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="分包单位">
              <el-input v-model="subUnit" style="width: 260px" :disabled="!canFill" />
            </el-form-item>
          </el-form>

          <div class="basis-grid">
            <el-form label-width="90px" size="small" class="basis-left">
              <el-form-item label="施工依据">
                <el-input v-model="constructBasis" :disabled="!canFill" />
              </el-form-item>
              <el-form-item label="验收依据">
                <el-input v-model="acceptBasis" :disabled="!canFill" />
              </el-form-item>
            </el-form>
            <div class="basis-right">
              <div class="capacity-label">
                <span>检验批容量</span>
                <el-checkbox v-model="overwriteCapacity" :disabled="!canFill">
                  填写检验批容量覆盖原有数据
                </el-checkbox>
              </div>
              <div class="capacity-row">
                <el-input
                  v-model="capacity"
                  type="textarea"
                  :rows="3"
                  :disabled="!canFill"
                />
                <el-button size="small" type="primary" :disabled="!canFill" @click="onToolbar('选择容量')">
                  选择
                </el-button>
              </div>
            </div>
          </div>

          <el-table
            :data="inspectItems"
            border
            size="small"
            class="inspect-table"
            header-cell-class-name="inspect-th"
          >
            <el-table-column label="验收项目" min-width="200">
              <template #default="{ row }">
                <div class="item-cell">
                  <span class="item-cat">{{ row.cat }}</span>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="req" label="设计要求及规范规定" min-width="160" />
            <el-table-column label="最小/实际抽样数量" width="168" align="center">
              <template #default="{ row }">
                <div class="sample-edit">
                  <el-input
                    v-model="row.sampleMin"
                    size="small"
                    placeholder=""
                    class="sample-input"
                    :disabled="!canFill"
                  />
                  <span class="sample-sep">/</span>
                  <el-input
                    v-model="row.sampleActual"
                    size="small"
                    placeholder=""
                    class="sample-input"
                    :disabled="!canFill"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="检查记录" min-width="140">
              <template #default="{ row }">
                <el-input v-model="row.record" size="small" :disabled="!canFill" />
              </template>
            </el-table-column>
            <el-table-column label="检查结果" width="120">
              <template #default="{ row }">
                <el-input v-model="row.result" size="small" :disabled="!canFill" />
              </template>
            </el-table-column>
          </el-table>

          <div class="conclusion-grid">
            <div class="conclusion-card">
              <div class="c-title">施工单位检查结果</div>
              <el-input v-model="sgConclusion" type="textarea" :rows="3" :disabled="!canFill" />
              <div class="c-signs">
                <el-form inline size="small">
                  <el-form-item label="专业工长">
                    <el-input v-model="sgForeman" style="width: 100px" :disabled="!canFill" />
                  </el-form-item>
                  <el-form-item label="项目专业质量检查员">
                    <el-input v-model="sgInspector" style="width: 100px" :disabled="!canFill" />
                  </el-form-item>
                  <el-form-item label="日期">
                    <el-date-picker
                      v-model="sgSignDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      style="width: 140px"
                      :disabled="!canFill"
                    />
                  </el-form-item>
                </el-form>
              </div>
            </div>
            <div class="conclusion-card">
              <div class="c-title">监理单位验收结论</div>
              <el-input v-model="jlConclusion" type="textarea" :rows="3" :disabled="!canFill" />
              <div class="c-signs">
                <el-form inline size="small">
                  <el-form-item label="专业监理工程师">
                    <el-input v-model="jlEngineer" style="width: 120px" :disabled="!canFill" />
                  </el-form-item>
                  <el-form-item label="日期">
                    <el-date-picker
                      v-model="jlSignDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      style="width: 140px"
                      :disabled="!canFill"
                    />
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.archive-panel {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  padding: 10px 12px 12px;
}
.archive-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.archive-title { font-size: 14px; font-weight: 600; color: #303133; }
.archive-tip { margin-top: 2px; font-size: 12px; color: #909399; }
.archive-head-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.mb { margin-bottom: 12px; }

.tp-shell {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f5f7fa;
  overflow: hidden;
}
.tp-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}
.tp-upper {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0;
  background: #fff;
}
.tp-wbs { border-right: 1px solid #ebeef5; }
.tp-location { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.loc-title { font-weight: 600; font-size: 13px; }
.loc-actions { display: flex; gap: 8px; justify-content: flex-end; }
.wbs-name { display: inline-flex; align-items: center; gap: 6px; }
.leaf-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #909399;
  flex-shrink: 0;
}
:deep(.is-current) { --el-table-tr-bg-color: #ecf5ff; }

.tp-bottom {
  margin-top: 0;
  background: #fff;
  border-top: 1px solid #ebeef5;
  padding: 8px 12px 12px;
}
.tp-tabs-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.tp-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.form-name-cell { display: inline-flex; align-items: center; gap: 4px; }
.form-folder { color: #e6a23c; }
.form-group { color: #909399; }

.sign-box {
  border-top: 1px solid #ebeef5;
  padding: 10px 12px;
  background: #fff;
}
.sign-title { font-size: 13px; font-weight: 600; color: #606266; margin-bottom: 6px; }
.sign-list { display: flex; flex-wrap: wrap; gap: 8px 16px; }
.sign-item { display: inline-flex; align-items: center; gap: 6px; }
.sign-role { font-size: 13px; color: #303133; }
.snapshot-tip { margin-left: 8px; font-size: 12px; font-weight: 400; color: #909399; }

/* 填写页 */
.fill-shell {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.fill-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  background: #e8f3ff;
  border-bottom: 1px solid #d9ecff;
}
.fill-toolbar-left,
.fill-toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.fill-toolbar-left :deep(.el-button) {
  --el-button-bg-color: #ecf5ff;
  --el-button-border-color: #b3d8ff;
  --el-button-text-color: #409eff;
}
.form-dlg-body {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 0;
  min-height: 560px;
}
.form-side {
  border-right: 1px solid #ebeef5;
  padding: 10px;
  background: #fafbfd;
}
.side-block {
  margin: 12px 0;
  padding: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.side-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.doc-nos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.side-btns { display: flex; gap: 8px; }
.form-main { min-width: 0; padding: 12px; }
.form-title-bar {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.form-meta-row { margin-bottom: 4px; }
.basis-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 12px;
  margin-bottom: 8px;
}
.capacity-label {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}
.capacity-row { display: flex; gap: 8px; align-items: flex-start; }
.capacity-row .el-textarea { flex: 1; }
.inspect-table { margin: 12px 0; }
:deep(.inspect-th) {
  background: #409eff !important;
  color: #fff !important;
}
.item-cell { display: flex; flex-direction: column; gap: 2px; }
.item-cat { font-size: 12px; color: #409eff; font-weight: 600; }
.sample-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: center;
}
.sample-input { width: 58px; }
.sample-input :deep(.el-input__wrapper) { padding-left: 6px; padding-right: 6px; }
.sample-input :deep(.el-input__inner) { text-align: center; }
.sample-sep { color: #909399; font-size: 13px; flex-shrink: 0; }
.conclusion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.conclusion-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px;
  background: #fafbfd;
}
.c-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.c-signs { margin-top: 8px; }

@media (max-width: 1100px) {
  .tp-upper { grid-template-columns: 1fr; }
  .form-dlg-body { grid-template-columns: 1fr; }
  .form-side { border-right: 0; }
  .basis-grid { grid-template-columns: 1fr; }
  .conclusion-grid { grid-template-columns: 1fr; }
}
</style>
