<script setup>
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { planData, deletePlan, togglePlanEnabled, userOptions } from '../../composables/useInspectionPlan'

const router = useRouter()

const filterForm = reactive({ type: '', keyword: '' })

const filteredPlans = computed(() => {
  return planData.filter((p) => {
    if (filterForm.type && p.type !== filterForm.type) return false
    const name = p.name || ''
    if (filterForm.keyword && !name.includes(filterForm.keyword)) return false
    return true
  })
})

function pushRuleLabel(row) {
  const map = { day: '天', week: '周', month: '月', once: '' }
  if (row.cycleType === 'once') return '一次性'
  return `每${row.cycleInterval}${map[row.cycleType]}${row.cycleTimes}次`
}

function getUpdatedByName(row) {
  const u = userOptions.find(u => u.id === row.updatedBy)
  return u ? u.label : row.updatedBy || '-'
}

// 操作
function goCreate() { router.push('/safety-inspection/plan/create') }
function goDetail(id) { router.push(`/safety-inspection/plan/${id}`) }
function goEdit(id) { router.push(`/safety-inspection/plan/${id}/edit`) }

function handleToggle(row) {
  togglePlanEnabled(row.id)
  ElMessage.success(row.enabled ? '已启用' : '已禁用')
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => { deletePlan(row.id); ElMessage.success('已删除') }).catch(() => {})
}
</script>

<template>
  <div class="plan-page">
    <div class="page-head">
      <h3 class="page-title">巡检计划</h3>
      <el-button type="primary" size="default" @click="goCreate">
        <el-icon><Plus /></el-icon>新增计划
      </el-button>
    </div>
    <div class="filter-bar">
      <el-select v-model="filterForm.type" placeholder="计划类型" clearable style="width: 130px">
        <el-option label="周检" value="周检" />
        <el-option label="月检" value="月检" />
        <el-option label="专项巡检" value="专项巡检" />
      </el-select>
      <el-input v-model="filterForm.keyword" placeholder="搜索计划名称..." clearable style="width: 240px" />
    </div>
    <div class="table-wrap">
      <el-table :data="filteredPlans" border stripe class="ap-table" style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="name" label="计划名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row.id)">{{ row.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="planNo" label="计划编号" width="105" align="center" />
        <el-table-column label="类型" width="65" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type==='周检'" size="small" effect="plain">周检</el-tag>
            <el-tag v-else-if="row.type==='月检'" size="small" type="warning" effect="plain">月检</el-tag>
            <el-tag v-else size="small" type="danger" effect="plain">专项</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="projects" label="项目" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.projects.join('、') }}</template>
        </el-table-column>
        <el-table-column label="执行人" width="80" align="center">
          <template #default="{ row }">
            {{ userOptions.find(u=>u.id===row.responsiblePerson)?.label || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="推送规则" width="110" align="center">
          <template #default="{ row }">{{ pushRuleLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="生效日期" width="180" align="center">
          <template #default="{ row }">{{ row.startDate }} ~ {{ row.endDate }}</template>
        </el-table-column>
        <el-table-column label="更新人" width="80" align="center">
          <template #default="{ row }">{{ getUpdatedByName(row) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="150" align="center">
          <template #default="{ row }">{{ row.updatedAt }}</template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small" effect="light">
              {{ row.enabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row.id)">详情</el-button>
            <el-button link type="primary" size="small" @click="goEdit(row.id)">编辑</el-button>
            <el-button link :type="row.enabled ? 'warning' : 'success'" size="small" @click="handleToggle(row)">
              {{ row.enabled ? '禁用' : '启用' }}
            </el-button>
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
</style>
