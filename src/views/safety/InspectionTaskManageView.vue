<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'

const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()

// 任务指派
const selectedRows = ref([])
const assignDialogVisible = ref(false)
const assignForm = reactive({ inspector: '' })
const inspectorOptions = [
  { label: '王工', value: '王工' },
  { label: '李工', value: '李工' },
  { label: '赵工', value: '赵工' },
  { label: '陈工', value: '陈工' },
  { label: '张工', value: '张工' },
  { label: '刘工', value: '刘工' },
  { label: '吴工', value: '吴工' },
]

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function openAssignDialog() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选需要指派的巡检任务单')
    return
  }
  assignForm.inspector = ''
  assignDialogVisible.value = true
}

function confirmAssign() {
  if (!assignForm.inspector) { ElMessage.warning('请选择巡检人'); return }
  const ins = assignForm.inspector
  const count = selectedRows.value.length
  selectedRows.value.forEach(row => {
    const found = taskData.value.find(t => t.id === row.id)
    if (found) {
      found.inspector = ins
    }
  })
  selectedRows.value = []
  assignDialogVisible.value = false
  ElMessage.success(`已将 ${count} 个任务单指派给 ${ins}`)
}

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
    inspector:'', companions:[],
    deadline:'2026-07-10', status:'待指派',
    itemCount:0, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-001', taskNo:'XJ20260728001', planNo:'JH2026001', source:'任务推送',
    planName:'7月第4周安全巡检', planType:'周检',
    project:'飞行区跑道延长工程', projectId:'p-000',
    inspector:'王工', companions:[],
    deadline:'2026-07-28', status:'待执行',
    itemCount:12, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-002', taskNo:'XJ20260720002', planNo:'JH2026002', source:'任务推送',
    planName:'临时用电专项检查', planType:'专项巡检',
    project:'T3航站楼扩建工程', projectId:'p-001',
    inspector:'王工', companions:['刘工'],
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
    inspector:'王工', companions:['刘工','陈工'],
    deadline:'2026-07-21', inspectionDate:'2026-07-21', status:'已完成',
    itemCount:12, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-004', taskNo:'XJ20260731004', planNo:'', source:'系统自建',
    planName:'', planType:'月检',
    project:'新货运站建设工程', projectId:'p-003',
    inspector:'王工', companions:[],
    deadline:'', inspectionDate:'2026-07-31', status:'已完成',
    itemCount:0, hazardCount:0, hazardItems:[],
  },
  {
    id:'mt-005', taskNo:'XJ20260728005', planNo:'', source:'系统自建',
    planName:'', planType:'专项巡检',
    project:'飞行区跑道延长工程', projectId:'p-000',
    inspector:'王工', companions:['吴工'],
    deadline:'', inspectionDate:'2026-07-28', status:'已完成',
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
      if (!t.taskNo.includes(kw) && !t.planName.includes(kw) && !t.planNo.includes(kw) && !t.project.includes(kw)) return false
    }
    return true
  })
})

function isOverdue(row) {
  if (row.status === '已完成') return false
  if (!row.deadline) return false
  return new Date(row.deadline) < new Date('2026-07-16')
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
        <el-button type="primary" size="default" @click="openAssignDialog">任务指派</el-button>
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
            <el-option label="待指派" value="待指派" /><el-option label="待执行" value="待执行" /><el-option label="已完成" value="已完成" />
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
        <el-table :data="filteredTasks" stripe border style="width:100%" v-if="filteredTasks.length" class="task-table" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="40" v-if="isHqSelected" />
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="taskNo" label="任务单编号" min-width="120" />
          <el-table-column prop="project" label="所属项目" min-width="120" show-overflow-tooltip />
          <el-table-column label="计划名称" min-width="120">
            <template #default="{ row }">
              <span v-if="row.planName">{{ row.planName }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="planType" label="巡检类型" min-width="70" align="center" />
          <el-table-column prop="inspector" label="巡检人" min-width="60" align="center" />
          <el-table-column label="同行人" min-width="80" align="center">
            <template #default="{ row }">
              <span v-if="row.companions?.length">{{ row.companions.join('、') }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="巡检日期" min-width="90" align="center">
            <template #default="{ row }">
              <span v-if="row.status === '待执行' || row.status === '待指派'" style="color:#999">--</span>
              <span v-else-if="row.inspectionDate">{{ row.inspectionDate }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" min-width="55" align="center" />
          <el-table-column label="结果" min-width="55" align="center">
            <template #default="{ row }">
              <span v-if="row.status === '已完成'">
                <span v-if="row.hazardCount > 0">有隐患</span>
                <span v-else>正常</span>
              </span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="隐患数量" min-width="55" align="center">
            <template #default="{ row }">
              <span v-if="row.hazardCount > 0">{{ row.hazardCount }}</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="是否逾期" min-width="65" align="center">
            <template #default="{ row }">
              <span v-if="isOverdue(row)" style="color:#e53935;font-weight:600">是</span>
              <span v-else style="color:#999">-</span>
            </template>
          </el-table-column>
          <el-table-column label="整改单" min-width="100" align="center">
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

  <!-- 任务指派对话框 -->
  <el-dialog v-model="assignDialogVisible" title="任务指派" width="480px" destroy-on-close>
    <el-form label-width="80px">
      <el-form-item label="已选任务">
        <el-tag v-for="row in selectedRows" :key="row.id" style="margin:2px 4px 2px 0">{{ row.taskNo }}</el-tag>
      </el-form-item>
      <el-form-item label="巡检人" required>
        <el-select v-model="assignForm.inspector" placeholder="请选择巡检人" style="width:100%">
          <el-option v-for="opt in inspectorOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="assignDialogVisible=false">取消</el-button>
      <el-button type="primary" @click="confirmAssign">确认指派</el-button>
    </template>
  </el-dialog>
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
</style>
