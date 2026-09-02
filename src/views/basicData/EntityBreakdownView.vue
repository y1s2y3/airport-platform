<script setup>
/**
 * 实体工程分解 — 合并原「施工部位管理」
 * 树形列表：单位工程→分项→施工部位；与验评实体分支同源 wbsNodes
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ensureWbsScaffold,
  getEntityRootNode,
  isWbsAlive,
  removeWbsNode,
  upsertWbsNode,
  WBS_SYSTEM_NODE_TYPES,
  wbsNodes,
} from '../../mock/qm.js'
import {
  buildEntityBreakdownTableTree,
  collectEntityBreakdownDefaultExpandKeys,
  filterEntityBreakdownTableTree,
  getLocationById,
  getLocationDepth,
  inheritLocationSpecialties,
  getLocationEffectiveSpecialties,
  listItemNodes,
  listLocations,
  MAX_LOCATION_DEPTH,
  removeLocation,
  upsertLocation,
} from '../../mock/constructionLocation.js'
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
  allowedEntityParentTypes,
  displayEntityBreakdownNodeName,
} from '../../constants/wbsEntityLabels.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const expandRowKeys = ref([])
const visible = ref(false)
/** 'wbs' | 'loc' */
const formMode = ref('wbs')

const wbsForm = reactive({
  id: '',
  project_id: '',
  parent_id: '',
  node_type: 1,
  node_name: '',
  location_code: '',
  specialties: [...WBS_SPECIALTY_DEFAULTS],
  sort_no: 0,
})

const locForm = reactive({
  id: '',
  project_id: '',
  wbs_node_id: '',
  parent_id: '',
  name: '',
  code: '',
  specialties: [...WBS_SPECIALTY_DEFAULTS],
  sort_no: 0,
  status: 1,
})

const canMaintain = computed(() => !isHqSelected.value && !!scopeProjectId.value)

const rawTree = computed(() => {
  if (!canMaintain.value) return []
  ensureWbsScaffold(scopeProjectId.value)
  return buildEntityBreakdownTableTree(scopeProjectId.value)
})

const tableData = computed(() => filterEntityBreakdownTableTree(rawTree.value, keyword.value))

function isWbsSelfOrDescendant(candidateId, nodeId) {
  if (!candidateId || !nodeId) return false
  if (candidateId === nodeId) return true
  const seen = new Set()
  let cur = wbsNodes.find((n) => isWbsAlive(n) && n.id === candidateId)
  while (cur?.parent_id) {
    if (cur.parent_id === nodeId) return true
    if (seen.has(cur.id)) break
    seen.add(cur.id)
    cur = wbsNodes.find((n) => isWbsAlive(n) && n.id === cur.parent_id)
  }
  return false
}

const creatableTypeOptions = computed(() => {
  const parent = wbsNodes.find((n) => isWbsAlive(n) && n.id === wbsForm.parent_id)
  return allowedEntityChildTypes(parent?.node_type).map((t) => ({
    value: t,
    label: WBS_ENTITY_TYPE_LABEL[t],
  }))
})

const parentOptions = computed(() => {
  const sameProject = wbsNodes.filter(
    (n) =>
      isWbsAlive(n) &&
      n.project_id === wbsForm.project_id &&
      (n.node_type === 9 || ENTITY_BREAKDOWN_NODE_TYPES.includes(n.node_type)),
  )
  if (wbsForm.id && wbsForm.node_type !== 9) {
    const allowedParents = allowedEntityParentTypes(wbsForm.node_type)
    return sameProject.filter(
      (n) => allowedParents.includes(n.node_type) && !isWbsSelfOrDescendant(n.id, wbsForm.id),
    )
  }
  return sameProject.filter((n) => allowedEntityChildTypes(n.node_type).length > 0)
})

const itemOptions = computed(() => listItemNodes(scopeProjectId.value))

function isLocDescendantOf(candidateId, ancestorId) {
  if (!candidateId || !ancestorId) return false
  let cur = getLocationById(candidateId)
  const guard = new Set()
  while (cur?.parent_id && !guard.has(cur.id)) {
    guard.add(cur.id)
    if (cur.parent_id === ancestorId) return true
    cur = getLocationById(cur.parent_id)
  }
  return false
}

/** 上级部位仅可选一、二级（三级部位不可再挂下级），编辑时排除自身及子孙 */
const parentLocOptions = computed(() => {
  if (!locForm.wbs_node_id) return []
  return listLocations(scopeProjectId.value, locForm.wbs_node_id).filter(
    (r) =>
      r.id !== locForm.id &&
      getLocationDepth(r.id) < MAX_LOCATION_DEPTH &&
      !isLocDescendantOf(r.id, locForm.id),
  )
})

