<script setup>
/**
 * 验评目录树 — 整页树形表格（布局对齐实体工程分解）
 * 数据：完整验评 WBS（含检验批/专项），不含施工部位
 */
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import {
  buildQmInspectTableTree,
  collectQmInspectDefaultExpandKeys,
  ensureWbsScaffold,
  filterQmInspectTableTree,
  formTemplates,
  getNodeFormTemplateIds,
  removeWbsNode,
  SPECIAL_ACCEPT_TYPES,
  upsertWbsNode,
  WBS_EDITABLE_NODE_TYPES,
  WBS_SYSTEM_NODE_TYPES,
  WBS_TREE_NODE_TYPE_LABEL,
  WBS_TREE_NODE_TYPES,
  wbsNodes,
} from '../../mock/qm.js'
import {
  WBS_SPECIALTY_DEFAULTS,
  WBS_SPECIALTY_GROUPS,
  getEffectiveSpecialties,
  inheritSpecialtiesFromParent,
  isValidWbsSpecialties,
  normalizeSpecialties,
  wbsSpecialtyLabel,
} from '../../constants/wbsSpecialty.js'
import {
  ENTITY_BREAKDOWN_NODE_TYPES,
  WBS_ENTITY_TYPE_LABEL,
  allowedEntityChildTypes,
} from '../../constants/wbsEntityLabels.js'
import './qm-hq-stats.css'

/** 实体工程分解同口径节点（单位～分项 + 实体分类）；检验批/专项不走此表单 */
function isEntityFormType(node_type) {
  const t = Number(node_type)
  return t === 9 || ENTITY_BREAKDOWN_NODE_TYPES.includes(t)
}

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const fromHq = computed(() => route.query.from === 'hq')
const queryProjectId = computed(() => String(route.query.projectId || '').trim())

/** 指挥部下钻：不切顶栏项目，用 query.projectId 查看；项目级仍用顶栏 scope */
const viewProjectId = computed(() => {
  if (fromHq.value && queryProjectId.value) return queryProjectId.value
  if (!isHqSelected.value && scopeProjectId.value) return scopeProjectId.value
  return ''
})

const viewProjectLabel = computed(() => {
  if (!viewProjectId.value) return ''
  const found = COC_PROJECT_OPTIONS.find((p) => p.id === viewProjectId.value)
  return found?.label || viewProjectId.value
})

const canViewTree = computed(() => !!viewProjectId.value)
/** 仅项目级可维护；指挥部二级页只读查看 */
const canMaintain = computed(
  () => !fromHq.value && !isHqSelected.value && !!scopeProjectId.value,
)

function goBackToHQ() {
  router.push('/qm/inspect/dashboard')
}

const keyword = ref('')
const expandRowKeys = ref([])
const visible = ref(false)
/** 弹窗形态：entity=实体工程分解同口径；other=检验批/专项等原表单 */
const dialogKind = ref('entity')
const form = reactive({
  id: '',
  project_id: '',
  parent_id: '',
  node_type: 6,
  node_name: '',
  location_code: '',
  batch_type_id: '',
  form_template_ids: [],
  specialty: '结构',
  specialties: [...WBS_SPECIALTY_DEFAULTS],
  special_type: '',
  is_hidden_work: 0,
  is_critical: 0,
  batch_scheme_id: '',
  sort_no: 0,
})

const isEntityForm = computed(() => dialogKind.value === 'entity')

const rawTree = computed(() => {
  if (!canViewTree.value) return []
  ensureWbsScaffold(viewProjectId.value)
  return buildQmInspectTableTree(viewProjectId.value)
})

const tableData = computed(() => filterQmInspectTableTree(rawTree.value, keyword.value))

function typeOptionLabel(t) {
  return WBS_ENTITY_TYPE_LABEL[t] || WBS_TREE_NODE_TYPE_LABEL[t] || String(t)
}

