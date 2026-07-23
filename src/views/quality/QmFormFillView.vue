<script setup>
/**
 * 表单填报 — 一级列表（WBS + 工序表格）
 * 点击「填写」跳转二级页，在侧栏菜单右侧主内容区打开。
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Fold, Expand, Star, StarFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  buildWbsTree,
  WBS_TREE_NODE_TYPE_LABEL,
} from '../../mock/qm.js'

/** 第三方地址（预留）；有值时优先 iframe 嵌入 */
const THIRD_PARTY_FORM_FILL_URL = ''

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const onlyMine = ref(false)
const projectKeyword = ref('')
const selectedNodeId = ref('')
const formTab = ref('todo')
const fillFilter = ref('all')
const collapsedBottom = ref(false)
const selectedFormIds = ref([])

/** 分部分项配置弹窗 */
const partConfigVisible = ref(false)
const starredPartIds = ref(new Set(['pc-1-1-1', 'pc-2']))

const PART_CONFIG_TREE = [
  {
    id: 'pc-1',
    wbsCode: 'TFW02',
    name: '昆明长水国际机场改扩建工程航站区及GTC配套工程一陆侧综合交通中心及配套工程（一标段）',
    children: [
      {
        id: 'pc-1-1',
        wbsCode: 'TFW02.01',
        name: '土石方与地基处理工程',
        children: [
          { id: 'pc-1-1-1', wbsCode: 'TFW02.01.01', name: '土石方工程' },
          { id: 'pc-1-1-2', wbsCode: 'TFW02.01.02', name: '地基处理工程' },
        ],
      },
      {
        id: 'pc-1-2',
        wbsCode: 'TFW02.02',
        name: '主体结构工程',
        children: [
          { id: 'pc-1-2-1', wbsCode: 'TFW02.02.01', name: '混凝土结构工程' },
          { id: 'pc-1-2-2', wbsCode: 'TFW02.02.02', name: '钢结构工程' },
        ],
      },
    ],
  },
  {
    id: 'pc-2',
    wbsCode: 'TFW02',
    name: '西飞行区土石方与地基处理工程W2',
    children: [
      {
        id: 'pc-2-1',
        wbsCode: 'TFW02.01',
        name: '土石方工程',
        children: [
          { id: 'pc-2-1-1', wbsCode: 'TFW02.01.01', name: '挖方工程' },
          { id: 'pc-2-1-2', wbsCode: 'TFW02.01.02', name: '填方工程' },
        ],
      },
      {
        id: 'pc-2-2',
        wbsCode: 'TFW02.02',
        name: '地基处理工程',
        children: [
          { id: 'pc-2-2-1', wbsCode: 'TFW02.02.01', name: '强夯地基' },
          { id: 'pc-2-2-2', wbsCode: 'TFW02.02.02', name: '素土、灰土地基' },
        ],
      },
    ],
  },
]

const treeData = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return buildWbsTree(scopeProjectId.value)
})

const flatWbsRows = computed(() => {
  const rows = []
  const walk = (nodes, depth = 0) => {
    for (const n of nodes || []) {
      const name = n.label || n.raw?.node_name || ''
      if (projectKeyword.value.trim() && !name.includes(projectKeyword.value.trim())) {
        if (n.children?.length) walk(n.children, depth + 1)
        continue
      }
      rows.push({
        id: n.id,
        name,
        typeLabel: n.type_label || WBS_TREE_NODE_TYPE_LABEL[n.node_type] || '',
        depth,
        node_type: n.node_type,
        location_code: n.raw?.location_code || '',
        raw: n.raw,
      })
      if (n.children?.length) walk(n.children, depth + 1)
    }
  }
  walk(treeData.value)
  return rows
})

const selectedNode = computed(() => flatWbsRows.value.find((r) => r.id === selectedNodeId.value) || null)

const locationRows = computed(() => {
  if (!selectedNode.value) return []
  const code = selectedNode.value.location_code || selectedNode.value.name
  return [{ no: 1, location: code || '—' }]
})