function applyInheritedLocSpecialties() {
  locForm.specialties = inheritLocationSpecialties({
    wbs_node_id: locForm.wbs_node_id,
    parent_id: locForm.parent_id,
  })
}

function onLocWbsNodeChange() {
  if (locForm.id) return
  locForm.parent_id = ''
  applyInheritedLocSpecialties()
}

function onLocParentChange() {
  if (locForm.id) return
  applyInheritedLocSpecialties()
}

const dialogTitle = computed(() => {
  if (formMode.value === 'loc') return locForm.id ? '编辑施工部位' : '新增施工部位'
  return wbsForm.id ? '编辑节点' : '新增节点'
})

watch(
  () => [canMaintain.value, scopeProjectId.value],
  () => {
    if (!canMaintain.value) {
      expandRowKeys.value = []
      return
    }
    ensureWbsScaffold(scopeProjectId.value)
    expandRowKeys.value = collectEntityBreakdownDefaultExpandKeys(
      buildEntityBreakdownTableTree(scopeProjectId.value),
    )
  },
  { immediate: true },
)

watch(keyword, (val) => {
  if (String(val || '').trim()) {
    expandRowKeys.value = collectAllKeys(tableData.value)
  } else {
    expandRowKeys.value = collectEntityBreakdownDefaultExpandKeys(rawTree.value)
  }
})

function collectAllKeys(rows, acc = []) {
  ;(rows || []).forEach((r) => {
    if (r.children?.length) {
      acc.push(r.id)
      collectAllKeys(r.children, acc)
    }
  })
  return acc
}

function isSystemNode(row) {
  return row?.kind === 'wbs' && WBS_SYSTEM_NODE_TYPES.includes(row.node_type)
}

function canAddWbsChild(row) {
  if (row.kind !== 'wbs') return false
  return [1, 2, 3, 4, 9].includes(row.node_type)
}

function canAddLocation(row) {
  return row.kind === 'wbs' && row.node_type === 5
}

function canAddLocChild(row) {
  if (row.kind !== 'loc') return false
  return getLocationDepth(row.id) < MAX_LOCATION_DEPTH
}

function defaultChildType(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  if (!parent || parent.node_type === 9) return 1
  if (parent.node_type === 1) return 3
  if (parent.node_type === 2) return 3
  if (parent.node_type === 3) return 5
  if (parent.node_type === 4) return 5
  return 5
}

function applyInheritedSpecialties(parent_id) {
  const parent = wbsNodes.find((n) => n.id === parent_id)
  wbsForm.specialties = inheritSpecialtiesFromParent(parent)
}

function openCreateWbs(parentRow) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  const pid = parentRow?.id || getEntityRootNode(scopeProjectId.value)?.id || ''
  const parent = wbsNodes.find((n) => n.id === pid)
  if (parent?.node_type === 5) {
    return ElMessage.warning('分项下请新增施工部位')
  }
  if (parent && ![1, 2, 3, 4, 9].includes(parent.node_type)) {
    return ElMessage.warning('该节点下不可添加子节点')
  }
  formMode.value = 'wbs'
  wbsForm.id = ''
  wbsForm.project_id = scopeProjectId.value
  wbsForm.parent_id = pid
  wbsForm.node_type = defaultChildType(wbsForm.parent_id)
  wbsForm.node_name = ''
  wbsForm.location_code = ''
  applyInheritedSpecialties(wbsForm.parent_id)
  wbsForm.sort_no = 0
  visible.value = true
}

function openEditWbs(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  const node = wbsNodes.find((n) => n.id === row.id)
  if (!node) return ElMessage.error('节点不存在')
  formMode.value = 'wbs'
  if (node.node_type === 9) {
    Object.assign(wbsForm, {
      id: node.id,
      project_id: node.project_id,
      parent_id: node.parent_id || '',
      node_type: 9,
      node_name: '实体工程',
      location_code: node.location_code || '',
      specialties: [...getEffectiveSpecialties(node)],
      sort_no: node.sort_no || 0,
    })
    visible.value = true
    return
  }
  if (!ENTITY_BREAKDOWN_NODE_TYPES.includes(node.node_type)) {
    return ElMessage.warning('本页仅维护单位工程至分项及施工部位')
  }
  Object.assign(wbsForm, {
    id: node.id,
    project_id: node.project_id,
    parent_id: node.parent_id || '',
    node_type: node.node_type,
    node_name: node.node_name,
    location_code: node.location_code || '',
    specialties: [...getEffectiveSpecialties(node)],
    sort_no: node.sort_no || 0,
  })
  visible.value = true
}