/** 新增可选类型：按父节点约束（实体子类型与分解页一致；分项下仍可建检验批） */
const creatableTypeOptions = computed(() => {
  const parent = wbsNodes.find((n) => n.id === form.parent_id)
  if (!parent) {
    return WBS_EDITABLE_NODE_TYPES.filter((t) => t === 1 || t === 7).map((t) => ({
      value: t,
      label: typeOptionLabel(t),
    }))
  }
  if (parent.node_type === 10) return [{ value: 7, label: WBS_TREE_NODE_TYPE_LABEL[7] }]
  if (parent.node_type === 5) return [{ value: 6, label: WBS_TREE_NODE_TYPE_LABEL[6] }]
  if (parent.node_type === 8) return []
  const entityAllow = allowedEntityChildTypes(parent.node_type)
  if (entityAllow.length) {
    return entityAllow.map((t) => ({ value: t, label: typeOptionLabel(t) }))
  }
  return WBS_EDITABLE_NODE_TYPES.map((t) => ({ value: t, label: typeOptionLabel(t) }))
})

function isSystemNode(node) {
  return !!node && WBS_SYSTEM_NODE_TYPES.includes(node.node_type)
}

/** 可添加子节点：非检验批/专项/竣工根 */
function canAddChild(row) {
  return ![6, 7, 8].includes(Number(row.node_type))
}

/** 节点验收状态展示三态（对应审批单）：未开始 / 进行中 / 已完成 */
function toDisplayAcceptBucket(status) {
  const st = Number(status) === 4 || Number(status) === 5 ? 3 : Number(status)
  if (st === 2) return 'completed'
  if (st === 1 || st === 3) return 'inProgress'
  return 'pending'
}

const DISPLAY_ACCEPT_LABEL = {
  pending: '未开始',
  inProgress: '进行中',
  completed: '已完成',
}

function acceptStatusTagType(status) {
  const map = { pending: 'info', inProgress: 'warning', completed: 'success' }
  return map[toDisplayAcceptBucket(status)] || 'info'
}

function displayAcceptStatus(status) {
  return DISPLAY_ACCEPT_LABEL[toDisplayAcceptBucket(status)] || '—'
}

const parentOptions = computed(() =>
  wbsNodes.filter(
    (n) =>
      n.project_id === form.project_id &&
      WBS_TREE_NODE_TYPES.includes(n.node_type) &&
      n.node_type !== 6 &&
      n.node_type !== 7 &&
      n.id !== form.id,
  ),
)
const formOptions = computed(() => formTemplates.filter((t) => t.status === 1))

function defaultChildType(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  if (!parent) return 1
  if (parent.node_type === 9) return 1
  if (parent.node_type === 10) return 7
  if (parent.node_type === 1) return 3
  if (parent.node_type === 2) return 3
  if (parent.node_type === 3) return 5
  if (parent.node_type === 4) return 5
  if (parent.node_type === 5) return 6
  return 6
}

function collectAllKeys(rows, acc = []) {
  ;(rows || []).forEach((r) => {
    if (r.children?.length) {
      acc.push(r.id)
      collectAllKeys(r.children, acc)
    }
  })
  return acc
}

watch(
  () => [canViewTree.value, viewProjectId.value],
  () => {
    if (!canViewTree.value) {
      expandRowKeys.value = []
      return
    }
    ensureWbsScaffold(viewProjectId.value)
    expandRowKeys.value = collectQmInspectDefaultExpandKeys(
      buildQmInspectTableTree(viewProjectId.value),
    )
  },
  { immediate: true },
)

watch(keyword, (val) => {
  if (String(val || '').trim()) {
    expandRowKeys.value = collectAllKeys(tableData.value)
  } else {
    expandRowKeys.value = collectQmInspectDefaultExpandKeys(rawTree.value)
  }
})

function applyInheritedSpecialties(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  form.specialties = inheritSpecialtiesFromParent(parent)
}

function onEntityParentChange(pid) {
  if (form.id) return
  applyInheritedSpecialties(pid)
  form.node_type = null
}

