<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { planData, userOptions } from '../../composables/useInspectionPlan'
import { listMobileInspectionTasks } from '../../mock/mobileInspectionTasks'

const router = useRouter()

const filterForm = reactive({ category: '', keyword: '' })

const filteredPlans = computed(() => {
  return planData.filter(p => {
    if (filterForm.category && p.inspectionCategory !== filterForm.category) return false
    if (filterForm.keyword && !p.name.includes(filterForm.keyword)) return false
    return true
  })
})

function getUpdatedByName(row) {
  const u = userOptions.find(u => u.id === row.updatedBy)
  return u ? u.label : row.updatedBy || '-'
}

// 操作
function goCreate() { router.push('/safety-inspection/plan/create') }
function goDetail(id) { router.push(`/safety-inspection/plan/${id}`) }
function goEdit(id) { router.push(`/safety-inspection/plan/${id}/edit`) }
function getExecutionTask(row) {
  return listMobileInspectionTasks().find(task => task.taskNo === row.planNo)
}
function getExecutionStatus(row) {
  return getExecutionTask(row)?.status === '已完成' ? '已完成' : '未完成'
}
function goTaskDetail(row) {
  const task = getExecutionTask(row)
  if (task) {
    router.push({
      path: `/safety-inspection/task/${task.id}`,
      query: { from: 'task-dispatch' },
    })
  }
}

</script>

<template>
  <div class="plan-page">
    <div class="page-head">
      <h3 class="page-title">巡检任务下发</h3>
      <el-button type="primary" size="default" @click="goCreate">
        <el-icon><Plus /></el-icon>下发任务
      </el-button>
    </div>
    <div class="filter-bar">
      <el-select v-model="filterForm.category" placeholder="巡检分类" clearable style="width: 110px" aria-label="巡检分类">
        <el-option label="安全" value="安全" />
        <el-option label="质量" value="质量" />
      </el-select>
      <el-input v-model="filterForm.keyword" placeholder="搜索任务名称..." clearable style="width: 240px" aria-label="搜索任务名称..."/>
    </div>
    <div class="table-wrap">
      <el-table :data="filteredPlans" border stripe class="ap-table" style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="name" label="任务名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.name }}</template>
        </el-table-column>
        <el-table-column prop="planNo" label="任务单编号" min-width="170" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goTaskDetail(row)">{{ row.planNo }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionCategory" label="巡检分类" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="row.inspectionCategory === '质量' ? 'warning' : 'success'" size="small" effect="plain">
              {{ row.inspectionCategory || '安全' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="projects" label="项目" min- show-overflow-tooltip>
          <template #default="{ row }">{{ row.projects.join('、') }}</template>
        </el-table-column>
        <el-table-column label="任务接收人" min-width="150" align="center">
          <template #default>监理</template>
        </el-table-column>
        <el-table-column label="截止日期" min-width="110" align="center">
          <template #default="{ row }">{{ row.deadlineDate || row.endDate || '—' }}</template>
        </el-table-column>
        <el-table-column label="更新人"  align="center">
          <template #default="{ row }">{{ getUpdatedByName(row) }}</template>
        </el-table-column>
        <el-table-column label="更新时间"  align="center">
          <template #default="{ row }">{{ row.updated_at }}</template>
        </el-table-column>
        <el-table-column label="下发状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small" effect="light">{{ row.status || '已下发' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="任务执行状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getExecutionStatus(row) === '已完成' ? 'success' : 'warning'" size="small" effect="light">
              {{ getExecutionStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row.id)">详情</el-button>
            <el-button v-if="getExecutionStatus(row) !== '已完成'" link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="filteredPlans.length === 0" class="empty-row">暂无数据</div>
    </div>
  </div>
</template>

<style scoped>
.plan-page { display: flex; flex-direction: column; gap: 16px; height: 100%; }
.page-head { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 18px; font-weight: 700; color: var(--ap-text); margin: 0; }
.filter-bar { display: flex; gap: 12px; flex-wrap: wrap; }
.table-wrap { flex: 1; background: var(--ap-card); border: 1px solid var(--ap-border); border-radius: 8px; padding: 16px; overflow: hidden; }
.empty-row { text-align: center; padding: 40px 0; color: var(--ap-text-muted); font-size: 14px; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }
</style>
