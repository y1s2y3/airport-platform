<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectWarnings,
  getProjectPendingCount,
  getWarningStats,
  warningStatusOptions,
  handleModeOptions,
  warningStatusTagClass,
} from '../../mock/laborWarningList'
import { warningRuleDefinitions } from '../../mock/laborWarningConfig'

const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ status: '', handle_mode: '', rule_key: '' })

const ruleTypeOptions = warningRuleDefinitions.map((item) => ({
  key: item.key,
  label: item.label || item.key,
}))

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label}(${getProjectPendingCount(item.id)})`,
    })),
  })),
)

const allWarnings = computed(() => getProjectWarnings(scopeProjectId.value))

const filteredWarnings = computed(() => {
  const kw = keyword.value.trim()
  return allWarnings.value.filter((row) => {
    if (filters.value.status && row.status !== filters.value.status) return false
    if (filters.value.handle_mode && row.handle_mode !== filters.value.handle_mode) return false
    if (filters.value.rule_key && row.rule_key !== filters.value.rule_key) return false
    if (kw) {
      const hay = `${row.warning_no}${row.rule_label}${row.name}${row.personnel_no}${row.unit_name}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => getWarningStats(scopeProjectId.value))

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { status: '', handle_mode: '', rule_key: '' }
})

function handleReset() {
  keyword.value = ''
  filters.value = { status: '', handle_mode: '', rule_key: '' }
}

function goDetail(row) {
  router.push({ name: 'LaborWarningDetail', params: { id: row.id } })
}
</script>

<template>
  <div class="warning-list-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 预警清单</div>
      <h1 class="page-title">预警清单</h1>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          default-expand-all
          highlight-current
          :current-node-key="treeProjectId"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <main class="warning-main">
        <div class="stats-row">
          <div class="stat-card"><span class="stat-label">预警总数</span><span class="stat-value">{{ stats.total }}</span></div>
          <div class="stat-card"><span class="stat-label">待处理</span><span class="stat-value warn">{{ stats.pending }}</span></div>
          <div class="stat-card"><span class="stat-label">已关闭</span><span class="stat-value ok">{{ stats.closed }}</span></div>
          <div class="stat-card"><span class="stat-label">待人工处置</span><span class="stat-value warn">{{ stats.manual }}</span></div>
        </div>

        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="预警编号/人员/单位" clearable style="width: 200px" aria-label="预警编号/人员/单位"/>
          <el-select v-model="filters.rule_key" placeholder="预警类型" clearable style="width: 200px" aria-label="预警类型">
            <el-option v-for="item in ruleTypeOptions" :key="item.key" :label="item.label" :value="item.key" />
          </el-select>
          <el-select v-model="filters.status" placeholder="预警状态" clearable style="width: 120px" aria-label="预警状态">
            <el-option v-for="item in warningStatusOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="filters.handle_mode" placeholder="处置方式" clearable style="width: 140px" aria-label="处置方式">
            <el-option v-for="item in handleModeOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <div class="table-meta">共 {{ filteredWarnings.length }} 条</div>

        <el-table :data="filteredWarnings" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="warning_no" label="预警编号" width="130" />
          <el-table-column prop="rule_label" label="预警类型" min-width="200" show-overflow-tooltip />
          <el-table-column prop="name" label="人员姓名" width="90" />
          <el-table-column prop="personnel_no" label="人员编号" width="130" />
          <el-table-column prop="unit_name" label="参建单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="work_type" label="工种" width="90" />
          <el-table-column prop="handle_mode" label="处置方式" width="120" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.handle_mode === '系统自动关闭' ? 'success' : row.handle_mode === '通知' ? 'info' : 'warning'"
                effect="plain"
              >
                {{ row.handle_mode }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="warningStatusTagClass[row.status]">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="current_level" label="当前层级" width="90" align="center">
            <template #default="{ row }">{{ row.status === '已关闭' ? '-' : `${row.current_level}级` }}</template>
          </el-table-column>
          <el-table-column prop="triggered_at" label="触发时间" width="160" />
          <el-table-column label="操作" width="90" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="goDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </main>
    </div>
  </div>
</template>

<style scoped>
.warning-list-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.page-layout.with-tree { display: flex; gap: 16px; }
.project-tree-panel {
  width: 240px;
  flex-shrink: 0;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.warning-main { flex: 1; min-width: 0; }
.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 12px; color: var(--ap-text-muted); }
.stat-value { font-size: 20px; font-weight: 700; color: var(--ap-primary); }
.stat-value.warn { color: var(--ap-warning); }
.stat-value.ok { color: var(--ap-success); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.table-meta { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 10px; }
</style>