function openCreate(parent_id = '') {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  const pid = parent_id || ''
  const parent = wbsNodes.find((n) => n.id === pid)
  if (parent && (parent.node_type === 6 || parent.node_type === 7 || parent.node_type === 8)) {
    if (parent.node_type === 8) {
      return ElMessage.warning('请在「实体工程验收」或「专项验收」下添加子节点')
    }
    return ElMessage.warning('该节点下不可再添加子节点')
  }
  form.id = ''
  form.project_id = viewProjectId.value || scopeProjectId.value
  form.parent_id = pid
  form.node_type = defaultChildType(pid)
  form.node_name = ''
  form.location_code = ''
  form.batch_type_id = form.node_type === 6 ? 'bt-rebar' : ''
  form.form_template_ids = form.node_type === 7 ? ['ft-special-fire'] : []
  form.special_type = form.node_type === 7 ? 'fire' : ''
  form.is_hidden_work = 0
  form.is_critical = 0
  form.batch_scheme_id = ''
  form.sort_no = 0
  if (isEntityFormType(form.node_type)) {
    dialogKind.value = 'entity'
    applyInheritedSpecialties(pid)
    form.specialty = ''
  } else {
    dialogKind.value = 'other'
    if (form.node_type === 6) {
      applyInheritedSpecialties(pid)
      form.specialty = ''
    } else {
      form.specialty = form.node_type === 7 ? '消防' : '结构'
      form.specialties = [...WBS_SPECIALTY_DEFAULTS]
    }
  }
  visible.value = true
}

function openEdit(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  const node = wbsNodes.find((n) => n.id === row.id) || row.raw
  if (!node) return ElMessage.error('节点不存在')
  if (isEntityFormType(node.node_type)) {
    dialogKind.value = 'entity'
    Object.assign(form, {
      id: node.id,
      project_id: node.project_id,
      parent_id: node.parent_id || '',
      node_type: node.node_type,
      node_name: node.node_type === 9 ? '实体工程' : node.node_name,
      location_code: node.location_code || '',
      batch_type_id: '',
      form_template_ids: [],
      specialty: '',
      specialties: [...getEffectiveSpecialties(node)],
      special_type: '',
      is_hidden_work: 0,
      is_critical: 0,
      batch_scheme_id: '',
      sort_no: node.sort_no || 0,
    })
    visible.value = true
    return
  }
  dialogKind.value = 'other'
  Object.assign(form, {
    id: node.id,
    project_id: node.project_id,
    parent_id: node.parent_id || '',
    node_type: node.node_type,
    node_name: node.node_name,
    location_code: node.location_code || '',
    batch_type_id: node.batch_type_id || '',
    form_template_ids: getNodeFormTemplateIds(node),
    specialty: Number(node.node_type) === 6 ? '' : node.specialty || '',
    specialties:
      Number(node.node_type) === 6
        ? [...getEffectiveSpecialties(node)]
        : [...WBS_SPECIALTY_DEFAULTS],
    special_type: node.special_type || '',
    is_hidden_work: node.is_hidden_work,
    is_critical: node.is_critical,
    batch_scheme_id: node.batch_scheme_id || '',
    sort_no: node.sort_no || 0,
  })
  visible.value = true
}