function openCreateLocation(row) {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  formMode.value = 'loc'
  locForm.id = ''
  locForm.project_id = scopeProjectId.value
  if (row.kind === 'loc') {
    if (getLocationDepth(row.id) >= MAX_LOCATION_DEPTH) {
      return ElMessage.warning('同一分项下施工部位最多支持三级，无法继续新增下级')
    }
    locForm.wbs_node_id = row.wbs_node_id
    locForm.parent_id = row.id
  } else {
    locForm.wbs_node_id = row.id
    locForm.parent_id = ''
  }
  locForm.name = ''
  locForm.code = ''
  applyInheritedLocSpecialties()
  locForm.sort_no = 0
  locForm.status = 1
  visible.value = true
}

function openEditLocation(row) {
  const loc = getLocationById(row.id)
  if (!loc) return ElMessage.error('部位不存在')
  formMode.value = 'loc'
  Object.assign(locForm, {
    id: loc.id,
    project_id: loc.project_id,
    wbs_node_id: loc.wbs_node_id,
    parent_id: loc.parent_id || '',
    name: loc.name,
    code: loc.code || '',
    specialties: [...getLocationEffectiveSpecialties(loc)],
    sort_no: loc.sort_no || 0,
    status: loc.status === 0 ? 0 : 1,
  })
  visible.value = true
}

function openEdit(row) {
  if (row.kind === 'loc') openEditLocation(row)
  else openEditWbs(row)
}

function onWbsParentChange(pid) {
  if (wbsForm.id) return
  applyInheritedSpecialties(pid)
  wbsForm.node_type = null
}

function submit() {
  if (!canMaintain.value) return ElMessage.warning('请切换到具体项目后再维护')
  if (formMode.value === 'loc') return submitLocation()
  return submitWbs()
}

function submitWbs() {
  const specialties = normalizeSpecialties(wbsForm.specialties)
  if (specialties.length && !isValidWbsSpecialties(specialties)) {
    return ElMessage.warning('请选择有效的专业')
  }
  if (wbsForm.node_type === 9) {
    const exist = wbsNodes.find((n) => n.id === wbsForm.id)
    const r = upsertWbsNode(
      {
        node_name: exist?.node_name || '实体工程验收',
        project_id: scopeProjectId.value,
        node_type: 9,
        location_code: wbsForm.location_code,
        specialties,
      },
      wbsForm.id,
    )
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已更新')
    visible.value = false
    return
  }
  if (wbsForm.node_type == null || wbsForm.node_type === '') {
    return ElMessage.warning('请选择节点类型')
  }
  if (!ENTITY_BREAKDOWN_NODE_TYPES.includes(Number(wbsForm.node_type))) {
    return ElMessage.error('本页仅可维护单位工程～分项')
  }
  const parent = wbsNodes.find((n) => isWbsAlive(n) && n.id === wbsForm.parent_id)
  const allow = allowedEntityChildTypes(parent?.node_type)
  if (!allow.includes(Number(wbsForm.node_type))) {
    return ElMessage.warning('当前父节点下不可选择该节点类型，请重新选择')
  }
  if (!String(wbsForm.node_name || '').trim()) {
    return ElMessage.warning('请填写节点名称')
  }
  const r = upsertWbsNode(
    {
      ...wbsForm,
      specialties,
      project_id: scopeProjectId.value,
      batch_type_id: '',
      is_hidden_work: 0,
      is_critical: 0,
    },
    wbsForm.id,
  )
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(wbsForm.id ? '节点已更新' : '节点已创建')
  visible.value = false
}

