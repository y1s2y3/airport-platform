<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { getProjectInspectorLabel } from '../../composables/useInspectionPersonConfig'
import { projectTree } from '../../mock/laborRealName.js'

const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()

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
      const count = taskData.value.filter(t => t.projectId === node.id).length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

// ===== 5条示例（响应式数组，可修改） =====
const taskData = ref([
  {
    id:'mt-000', taskNo:'XJ20260730001', planNo:'JH2026007', source:'任务推送',
    planName:'6月底安全巡检', planType:'周检',
    project:'飞行区跑道延长工程', projectId:'p-000',
    inspector:getProjectInspectorLabel('p-000'), companions:[],
    deadline:'2026-07-10', status:'待执行',
    itemCount:0, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-001', taskNo:'XJ20260728001', planNo:'JH2026001', source:'任务推送',
    planName:'7月第4周安全巡检', planType:'周检',
    project:'飞行区跑道延长工程', projectId:'p-000',
    inspector:getProjectInspectorLabel('p-000'), companions:[],
    deadline:'2026-07-28', status:'待执行',
    itemCount:12, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-002', taskNo:'XJ20260720002', planNo:'JH2026002', source:'任务推送',
    planName:'临时用电专项检查', planType:'专项巡检',
    project:'T3航站楼扩建工程', projectId:'p-001',
    inspector:getProjectInspectorLabel('p-001'), companions:[],
    deadline:'2026-07-20', inspectionDate:'2026-07-20', status:'已完成',
    itemCount:8, hazardCount:2,
    hazardItems:[
      { desc:'五芯电缆破损', hasRectify:true, rectifyNo:'ZG202607001', rectifyId:'rec-001' },
      { desc:'电缆线路沿地明敷', hasRectify:true, rectifyNo:'ZG202607002', rectifyId:'rec-002' },
    ],
  },
  {
    id:'mt-003', taskNo:'XJ20260721003', planNo:'JH2026001', source:'任务推送',
    planName:'7月第三周安全巡检', planType:'周检',
    project:'T3航站楼扩建工程', projectId:'p-001',
    inspector:getProjectInspectorLabel('p-001'), companions:[],
    deadline:'2026-07-21', inspectionDate:'2026-07-21', status:'已完成',
    itemCount:12, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-004', taskNo:'XJ20260731004', planNo:'', source:'系统自建',
    planName:'【自建】月检巡检', planType:'月检',
    project:'新货运站建设工程', projectId:'p-003',
    inspector:'王工', companions:[],
    deadline:'2026-07-31', inspectionDate:'2026-07-31', status:'已完成',
    itemCount:0, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-005', taskNo:'XJ20260728005', planNo:'', source:'系统自建',
    planName:'【自建】专项巡检', planType:'专项巡检',
    project:'飞行区跑道延长工程', projectId:'p-000',
    inspector:'王工', companions:['吴工'],
    deadline:'2026-07-28', inspectionDate:'2026-07-28', status:'已完成',
    itemCount:0, hazardCount:1,
    hazardItems:[
      { desc:'电缆破损', hasRectify:true, rectifyNo:'ZG202607007', rectifyId:'rec-007' },
    ],
  },
])

// ===== 项目树数据 =====
const treeData = computed(() => projectTree)

// ===== 筛选 =====
const filterForm = reactive({ keyword: '', status: '', source: '', planType: '', result: '', overdue: '' })

const filteredTasks = computed(() => {
  let list = taskData.value
  // HQ模式：按项目树过滤（localProjectId为空时显示全部）
  if (isHqSelected.value && localProjectId.value) {
    list = list.filter(t => t.projectId === localProjectId.value)
  }
  return list.filter(t => {
    if (filterForm.status && t.status !== filterForm.status) return false
    if (filterForm.source && t.source !== filterForm.source) return false
    if (filterForm.planType && t.planType !== filterForm.planType) return false
    if (filterForm.result === '正常' && (t.status !== '已完成' || t.hazardCount > 0)) return false
    if (filterForm.result === '有隐患' && (t.status !== '已完成' || t.hazardCount === 0)) return false
    if (filterForm.overdue === '是') {
      if (!t.deadline) return false
      if (t.status === '已完成') return false
      if (new Date(t.deadline) >= new Date('2026-07-16')) return false
    }
    if (filterForm.overdue === '否') {
      if (!t.deadline) return true
      if (t.status === '已完成') return true
      if (new Date(t.deadline) >= new Date('2026-07-16')) return true
    }
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!t.taskNo.includes(kw) && !(t.planName || '').includes(kw) && !(t.planNo || '').includes(kw) && !(t.project || '').includes(kw)) return false
    }
    return true
  })
})

