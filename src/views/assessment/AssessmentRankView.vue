<script setup>
/**
 * 考核排名。指挥部按月看已纳入项目名次；项目只看本项目得分、扣分和自己的名次。
 * 查看明细用抽屉，不切换顶栏项目。
 */
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  buildRanking,
  getAssessmentGrades,
  getProjectAssessment,
  listPeriodGroups,
  summarizeRanking,
} from '../../mock/assessmentScore'

const { isHqSelected, selectedProjectId, headerProjectLabel } = useCurrentProject()

const monthGroup = listPeriodGroups().find((item) => item.id === 'month')
const periodOptions = monthGroup?.options || []
const periodId = ref(periodOptions[0]?.id || '')
const keyword = ref('')
const drawerVisible = ref(false)
const drawerRow = ref(null)

const currentPeriod = computed(() => periodOptions.find((item) => item.id === periodId.value))

const ranking = computed(() => buildRanking(periodId.value))
const summary = computed(() => summarizeRanking(ranking.value))
const grades = computed(() => getAssessmentGrades())

const filtered = computed(() => {
  const text = keyword.value.trim()
  if (!text) return ranking.value
  return ranking.value.filter((row) => row.project_name.includes(text))
})

const mine = computed(() => getProjectAssessment(selectedProjectId.value, periodId.value))

function gradeColorOf(item) {
  return item?.color || '#909399'
}

function gradeColorByName(name) {
  return gradeColorOf(grades.value.find((item) => item.name === name))
}

function gradeChipStyle(name) {
  const color = gradeColorByName(name)
  return { color, borderColor: color }
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') return '--'
  const number = Number(value)
  if (Number.isNaN(number)) return '--'
  return number.toFixed(1)
}

function formatValue(line) {
  if (!line.involved) return '--'
  return line.value_text || '--'
}

function search() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

function reset() {
  keyword.value = ''
}

function openDetail(row) {
  drawerRow.value = row
  drawerVisible.value = true
}

