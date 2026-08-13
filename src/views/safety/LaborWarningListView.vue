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
const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ status: '', handleMode: '', ruleKey: '' })

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
    if (filters.value.handleMode && row.handleMode !== filters.value.handleMode) return false
    if (filters.value.ruleKey && row.ruleKey !== filters.value.ruleKey) return false
    if (kw) {
      const hay = `${row.warningNo}${row.ruleLabel}${row.name}${row.personnelNo}${row.unitName}`
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const stats = computed(() => getWarningStats(scopeProjectId.value))

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { status: '', handleMode: '', ruleKey: '' }
})

function handleReset() {
  keyword.value = ''
  filters.value = { status: '', handleMode: '', ruleKey: '' }
}

function goDetail(row) {
  router.push({ name: 'LaborWarningDetail', params: { id: row.id } })
}

function goHandle(row) {
  router.push({ name: 'LaborWarningDetail', params: { id: row.id }, query: { handle: '1' } })
}
</script>

<template>
  <div class="warning-list-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 预警清单</div>
      <h1 class="page-title">预警清单</h1>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">
        展示人员预警列表及处置进度。预警分自动关闭、手动关闭、通知三类；通知类（如高龄提醒、身份证过期提醒）状态为已通知、无需关闭。
      </p>
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
          <el-input v-model="keyword" placeholder="预警编号/人员/单位" clearable style="width: 200px" />
          <el-select v-model="filters.ruleKey" placeholder="预警类型" clearable style="width: 200px">
            <el-option v-for="item in ruleTypeOptions" :key="item.key" :label="item.label" :value="item.key" />
          </el-select>
          <el-select v-model="filters.status" placeholder="预警状态" clearable style="width: 120px">
            <el-option v-for="item in warningStatusOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select v-model="filters.handleMode" placeholder="处置方式" clearable style="width: 140px">
            <el-option v-for="item in handleModeOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <div class="table-meta">
          <template v-if="isHqSelected">当前项目：{{ scopeProjectLabel }}，</template>
          共 {{ filteredWarnings.length }} 条
        </div>

        <el-table :data="filteredWarnings" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="warningNo" label="预警编号" width="130" />
          <el-table-column prop="ruleLabel" label="预警类型" min-width="200" show-overflow-tooltip />
          <el-table-column prop="name" label="人员姓名" width="90" />
          <el-table-column prop="personnelNo" label="人员编号" width="130" />
          <el-table-column prop="unitName" label="参建单位" min-width="160" show-overflow-tooltip />
          <el-table-column prop="workType" label="工种" width="90" />
          <el-table-column prop="handleMode" label="处置方式" width="120" align="center">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.handleMode === '系统自动关闭' ? 'success' : row.handleMode === '通知' ? 'info' : 'warning'"
                effect="plain"
              >
                {{ row.handleMode }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="warningStatusTagClass[row.status]">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="currentLevel" label="当前层级" width="90" align="center">
            <template #default="{ row }">{{ row.status === '已关闭' ? '-' : `${row.currentLevel}级` }}</template>
          </el-table-column>
          <el-table-column prop="triggeredAt" label="触发时间" width="160" />
          <el-table-column label="操作" width="130" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="goDetail(row)">详情</el-button>
              <el-button
                v-if="row.handleMode === '手动处理' && row.status !== '已关闭'"
                link
                type="primary"
                @click="goHandle(row)"
              >
                处置预警
              </el-button>
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
.page-scope { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { font-size: 12px; color: var(--ap-text-muted); margin: 0; }
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
