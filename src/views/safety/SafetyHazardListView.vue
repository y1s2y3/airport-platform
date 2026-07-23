<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'

const router = useRouter()
const { isHqSelected, treeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()

// 项目树搜索与选中
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') {
    localProjectId.value = ''
    treeProjectId.value = data.id
  } else {
    localProjectId.value = data.id
    _treeClick(data)
  }
}

const treeDataWithCount = computed(() => {
  const root = projectTree[0]
  const children = root.children
    .map(node => {
      const count = rectifyData.filter(d => d.projectId === node.id).length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

// 6条整改单，每单一条隐患
const rectifyData = [
  { id:'rec-001', rectifyNo:'ZG202607001', taskNo:'XJ20260728001', project:'飞行区跑道延长工程', projectId:'p-000', rectifier:'赵工', reviewer:'张工', deadline:'2026-07-30', status:'待整改', rectDate:'', reviewDate:'' },
  { id:'rec-006', rectifyNo:'ZG202607006', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', projectId:'p-001', rectifier:'王工', reviewer:'张工', deadline:'2026-07-22', status:'待整改', rectDate:'2026-07-20', reviewDate:'2026-07-22' },
  { id:'rec-002', rectifyNo:'ZG202607002', taskNo:'XJ20260728001', project:'飞行区跑道延长工程', projectId:'p-000', rectifier:'李工', reviewer:'张工', deadline:'2026-07-28', status:'待复查', rectDate:'2026-07-25', reviewDate:'' },
  { id:'rec-003', rectifyNo:'ZG202607003', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', projectId:'p-001', rectifier:'王工', reviewer:'张工', deadline:'2026-07-28', status:'待复查', rectDate:'2026-07-27', reviewDate:'2026-07-25' },
  { id:'rec-004', rectifyNo:'ZG202607004', taskNo:'XJ20260728005', project:'飞行区跑道延长工程', projectId:'p-000', rectifier:'赵工', reviewer:'李工', deadline:'2026-07-20', status:'已关闭', rectDate:'2026-07-22', reviewDate:'2026-07-25' },
  { id:'rec-011', rectifyNo:'ZG202607011', taskNo:'XJ20260721003', project:'T3航站楼扩建工程', projectId:'p-001', rectifier:'王工', reviewer:'张工', deadline:'2026-07-25', status:'已关闭', rectDate:'2026-07-24', reviewDate:'2026-07-26' },
]

const filterForm = reactive({ keyword: '', status: '', overdue: '' })

const treeData = computed(() => projectTree)

const filteredData = computed(() => {
  let list = rectifyData
  // HQ模式：按项目树过滤（localProjectId为空时显示全部）
  if (isHqSelected.value && localProjectId.value) {
    list = list.filter(d => d.projectId === localProjectId.value)
  }
  return list.filter(d => {
    if (filterForm.status && d.status !== filterForm.status) return false
    if (filterForm.overdue === '是') {
      if (!d.deadline) return false
      if (d.status === '已关闭') return false
      if (new Date(d.deadline) >= new Date('2026-07-16')) return false
    }
    if (filterForm.overdue === '否') {
      if (!d.deadline) return true
      if (d.status === '已关闭') return true
      if (new Date(d.deadline) >= new Date('2026-07-16')) return true
    }
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!d.rectifyNo.includes(kw) && !d.taskNo.includes(kw) && !d.project.includes(kw)) return false
    }
    return true
  })
})

function isOverdue(row) {
  if (row.status === '已关闭') return false
  if (!row.deadline) return false
  return new Date(row.deadline) < new Date('2026-07-16')
}

function viewDetail(row) { router.push(`/safety-inspection/hazard/${row.id}`) }
function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }
</script>

<template>
  <div class="hazard-page">
    <div class="page-head">
      <h3 class="page-title">安全隐患清单</h3>
      <span class="total-count">共 {{ filteredData.length }} 条</span>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <!-- 项目树（仅指挥部） -->
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-input v-model="treeSearch" placeholder="搜索项目..." clearable size="small" style="margin-bottom:8px" :prefix-icon="Search" />
        <el-tree
          :data="treeDataWithCount"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="localProjectId || 'hq'"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="handleTreeNodeClick"
        />
      </aside>

      <!-- 台账区域 -->
      <div class="page-panel">
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索整改单编号/巡检任务单编号..." clearable style="width:280px" :prefix-icon="Search" />
          <el-select v-model="filterForm.status" placeholder="整改状态" clearable style="width:110px">
            <el-option label="待整改" value="待整改" /><el-option label="待复查" value="待复查" /><el-option label="已关闭" value="已关闭" />
          </el-select>
          <el-select v-model="filterForm.overdue" placeholder="是否逾期" clearable style="width:100px">
            <el-option label="是" value="是" /><el-option label="否" value="否" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <el-table :data="filteredData" stripe border style="width:100%" class="hazard-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="rectifyNo" label="整改单编号" min-width="120" />
          <el-table-column prop="taskNo" label="巡检任务单编号" min-width="120" />
          <el-table-column prop="project" label="项目" min-width="110" show-overflow-tooltip />
          <el-table-column prop="rectifier" label="整改人" min-width="55" align="center" />
          <el-table-column prop="reviewer" label="复查人" min-width="55" align="center" />
          <el-table-column label="整改日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.rectDate">{{ row.rectDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="复查日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.reviewDate">{{ row.reviewDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="整改截止日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.deadline">{{ row.deadline }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否逾期" min-width="65" align="center">
            <template #default="{ row }">
              <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min-width="55" align="center" />
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hazard-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.el-table { font-size:13px; }

/* 左树右表布局 */
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.project-tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }
</style>
