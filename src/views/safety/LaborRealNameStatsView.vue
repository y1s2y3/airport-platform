<script setup>
/**
 * 实名制统计（指挥部）— 按项目汇总人员数量，可下钻项目级人员实名制
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../composables/useCurrentProject'
import { buildHqRealNameStatsByProject } from '../../mock/laborRealName'

const router = useRouter()
const keyword = ref('')

const rows = computed(() => buildHqRealNameStatsByProject())

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function reset() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  // 先离开指挥部专属页，再切项目，避免 leaveRestrictedPages 踢回工作台
  await router.push('/labor/realname')
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 实名制统计</div>
      <h1 class="page-title">实名制统计</h1>
      <p class="page-tip">
        按项目汇总实名制人员数量；点击「查看项目详情」进入项目级人员实名制。无明细演示数据的项目显示为 0。
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无项目实名制数据">
      <el-table-column prop="project_name" label="项目名称" min-width="220" fixed show-overflow-tooltip />
      <el-table-column label="总人数" width="110" align="center" prop="total" />
      <el-table-column label="管理人员数量" width="130" align="center" prop="manage" />
      <el-table-column label="劳务人员数量" width="130" align="center" prop="labor" />
      <el-table-column label="特种作业人员数量" width="150" align="center" prop="special" />
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