const FORM_CATALOG = [
  {
    id: 'f-soil',
    name: '素土、灰土地基检验批质量验收记录表',
    remark: '主控+一般项目',
    sgFilledNo: 'TSFTZ-QH-A-DM-4-2-001',
    jlFilledNo: '',
    needSg: true,
    needJl: false,
    measure: false,
    filled: true,
  },
  {
    id: 'f-compact',
    name: '强夯地基检验批质量验收记录表',
    remark: '',
    sgFilledNo: '',
    jlFilledNo: '',
    needSg: true,
    needJl: true,
    measure: false,
    filled: false,
  },
  {
    id: 'f-rebar',
    name: '钢筋工程检验批质量验收记录表',
    remark: '省统表',
    sgFilledNo: 'REBAR-2026-003',
    jlFilledNo: 'REBAR-JL-003',
    needSg: true,
    needJl: true,
    measure: true,
    filled: true,
  },
  {
    id: 'f-concrete',
    name: '混凝土结构检验批质量验收记录表',
    remark: '',
    sgFilledNo: '',
    jlFilledNo: '',
    needSg: true,
    needJl: false,
    measure: false,
    filled: false,
  },
]

const formRows = computed(() => {
  let list = FORM_CATALOG.map((f) => ({ ...f }))
  if (formTab.value === 'todo') list = list.filter((f) => !f.filled || f.needSg || f.needJl)
  if (formTab.value === 'done') list = list.filter((f) => f.filled)
  if (fillFilter.value === 'sg') list = list.filter((f) => f.needSg)
  if (fillFilter.value === 'jl') list = list.filter((f) => f.needJl)
  if (fillFilter.value === 'std') list = list.filter((f) => f.remark.includes('省统') || f.remark.includes('主控'))
  return list
})

watch(
  flatWbsRows,
  (rows) => {
    if (!rows.length) {
      selectedNodeId.value = ''
      return
    }
    if (!rows.some((r) => r.id === selectedNodeId.value)) {
      selectedNodeId.value = rows.find((r) => r.node_type === 6)?.id || rows[0].id
    }
  },
  { immediate: true },
)

function selectNode(row) {
  selectedNodeId.value = row.id
}

function onRefresh() {
  ElMessage.success('已刷新 WBS 节点')
}

function onLoadAll() {
  projectKeyword.value = ''
  ElMessage.success('已加载全部节点')
}

function openPartConfig() {
  partConfigVisible.value = true
}

function closePartConfig() {
  partConfigVisible.value = false
}

function isPartStarred(id) {
  return starredPartIds.value.has(id)
}

function togglePartStar(row) {
  const next = new Set(starredPartIds.value)
  if (next.has(row.id)) {
    next.delete(row.id)
    ElMessage.info(`已取消配置：${row.name}`)
  } else {
    next.add(row.id)
    ElMessage.success(`已配置：${row.wbsCode} ${row.name}`)
  }
  starredPartIds.value = next
}

/** 在菜单右侧主内容区打开填写二级页 */
function openFill() {
  if (!selectedNode.value) return ElMessage.warning('请先选择 WBS 节点')
  const formId = selectedFormIds.value[0] || formRows.value[0]?.id || 'f-soil'
  router.push({
    path: '/qm/inspect/form-fill/edit',
    query: {
      nodeId: selectedNode.value.id,
      formId,
    },
  })
}
</script>