function submitLocation() {
  if (!String(locForm.name || '').trim()) {
    return ElMessage.warning('请填写部位名称')
  }
  if (!locForm.wbs_node_id) {
    return ElMessage.warning('请选择归属分项')
  }
  const specialties = normalizeSpecialties(locForm.specialties)
  if (specialties.length && !isValidWbsSpecialties(specialties)) {
    return ElMessage.warning('请选择有效的专业')
  }
  const r = upsertLocation({ ...locForm, specialties }, locForm.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(locForm.id ? '部位已更新' : '部位已创建')
  visible.value = false
}

async function onRemove(row) {
  if (row.kind === 'loc') {
    try {
      await ElMessageBox.confirm(`确认删除「${row.node_name}」？`, '删除部位', { type: 'warning' })
      const r = removeLocation(row.id)
      if (!r.ok) return ElMessage.error(r.msg)
      ElMessage.success('已删除')
    } catch {
      /* cancel */
    }
    return
  }
  if (isSystemNode(row)) return
  try {
    await ElMessageBox.confirm(
      `确认删除「${displayEntityBreakdownNodeName({ node_type: row.node_type, node_name: row.node_name })}」？`,
      '删除节点',
      { type: 'warning' },
    )
    const r = removeWbsNode(row.id)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

function addChildLabel(row) {
  if (row.node_type === 9) return '添加单位工程'
  return '添加子节点'
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 实体工程分解</div>
      <h1 class="page-title">实体工程分解</h1>
      <p class="page-tip">
        维护单位工程至分项及分项下施工部位（与验评实体目录同源）。检验批请在验评目录树维护。当前项目：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="!canMaintain"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目，再维护本项目的实体工程分解"
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
      </div>

      <el-table
        :data="tableData"
        row-key="id"
        border
        stripe
        class="tree-table"
        :tree-props="{ children: 'children' }"
        v-model:expand-row-keys="expandRowKeys"
        empty-text="暂无实体工程节点"
      >
        <el-table-column prop="node_name" label="节点名称" min-width="220" show-overflow-tooltip />
        <el-table-column label="节点类型" width="120">
          <template #default="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :type="row.kind === 'loc' ? 'success' : row.node_type === 5 ? 'primary' : 'info'"
            >
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
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="canAddWbsChild(row)"
              link
              type="primary"
              @click="openCreateWbs(row)"
            >
              {{ addChildLabel(row) }}
            </el-button>
            <el-button
              v-if="canAddLocation(row)"
              link
              type="primary"
              @click="openCreateLocation(row)"
            >
              新增部位
            </el-button>
            <el-button
              v-if="canAddLocChild(row)"
              link
              type="primary"
              @click="openCreateLocation(row)"
            >
              新增子部位
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

    <el-dialog v-model="visible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form v-if="formMode === 'wbs'" label-width="110px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item v-if="!(wbsForm.id && wbsForm.node_type === 9)" label="父节点">
          <el-select
            v-model="wbsForm.parent_id"
            filterable
            style="width: 100%"
            placeholder="请选择父节点"
            @change="onWbsParentChange"
          >
            <el-option
              v-for="n in parentOptions"
              :key="n.id"
              :label="`[${WBS_ENTITY_TYPE_LABEL[n.node_type]}] ${n.node_type === 9 ? '实体工程' : n.node_name}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!(wbsForm.id && wbsForm.node_type === 9)" label="节点类型" required>
          <el-select
            v-model="wbsForm.node_type"
            style="width: 100%"
            placeholder="请选择节点类型"
            :disabled="!!wbsForm.id"
          >
            <el-option
              v-for="opt in creatableTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input
            v-model="wbsForm.node_name"
            maxlength="80"
            :disabled="wbsForm.node_type === 9"
          />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="wbsForm.location_code" maxlength="40" />
        </el-form-item>
        <el-form-item label="专业">
          <el-select
            v-model="wbsForm.specialties"
            multiple
            filterable
            clearable
            placeholder="请选择专业（可多选）"
            class="specialty-select"
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
          <div v-if="!wbsForm.id" class="field-hint">默认继承上级节点专业，可删减或增补</div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="wbsForm.sort_no" :min="0" :max="9999" />
        </el-form-item>
      </el-form>

      <el-form v-else label-width="110px">
        <el-form-item label="所属项目">
          <el-input :model-value="scopeProjectLabel" disabled />
        </el-form-item>
        <el-form-item label="归属分项" required>
          <el-select
            v-model="locForm.wbs_node_id"
            filterable
            style="width: 100%"
            :disabled="!!locForm.id"
            @change="onLocWbsNodeChange"
          >
            <el-option
              v-for="n in itemOptions"
              :key="n.id"
              :label="n.node_name"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="上级部位">
          <el-select
            v-model="locForm.parent_id"
            clearable
            filterable
            style="width: 100%"
            placeholder="空=挂在分项下"
            aria-label="上级部位"
            @change="onLocParentChange"
          >
            <el-option
              v-for="n in parentLocOptions"
              :key="n.id"
              :label="n.name"
              :value="n.id"
            />
          </el-select>
          <div class="field-hint">仅可选择一、二级部位，三级部位不支持再选择为上级</div>
        </el-form-item>
        <el-form-item label="部位名称" required>
          <el-input v-model="locForm.name" maxlength="80" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="locForm.code" maxlength="40" />
        </el-form-item>
        <el-form-item label="专业">
          <el-select
            v-model="locForm.specialties"
            multiple
            filterable
            clearable
            placeholder="请选择专业（可多选）"
            class="specialty-select"
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
          <div v-if="!locForm.id" class="field-hint">默认继承上级部位或所属分项专业，可删减或增补</div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="locForm.sort_no" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="locForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
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
.tree-table { flex: 1; }
.field-hint { margin-top: 4px; font-size: 12px; color: #909399; line-height: 1.4; }
.specialty-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.specialty-tag { margin: 0; }
.specialty-select :deep(.el-select__selection) {
  flex-wrap: wrap;
}
.specialty-select :deep(.el-select__selected-item) {
  max-width: 100%;
}
.muted-dash { color: #909399; }
</style>
