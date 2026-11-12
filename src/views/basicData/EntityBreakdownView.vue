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
import { normalizeWbsNodeCode, validateWbsNodeCode, wbsEntityCodeSpec } from '../../utils/wbsNodeCode.js'
import { downloadWbsImportTemplate } from '../../utils/wbsImportTemplate.js'
import { parseWbsImportFile } from '../../utils/wbsImportParser.js'
import { importWbsRows } from '../../mock/wbsImport.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const expandRowKeys = ref([])
const visible = ref(false)
/** 'wbs' | 'loc' */
const formMode = ref('wbs')

/** —— WBS 模板导入 —— */
const importVisible = ref(false)
const importParsing = ref(false)
const importSubmitting = ref(false)
const importFileName = ref('')
const importUploadKey = ref(0)
const importParsed = ref(null)
const importResult = ref(null)
const importErrorRows = computed(() => (importParsed.value?.errors || []).slice(0, 20))
const importDetailRows = computed(() => (importResult.value?.details || []).slice(0, 50))

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

/** 编码输入提示：单位工程～分项为纯数字定长；检验批英文+数字+符号≤20 位；其余类型英文数字≤10 位 */
const wbsCodeHint = computed(() => {
  if (Number(wbsForm.node_type) === 6) return '英文、数字或符号，最多20位'
  const spec = wbsEntityCodeSpec(wbsForm.node_type)
  if (!spec) return '英文或数字，最多10位'
  return `纯数字${spec.len}位，如 ${'0'.repeat(spec.len - 1)}1`
})

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
  return [1, 2, 3, 4, 5, 9].includes(row.node_type)
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
  if (parent.node_type === 5) return 6
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
  if (parent && ![1, 2, 3, 4, 5, 9].includes(parent.node_type)) {
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
    return ElMessage.warning('本页仅维护单位工程至检验批及施工部位')
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
  const codeCheck = validateWbsNodeCode(wbsForm.location_code, wbsForm.node_type)
  if (!codeCheck.ok) return ElMessage.warning(codeCheck.msg)
  wbsForm.location_code = codeCheck.code

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
    return ElMessage.error('本页仅可维护单位工程～检验批')
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
  const codeCheck = validateWbsNodeCode(locForm.code)
  if (!codeCheck.ok) return ElMessage.warning(codeCheck.msg)
  locForm.code = codeCheck.code
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

function onWbsCodeInput(val) {
  const next = normalizeWbsNodeCode(val, wbsForm.node_type)
  if (wbsForm.location_code !== next) wbsForm.location_code = next
}

function onLocCodeInput(val) {
  const next = normalizeWbsNodeCode(val)
  if (locForm.code !== next) locForm.code = next
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
  if (row.node_type === 5) return '添加检验批'
  return '添加子节点'
}

/** —— WBS 模板导入 —— */
function openWbsImport() {
  importVisible.value = true
  importFileName.value = ''
  importParsed.value = null
  importResult.value = null
  importUploadKey.value += 1
}

function onWbsTemplateDownload() {
  downloadWbsImportTemplate()
  ElMessage.success('已开始下载《WBS导入模板.xlsx》')
}

function onWbsImportFileReset() {
  importFileName.value = ''
  importParsed.value = null
  importResult.value = null
  importUploadKey.value += 1
}

async function onWbsImportFileChange(uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  if (!/\.xlsx?$/i.test(raw.name || '')) {
    ElMessage.error('仅支持 .xlsx 格式的 WBS 导入表')
    onWbsImportFileReset()
    return
  }
  importFileName.value = raw.name
  importParsed.value = null
  importResult.value = null
  importParsing.value = true
  try {
    const buffer = await raw.arrayBuffer()
    importParsed.value = parseWbsImportFile(buffer)
  } catch {
    ElMessage.error('文件读取失败，请重新选择')
  } finally {
    importParsing.value = false
  }
}

function runWbsImport() {
  const parsed = importParsed.value
  if (!parsed || parsed.fatal || !parsed.ok || !parsed.rows?.length) {
    ElMessage.warning('请先上传通过校验的 WBS 导入表')
    return
  }
  importSubmitting.value = true
  try {
    const result = importWbsRows(scopeProjectId.value, parsed.rows)
    importResult.value = result
    if (result.added > 0) {
      ElMessage.success(`导入完成：新增 ${result.added} 行，跳过 ${result.skipped} 行，失败 ${result.failed} 行`)
    } else if (result.failed > 0) {
      ElMessage.error(`导入完成：失败 ${result.failed} 行`)
    } else {
      ElMessage.info('导入完成：数据均已存在，未新增节点')
    }
    expandRowKeys.value = collectEntityBreakdownDefaultExpandKeys(
      buildEntityBreakdownTableTree(scopeProjectId.value),
    )
  } catch (err) {
    ElMessage.error(err?.message || '导入失败')
  } finally {
    importSubmitting.value = false
  }
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 实体工程分解</div>
      <h1 class="page-title">实体工程分解</h1>
      <p class="page-tip">
        维护单位工程至检验批，及分项下施工部位（与验评实体目录同源）；支持「WBS 模板导入」批量新增。当前项目：{{
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
        <el-button type="primary" plain @click="openWbsImport">WBS 模板导入</el-button>
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
              :type="row.kind === 'loc' ? 'success' : row.node_type === 5 ? 'primary' : row.node_type === 6 ? 'warning' : 'info'"
            >
              {{ row.type_label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.code || '--' }}</template>
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
            <span v-else>--</span>
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

    <el-dialog v-model="importVisible" title="WBS 模板导入" width="780px" destroy-on-close>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="导入为增量追加：只新增系统不存在的节点，已存在按完整路径跳过，不修改、不删除任何已有节点；导入只读取模板第 2 个工作表「WBS导入表」，新增的检验批可在「验评目录树」查看。"
      />
      <div class="import-actions">
        <el-button @click="onWbsTemplateDownload">下载模板</el-button>
        <el-upload
          :key="importUploadKey"
          :auto-upload="false"
          :show-file-list="false"
          :limit="1"
          accept=".xlsx,.xls"
          :on-change="onWbsImportFileChange"
        >
          <el-button type="primary" :loading="importParsing">上传 WBS 导入表</el-button>
        </el-upload>
        <span class="import-file">{{ importFileName || '未选择文件（仅支持 .xlsx）' }}</span>
        <el-button v-if="importFileName" link type="primary" @click="onWbsImportFileReset">
          重新选择
        </el-button>
      </div>

      <el-alert
        v-if="importParsed && importParsed.fatal"
        type="error"
        :closable="false"
        show-icon
        :title="importParsed.fatal"
      />

      <template v-else-if="importParsed">
        <el-descriptions :column="4" border size="small" class="import-stats">
          <el-descriptions-item label="数据行">{{ importParsed.stats.totalRows }}</el-descriptions-item>
          <el-descriptions-item label="校验通过">{{ importParsed.stats.validRows || 0 }}</el-descriptions-item>
          <el-descriptions-item label="错误数">{{ importParsed.stats.errorCount }}</el-descriptions-item>
          <el-descriptions-item label="校验结果">
            <el-tag :type="importParsed.ok ? 'success' : 'danger'" size="small" effect="plain">
              {{ importParsed.ok ? '通过' : '未通过' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <template v-if="importErrorRows.length">
          <p class="import-section-title">校验错误（最多显示前 20 条，整批不导入）</p>
          <el-table :data="importErrorRows" border size="small" max-height="220">
            <el-table-column prop="rowNo" label="行号" width="80" />
            <el-table-column prop="column" label="列" width="150" />
            <el-table-column prop="message" label="原因" min-width="260" show-overflow-tooltip />
          </el-table>
        </template>

        <el-alert
          v-if="importResult"
          :type="importResult.failed ? 'warning' : 'success'"
          :closable="false"
          show-icon
          class="mb"
          :title="`导入完成：新增 ${importResult.added} 行 / 已存在跳过 ${importResult.skipped} 行 / 失败 ${importResult.failed} 行`"
        />
        <template v-if="importDetailRows.length">
          <p class="import-section-title">导入明细（最多显示前 50 条）</p>
          <el-table :data="importDetailRows" border size="small" max-height="220">
            <el-table-column prop="rowNo" label="行号" width="70" />
            <el-table-column prop="label" label="数据行" min-width="220" show-overflow-tooltip />
            <el-table-column prop="action" label="结果" width="90">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  effect="plain"
                  :type="row.action === 'added' ? 'success' : row.action === 'failed' ? 'danger' : 'info'"
                >
                  {{ row.action === 'added' ? '新增' : row.action === 'failed' ? '失败' : '跳过' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="说明" min-width="180" show-overflow-tooltip />
          </el-table>
        </template>
      </template>

      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :disabled="!importParsed || !!importParsed.fatal || !importParsed.ok || !importParsed.rows?.length"
          :loading="importSubmitting"
          @click="runWbsImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>

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
        <el-form-item label="编码" required>
          <el-input
            v-model="wbsForm.location_code"
            maxlength="10"
            :placeholder="wbsCodeHint"
            @input="onWbsCodeInput"
          />
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
        <el-form-item label="编码" required>
          <el-input
            v-model="locForm.code"
            maxlength="10"
            placeholder="英文或数字，最多10位"
            @input="onLocCodeInput"
          />
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
.import-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.import-file { font-size: 12px; color: #909399; }
.import-stats { margin-bottom: 12px; }
.import-section-title { margin: 12px 0 6px; font-size: 13px; color: #606266; }
</style>