function exportRank() {
  ElMessage.warning('导出格式尚未确认，当前仅保留查询')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">考核评分 / 考核排名</div>
      <h1 class="page-title">考核排名</h1>
    </div>

    <div class="filter-bar">
      <el-select v-model="periodId" style="width: 280px" aria-label="统计月份">
        <el-option v-for="item in periodOptions" :key="item.id" :label="item.label" :value="item.id" />
      </el-select>
      <el-tag v-if="currentPeriod?.ongoing" type="warning">出勤、摄像头按已结束日期求平均；塔吊、升降机按月累计；每日施工作业统计填报天数。任务、隐患、预警在次月 1 日统计，次月 1 日后名次固定</el-tag>
    </div>

    <template v-if="isHqSelected">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-label">已纳入项目数</span>
          <span class="stat-value">{{ summary.count }}</span>
        </div>
        <div
          v-for="(item, index) in grades"
          :key="item.id"
          class="stat-card is-grade"
          :style="{ borderTopColor: gradeColorOf(item) }"
        >
          <span class="stat-label">{{ item.name }}</span>
          <span class="stat-value" :style="{ color: gradeColorOf(item) }">{{ summary.grades[item.name] || 0 }} 个</span>
        </div>
      </div>

      <div class="filter-bar">
        <el-input v-model="keyword" clearable placeholder="项目名称" style="width: 240px" :prefix-icon="Search" aria-label="项目名称" />
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button @click="exportRank">导出</el-button>
      </div>

      <el-table :data="filtered" stripe border empty-text="暂无已纳入项目">
        <el-table-column label="名次" width="80" align="center" prop="rank" />
        <el-table-column label="项目名称" min-width="180" prop="project_name" show-overflow-tooltip />
        <el-table-column label="等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.grade" size="small" effect="plain" :style="gradeChipStyle(row.grade)">{{ row.grade }}</el-tag>
            <span v-else>--</span>
          </template>
        </el-table-column>
        <el-table-column label="综合得分" width="120" align="center">
          <template #default="{ row }">{{ formatScore(row.score) }} 分</template>
        </el-table-column>
        <el-table-column label="扣分合计" width="120" align="center">
          <template #default="{ row }">{{ formatScore(row.deduct_total) }} 分</template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">扣分明细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-drawer v-model="drawerVisible" :title="drawerRow ? `${drawerRow.project_name} · 扣分明细` : '扣分明细'" size="720px">
        <template v-if="drawerRow">
          <p class="drawer-score">
            综合得分 {{ formatScore(drawerRow.score) }} 分
            <el-tag v-if="drawerRow.grade" size="small" effect="plain" :style="gradeChipStyle(drawerRow.grade)">{{ drawerRow.grade }}</el-tag>
          </p>
          <el-table :data="drawerRow.lines" stripe border empty-text="暂无指标">
            <el-table-column label="指标" min-width="160" prop="indicator_name" />
            <el-table-column label="指标值" min-width="120">
              <template #default="{ row }">{{ formatValue(row) }}</template>
            </el-table-column>
            <el-table-column label="是否涉及" width="100" align="center">
              <template #default="{ row }">{{ row.involved ? '涉及' : '不涉及' }}</template>
            </el-table-column>
            <el-table-column label="扣分上限" width="100" align="center">
              <template #default="{ row }">{{ formatScore(row.cap) }} 分</template>
            </el-table-column>
            <el-table-column label="本项扣分" width="100" align="center">
              <template #default="{ row }">{{ formatScore(row.deduct) }} 分</template>
            </el-table-column>
            <el-table-column label="说明" min-width="160" prop="note" />
          </el-table>
        </template>
      </el-drawer>
    </template>

    <template v-else>
      <el-empty v-if="!mine.included" description="未纳入评分" />
      <template v-else>
        <p class="self-title">{{ headerProjectLabel || mine.project_name }}</p>
        <div class="stat-row">
          <div class="stat-card">
            <span class="stat-label">综合得分</span>
            <span class="stat-value is-score">{{ formatScore(mine.score) }} 分</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">指挥部排名</span>
            <span class="stat-value">{{ mine.rank ? `第${mine.rank}名` : '--' }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">等级</span>
            <span class="stat-value">
              <el-tag v-if="mine.grade" effect="plain" :style="gradeChipStyle(mine.grade)">{{ mine.grade }}</el-tag>
              <span v-else>--</span>
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">扣分合计</span>
            <span class="stat-value">{{ formatScore(mine.deduct_total) }} 分</span>
          </div>
        </div>
        <el-table :data="mine.lines" stripe border empty-text="暂无指标">
          <el-table-column label="指标" min-width="180" prop="indicator_name" />
          <el-table-column label="指标值" min-width="140">
            <template #default="{ row }">{{ formatValue(row) }}</template>
          </el-table-column>
          <el-table-column label="是否涉及" width="110" align="center">
            <template #default="{ row }">{{ row.involved ? '涉及' : '不涉及' }}</template>
          </el-table-column>
          <el-table-column label="扣分上限" width="110" align="center">
            <template #default="{ row }">{{ formatScore(row.cap) }} 分</template>
          </el-table-column>
          <el-table-column label="本项扣分" width="110" align="center">
            <template #default="{ row }">{{ formatScore(row.deduct) }} 分</template>
          </el-table-column>
          <el-table-column label="说明" min-width="180" prop="note" />
        </el-table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.page-title { margin: 4px 0; font-size: 20px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card {
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-card.is-grade { border-top: 3px solid transparent; }
.stat-label { font-size: 13px; color: var(--ap-text-muted, #909399); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--ap-primary, #91003d); line-height: 1.2; }
.stat-value.is-score { color: #67c23a; }
.self-title { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.drawer-score { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; }
</style>