function submit() {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护目录树')
  const project_id = viewProjectId.value || scopeProjectId.value

  if (isEntityForm.value) {
    const specialties = normalizeSpecialties(form.specialties)
    if (specialties.length && !isValidWbsSpecialties(specialties)) {
      return ElMessage.warning('请选择有效的专业')
    }
    if (Number(form.node_type) === 9) {
      const exist = wbsNodes.find((n) => n.id === form.id)
      const r = upsertWbsNode(
        {
          node_name: exist?.node_name || '实体工程验收',
          project_id,
          node_type: 9,
          location_code: form.location_code,
          specialties,
          sort_no: form.sort_no,
        },
        form.id,
      )
      if (!r.ok) return ElMessage.error(r.msg)
      ElMessage.success('节点已更新')
      visible.value = false
      return
    }
    if (form.node_type == null || form.node_type === '') {
      return ElMessage.warning('请选择节点类型')
    }
    if (!String(form.node_name || '').trim()) {
      return ElMessage.warning('请填写节点名称')
    }
    const r = upsertWbsNode(
      {
        project_id,
        parent_id: form.parent_id,
        node_type: form.node_type,
        node_name: form.node_name.trim(),
        location_code: form.location_code,
        specialties,
        sort_no: form.sort_no,
        batch_type_id: '',
        is_hidden_work: 0,
        is_critical: 0,
      },
      form.id,
    )
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(form.id ? '节点已更新' : '节点已创建')
    visible.value = false
    return
  }

  // 检验批：专业/编码/排序值与实体工程分解同口径；界面不维护检验批类型/表单模板
  if (Number(form.node_type) === 6) {
    const specialties = normalizeSpecialties(form.specialties)
    if (specialties.length && !isValidWbsSpecialties(specialties)) {
      return ElMessage.warning('请选择有效的专业')
    }
    if (!String(form.node_name || '').trim()) {
      return ElMessage.warning('请填写节点名称')
    }
    const r = upsertWbsNode(
      {
        project_id,
        parent_id: form.parent_id,
        node_type: 6,
        node_name: form.node_name.trim(),
        location_code: form.location_code,
        batch_type_id: form.batch_type_id || 'bt-rebar',
        specialties,
        sort_no: form.sort_no,
        is_hidden_work: 0,
        is_critical: 0,
      },
      form.id,
    )
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(form.id ? '节点已更新' : '节点已创建')
    visible.value = false
    return
  }

  const r = upsertWbsNode({ ...form, project_id }, form.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(form.id ? '节点已更新' : '节点已创建')
  visible.value = false
}

async function onRemove(row) {
  try {
    await ElMessageBox.confirm(`确认删除「${row.node_name}」？`, '删除节点', { type: 'warning' })
    const r = removeWbsNode(row.id)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ fromHq ? '质量看板 / 质量验评看板' : '质量验评' }} / 验评目录树
      </div>
      <div class="hq-title-row">
        <el-button
          v-if="fromHq && canViewTree"
          link
          type="primary"
          :icon="ArrowLeft"
          @click="goBackToHQ"
        >
          返回
        </el-button>
        <h1 class="page-title">验评目录树</h1>
        <span v-if="fromHq && canViewTree" class="hq-title-project">{{ viewProjectLabel }}</span>
      </div>
      <p class="page-tip">
        树结构：项目竣工验收 → 实体工程验收(分类，不做验收) / 专项验收。当前查看：{{
          viewProjectLabel || (isHqSelected ? '请从看板选择项目查看' : scopeProjectLabel)
        }}
        <template v-if="fromHq">（指挥部只读）</template>
      </p>
    </div>

    <el-alert
      v-if="!canViewTree"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目，或从指挥部质量验评看板进入项目目录树"
      class="mb"
    />

    <template v-else>
      <div class="toolbar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="筛选节点名称 / 编码 / 路径"
          style="width: 280px"
          aria-label="筛选节点"
        />
        <span v-if="fromHq" class="toolbar-hint">指挥部层级仅可查看，不可维护</span>
      </div>

      <el-table
        :data="tableData"
        row-key="id"
        border
        stripe
        class="tree-table"
        :tree-props="{ children: 'children' }"
        v-model:expand-row-keys="expandRowKeys"
        empty-text="暂无验评目录节点"
      >
        <el-table-column prop="node_name" label="节点名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="节点类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" type="info">
              {{ row.type_label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.code || '—' }}</template>
        </el-table-column>
        <el-table-column label="专业" min-width="180">
          <template #default="{ row }">
            <div v-if="row.specialties?.length" class="specialty-tags">
              <el-tag
                v-for="sp in row.specialties"
                :key="sp"
                size="small"
                effect="plain"
                class="specialty-tag"
              >
                {{ wbsSpecialtyLabel(sp) }}
              </el-tag>
            </div>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column prop="full_path" label="完整路径" min-width="240" show-overflow-tooltip />
        <el-table-column prop="sort_no" label="排序值" width="80" align="center" />
        <el-table-column label="验收状态" width="110">
          <template #default="{ row }">
            <el-tag :type="acceptStatusTagType(row.accept_status)" size="small">
              {{ displayAcceptStatus(row.accept_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="canMaintain" label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="canAddChild(row)"
              link
              type="primary"
              @click="openCreate(row.id)"
            >
              添加子节点
            </el-button>
            <el-button
              v-if="!isSystemNode(row)"
              link
              type="danger"
              @click="onRemove(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <el-dialog v-model="visible" :title="form.id ? '编辑节点' : '新增节点'" width="560px" destroy-on-close>
      <!-- 实体工程（单位～分项 / 实体分类）：字段对齐实体工程分解 -->
      <el-form v-if="isEntityForm" label-width="110px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item v-if="!(form.id && form.node_type === 9)" label="父节点">
          <el-select
            v-model="form.parent_id"
            filterable
            style="width: 100%"
            placeholder="请选择父节点"
            @change="onEntityParentChange"
          >
            <el-option
              v-for="n in parentOptions"
              :key="n.id"
              :label="`[${typeOptionLabel(n.node_type)}] ${n.node_type === 9 ? '实体工程' : n.node_name}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!(form.id && form.node_type === 9)" label="节点类型" required>
          <el-select
            v-model="form.node_type"
            style="width: 100%"
            placeholder="请选择节点类型"
            :disabled="!!form.id"
          >
            <el-option
              v-for="opt in form.id
                ? ENTITY_BREAKDOWN_NODE_TYPES.map((t) => ({ value: t, label: typeOptionLabel(t) }))
                : creatableTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input
            v-model="form.node_name"
            maxlength="80"
            :disabled="form.node_type === 9"
          />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="form.location_code" maxlength="40" />
        </el-form-item>
        <el-form-item label="专业">
          <el-select
            v-model="form.specialties"
            multiple
            filterable
            clearable
            placeholder="请选择专业（可多选）"
            style="width: 100%"
          >
            <el-option-group
              v-for="grp in WBS_SPECIALTY_GROUPS"
              :key="grp.label"
              :label="grp.label"
            >
              <el-option
                v-for="opt in grp.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-option-group>
          </el-select>
          <div v-if="!form.id" class="field-hint">默认继承上级节点专业，可删减或增补</div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sort_no" :min="0" :max="9999" />
        </el-form-item>
      </el-form>

      <!-- 检验批 / 专项等：保持原弹窗字段不动 -->
      <el-form v-else label-width="120px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item label="父节点">
          <el-select v-model="form.parent_id" clearable filterable style="width: 100%">
            <el-option
              v-for="n in parentOptions"
              :key="n.id"
              :label="`[${WBS_TREE_NODE_TYPE_LABEL[n.node_type]}] ${n.node_name}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点类型" required>
          <el-select
            v-model="form.node_type"
            style="width: 100%"
            :disabled="!!form.id && isSystemNode({ node_type: form.node_type })"
          >
            <el-option
              v-for="opt in form.id
                ? Object.entries(WBS_TREE_NODE_TYPE_LABEL).map(([val, label]) => ({
                    value: Number(val),
                    label,
                  }))
                : creatableTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input v-model="form.node_name" />
        </el-form-item>
        <el-form-item :label="form.node_type === 6 ? '编码' : '部位编码'">
          <el-input
            v-model="form.location_code"
            :maxlength="form.node_type === 6 ? 40 : undefined"
            :placeholder="form.node_type === 6 ? '' : '可选'"
            :aria-label="form.node_type === 6 ? '编码' : '可选'"
          />
        </el-form-item>
        <el-form-item v-if="form.node_type === 7" label="专项类型" required>
          <el-select v-model="form.special_type" style="width: 100%">
            <el-option
              v-for="t in SPECIAL_ACCEPT_TYPES"
              :key="t.code"
              :label="t.label"
              :value="t.code"
            />
          </el-select>
        </el-form-item>
        <template v-if="form.node_type === 6">
          <el-form-item label="专业">
            <el-select
              v-model="form.specialties"
              multiple
              filterable
              clearable
              placeholder="请选择专业（可多选）"
              style="width: 100%"
            >
              <el-option-group
                v-for="grp in WBS_SPECIALTY_GROUPS"
                :key="grp.label"
                :label="grp.label"
              >
                <el-option
                  v-for="opt in grp.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-option-group>
            </el-select>
            <div v-if="!form.id" class="field-hint">默认继承上级节点专业，可删减或增补</div>
          </el-form-item>
          <el-form-item label="排序值">
            <el-input-number v-model="form.sort_no" :min="0" :max="9999" />
          </el-form-item>
        </template>
        <el-form-item v-else label="专业"><el-input v-model="form.specialty" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.mb { margin-bottom: 8px; }
.toolbar { display: flex; align-items: center; gap: 12px; }
.toolbar-hint { font-size: 12px; color: #909399; }
.tree-table { flex: 1; }
.field-hint { margin-top: 4px; font-size: 12px; color: #909399; line-height: 1.4; }
.specialty-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.specialty-tag { margin: 0; }
</style>
