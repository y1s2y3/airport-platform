<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectPersonnel,
  getRealNameStats,
  workTypeOptions,
  entryStatusOptions,
  entryStatusTagClass,
  isSafetyEducationComplete,
  maskPhone,
  logPhoneView,
} from '../../mock/laborRealName'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'

const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ workType: '', entryStatus: '', unitName: '' })
const visiblePhoneIds = ref(new Set())

const allPersonnel = computed(() => getProjectPersonnel(scopeProjectId.value))

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label.replace(/\(\d+\)$/, '')}(${item.count})`,
    })),
  })),
)

const filteredPersonnel = computed(() => {
  const kw = keyword.value.trim()
  return allPersonnel.value.filter((row) => {
    if (kw) {
      const hay = `${row.basic.personnelNo}${row.basic.name}${row.basic.phone}${row.basic.idNumber}${row.unit.unitName}${row.unit.workType}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.workType && row.unit.workType !== filters.value.workType) return false
    if (filters.value.entryStatus && row.entryStatus !== filters.value.entryStatus) return false
    if (filters.value.unitName && !row.unit.unitName.includes(filters.value.unitName.trim())) {
      return false
    }
    return true
  })
})

const stats = computed(() => getRealNameStats(scopeProjectId.value))
watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', unitName: '' }
  visiblePhoneIds.value = new Set()
})

function handleReset() {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', unitName: '' }
}

function goDetail(row) {
  router.push({ name: 'RealNamePersonnelDetail', params: { id: row.id } })
}

function viewPhone(row) {
  visiblePhoneIds.value = new Set([...visiblePhoneIds.value, row.id])
  logPhoneView({
    personnelId: row.id,
    personnelNo: row.basic.personnelNo,
    name: row.basic.name,
    scene: '列表',
  })
}

function isPhoneVisible(id) {
  return visiblePhoneIds.value.has(id)
}
</script>

<template>
  <div class="realname-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制</div>
      <div class="page-heading">
        <h1 class="page-title">人员实名制</h1>
        <div class="header-actions">
          <el-button :icon="Download">导出</el-button>
        </div>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">
        对接类监管：人员数据由项目考勤闸机/实名制子系统同步，平台只读展示，不支持新增/编辑填报，不走数字档案审批闭环。
        采集口径为基本身份、日常考勤、特种作业资质有效期、三级安全教育；本期不采集工资明细。
      </p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="treeProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <div class="personnel-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>
        <div class="panel-head">
          <div class="panel-stats">
            <span>登记 {{ stats.total }} 人</span>
            <span>已入场 {{ stats.entered }}</span>
            <span>已退场 {{ stats.exited }}</span>
            <span>在场 {{ stats.onSite }}</span>
            <span>特种作业 {{ stats.special }}</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="编号 / 姓名 / 手机 / 证件号 / 参建单位"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.workType" placeholder="工种/职务" clearable style="width: 110px">
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.entryStatus" :placeholder="REALNAME_ENTRY_LABEL" clearable style="width: 100px">
            <el-option v-for="opt in entryStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-input v-model="filters.unitName" placeholder="参建单位" clearable style="width: 160px" />
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredPersonnel" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="basic.personnelNo" label="人员编号" width="130" show-overflow-tooltip />
          <el-table-column label="照片" width="70" align="center">
            <template #default="{ row }">
              <el-avatar :size="36" class="list-avatar">{{ row.basic.name.slice(0, 1) }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column prop="basic.name" label="姓名" width="90" />
          <el-table-column label="手机号码" width="170">
            <template #default="{ row }">
              <div class="phone-cell">
                <span>{{ isPhoneVisible(row.id) ? row.basic.phone : maskPhone(row.basic.phone) }}</span>
                <el-button
                  v-if="!isPhoneVisible(row.id)"
                  link
                  type="primary"
                  size="small"
                  @click="viewPhone(row)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="unit.workType" label="工种/职务" width="100" />
          <el-table-column prop="unit.unitName" label="参建单位名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="unit.certValidTo" label="特种资质有效期" width="130" align="center">
            <template #default="{ row }">{{ row.unit.certValidTo || '—' }}</template>
          </el-table-column>
          <el-table-column :label="REALNAME_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="entryStatusTagClass(row.entryStatus)">{{ row.entryStatus }}</span>
            </template>
          </el-table-column>
          <el-table-column label="三级安全教育" width="110" align="center">
            <template #default="{ row }">
              <span
                class="ap-status-tag"
                :class="isSafetyEducationComplete(row.safetyEducation) ? 'ap-tag-enabled' : 'ap-tag-high'"
              >
                {{ isSafetyEducationComplete(row.safetyEducation) ? '已完成' : '未完成' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.realname-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 600; color: var(--ap-text); }
.page-scope { margin: 4px 0 8px; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { margin-top: 0; font-size: 12px; color: var(--ap-text-muted); line-height: 1.5; }
.page-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}
.project-tree-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}
.panel-title { font-size: 15px; font-weight: 600; color: var(--ap-text); margin-bottom: 12px; }
.project-tree :deep(.el-tree-node__content) { height: 34px; border-radius: 4px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}
.panel-head { margin-bottom: 12px; }
.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.search-input { width: 300px; }
.list-avatar { background: var(--ap-primary-light); color: var(--ap-primary); font-size: 14px; }
.phone-cell { display: flex; align-items: center; gap: 6px; }
</style>