<template>
  <div class="qm-page page-card form-fill-page">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 表单填报</div>
      <h1 class="page-title">表单填报</h1>
      <p class="page-tip">
        嵌入第三方表格填报系统 · 当前项目：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目后再进行表单填报"
    />

    <div v-else-if="THIRD_PARTY_FORM_FILL_URL" class="embed-frame-wrap">
      <iframe class="embed-frame" :src="THIRD_PARTY_FORM_FILL_URL" title="第三方表单填报" />
    </div>

    <div v-else class="tp-shell">
      <div class="tp-toolbar">
        <el-checkbox v-model="onlyMine">显示我的WBS节点</el-checkbox>
        <el-input
          v-model="projectKeyword"
          clearable
          placeholder="工程名称"
          style="width: 180px"
          :prefix-icon="Search"
        />
        <el-button size="small" @click="openPartConfig">分部分项配置</el-button>
        <el-button size="small" :icon="Refresh" @click="onRefresh">刷新</el-button>
        <el-button size="small" type="primary" @click="onLoadAll">加载全部节点</el-button>
      </div>

      <div class="tp-upper">
        <div class="tp-wbs">
          <el-table
            :data="flatWbsRows"
            border
            stripe
            height="280"
            highlight-current-row
            :row-class-name="({ row }) => (row.id === selectedNodeId ? 'is-current' : '')"
            @row-click="selectNode"
          >
            <el-table-column label="WBS代码" width="120">
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
            <el-table-column label="工程类型" width="110">
              <template #default="{ row }">{{ row.typeLabel }}</template>
            </el-table-column>
          </el-table>
        </div>
        <div class="tp-location">
          <div class="loc-title">工程部位</div>
          <el-table :data="locationRows" border size="small" height="220">
            <el-table-column prop="no" label="编号" width="60" align="center" />
            <el-table-column prop="location" label="工程部位" min-width="140" show-overflow-tooltip />
          </el-table>
          <div class="loc-actions">
            <el-button size="small">搜索</el-button>
            <el-button size="small" type="primary">推送质量统计</el-button>
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
              <el-radio label="std">显示标准规范表格</el-radio>
            </el-radio-group>
            <el-button size="small" :icon="collapsedBottom ? Expand : Fold" @click="collapsedBottom = !collapsedBottom">
              {{ collapsedBottom ? '展开' : '收缩' }}
            </el-button>
            <el-button size="small">所有表格</el-button>
            <el-button size="small" type="primary" @click="openFill">填写</el-button>
          </div>
        </div>

        <el-table
          v-show="!collapsedBottom"
          :data="formRows"
          border
          stripe
          height="260"
          @selection-change="(rows) => (selectedFormIds = rows.map((r) => r.id))"
        >
          <el-table-column type="selection" width="44" />
          <el-table-column prop="name" label="工序/表格名称" min-width="260" show-overflow-tooltip />
          <el-table-column prop="remark" label="备注" width="120" show-overflow-tooltip />
          <el-table-column prop="sgFilledNo" label="施工已填写表格编号" min-width="160" show-overflow-tooltip />
          <el-table-column prop="jlFilledNo" label="监理已填写表格编号" min-width="160" show-overflow-tooltip />
          <el-table-column label="施工需填" width="90" align="center">
            <template #default="{ row }"><el-checkbox :model-value="row.needSg" disabled /></template>
          </el-table-column>
          <el-table-column label="监理需填" width="90" align="center">
            <template #default="{ row }"><el-checkbox :model-value="row.needJl" disabled /></template>
          </el-table-column>
          <el-table-column label="施工计量" width="90" align="center">
            <template #default="{ row }"><el-checkbox :model-value="row.measure" disabled /></template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="partConfigVisible"
      title="分部分项配置"
      width="860px"
      top="8vh"
      destroy-on-close
      append-to-body
      class="part-config-dialog"
      @closed="closePartConfig"
    >
      <el-table
        :data="PART_CONFIG_TREE"
        row-key="id"
        border
        stripe
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        height="460"
        class="part-config-table"
      >
        <el-table-column prop="wbsCode" label="WBS代码" width="160" show-overflow-tooltip />
        <el-table-column label="工程名称" min-width="420">
          <template #default="{ row }">
            <div class="part-name-cell">
              <span class="part-name-text" :title="row.name">{{ row.name }}</span>
              <button
                type="button"
                class="star-btn"
                :class="{ active: isPartStarred(row.id) }"
                :title="isPartStarred(row.id) ? '取消配置' : '设为已配置'"
                @click.stop="togglePartStar(row)"
              >
                <el-icon :size="18">
                  <StarFilled v-if="isPartStarred(row.id)" />
                  <Star v-else />
                </el-icon>
              </button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button class="part-close-btn" type="warning" @click="closePartConfig">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-fill-page { min-height: calc(100vh - 120px); }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0 0 8px; font-size: 13px; color: #606266; }

.embed-frame-wrap { flex: 1; min-height: 70vh; border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; }
.embed-frame { width: 100%; height: 75vh; border: 0; }

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
  margin-top: 8px;
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

@media (max-width: 1100px) {
  .tp-upper { grid-template-columns: 1fr; }
}

.part-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.part-name-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.star-btn {
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: #f56c6c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  line-height: 1;
}
.star-btn:hover {
  background: #fef0f0;
}
.star-btn.active {
  color: #e6a23c;
}
</style>

<style>
.part-config-dialog .el-dialog__header {
  margin: 0;
  padding: 12px 16px;
  background: #409eff;
}
.part-config-dialog .el-dialog__title {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.part-config-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #fff;
}
.part-config-dialog .el-dialog__headerbtn:hover .el-dialog__close {
  color: #ecf5ff;
}
.part-config-dialog .el-dialog__body {
  padding: 12px 16px 8px;
}
.part-config-dialog .el-dialog__footer {
  padding: 10px 16px 14px;
}
.part-config-dialog .part-close-btn {
  min-width: 88px;
}
</style>