function isOverdue(row) {
  if (row.status === '已完成') return false
  if (!row.deadline) return false
  return new Date(row.deadline) < new Date('2026-07-16')
}

function getTaskInspector(row) {
  if (row.source === '任务推送') return getProjectInspectorLabel(row.projectId) || row.inspector || '-'
  return row.inspector || '-'
}

function getTaskCompanions(row) {
  return row.companions || []
}

function viewDetail(row) { router.push(`/safety-inspection/task/${row.id}`) }
function goRectify(id) { router.push(`/safety-inspection/hazard/${id}`) }
function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }
</script>

<template>
  <div class="task-page">
    <div class="page-head">
      <h3 class="page-title">巡检任务管理</h3>
      <div class="page-actions" v-if="isHqSelected">
      </div>
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
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索编号/名称/整改单..." clearable style="width:240px" :prefix-icon="Search" />
          <el-select v-model="filterForm.status" placeholder="任务状态" clearable style="width:100px">
            <el-option label="待执行" value="待执行" /><el-option label="已完成" value="已完成" />
          </el-select>
          <el-select v-model="filterForm.source" placeholder="单据来源" clearable style="width:110px">
            <el-option label="任务推送" value="任务推送" /><el-option label="系统自建" value="系统自建" />
          </el-select>
          <el-select v-model="filterForm.planType" placeholder="巡检类型" clearable style="width:100px">
            <el-option label="周检" value="周检" /><el-option label="月检" value="月检" /><el-option label="专项巡检" value="专项巡检" />
          </el-select>
          <el-select v-model="filterForm.result" placeholder="巡检结果" clearable style="width:100px">
            <el-option label="正常" value="正常" /><el-option label="有隐患" value="有隐患" />
          </el-select>
          <el-select v-model="filterForm.overdue" placeholder="是否逾期" clearable style="width:100px">
            <el-option label="是" value="是" /><el-option label="否" value="否" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>

        <!-- 台账表格 -->
        <el-table :data="filteredTasks" stripe border style="width:100%" v-if="filteredTasks.length" class="task-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="taskNo" label="任务单编号" min- />
          <el-table-column prop="project" label="所属项目" min- show-overflow-tooltip />
          <el-table-column label="计划名称" min->
            <template #default="{ row }">
              <span v-if="row.planName">{{ row.planName }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="planType" label="巡检类型" min- align="center" />
          <el-table-column label="巡检人" min- align="center">
            <template #default="{ row }">{{ getTaskInspector(row) }}</template>
          </el-table-column>
          <el-table-column label="同行人" min- align="center">
            <template #default="{ row }">
              <span v-if="getTaskCompanions(row).length">{{ getTaskCompanions(row).join('、') }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="巡检日期" min- align="center">
            <template #default="{ row }">
              <span v-if="row.status === '待执行'" style="color:#999">--</span>
              <span v-else-if="row.inspectionDate">{{ row.inspectionDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min- align="center" />
          <el-table-column label="结果" min- align="center">
            <template #default="{ row }">
              <span v-if="row.status === '已完成'">
                <span v-if="row.hazardCount > 0">有隐患</span>
                <span v-else>正常</span>
              </span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="隐患数量" min- align="center">
            <template #default="{ row }">
              <span v-if="row.hazardCount > 0">{{ row.hazardCount }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否逾期" min- align="center">
            <template #default="{ row }">
              <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="整改单" min- align="center">
            <template #default="{ row }">
              <template v-if="row.hazardItems?.some(h => h.hasRectify)">
                <div style="display:flex;flex-direction:column;gap:2px">
                  <el-button
                    v-for="hi in row.hazardItems.filter(h => h.hasRectify)"
                    :key="hi.rectifyId"
                    link type="primary" size="small"
                    @click="goRectify(hi.rectifyId)"
                  >{{ hi.rectifyNo }}</el-button>
                </div>
              </template>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="empty-state">暂无数据</div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.task-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.empty-state { text-align:center; padding:60px 0; color:#999; font-size:14px; }
.el-table { font-size:13px; }

/* 左树右表布局 */
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.project-tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
