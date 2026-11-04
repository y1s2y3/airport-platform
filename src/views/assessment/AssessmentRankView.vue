<script setup>
/**
 * 考核排名。指挥部按月看已纳入项目名次；项目只看本项目得分、扣分和自己的名次。
 * 查看明细用抽屉，不切换顶栏项目。
 */
import { computed, ref, watch } from 'vue'
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

/** 前三名领奖台（2-1-3 排列：冠军居中），其余进入右侧列表 */
const topThree = computed(() => filtered.value.slice(0, 3))
const podiumSlots = computed(() => {
  const [first, second, third] = topThree.value
  return [
    { pos: 2, row: second || null },
    { pos: 1, row: first || null },
    { pos: 3, row: third || null },
  ]
})
const otherRows = computed(() => filtered.value.slice(3))
const PAGE_SIZE = 10
const page = ref(1)
const pagedRows = computed(() => otherRows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
watch([keyword, periodId], () => { page.value = 1 })
watch(otherRows, (rows) => {
  const maxPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  if (page.value > maxPage) page.value = maxPage
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
      <el-tag v-if="currentPeriod?.ongoing" type="warning">出勤、摄像头按已结束日期求平均；塔吊按月累计；每日施工作业、实名制预警按比率统计。任务、隐患、预警、值班表、例会在次月 1 日统计，次月 1 日后名次固定；未参与评分的项目不进入排名</el-tag>
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

      <div class="rank-layout">
        <section class="podium-panel">
          <div class="podium" v-if="topThree.length">
            <div
              v-for="slot in podiumSlots"
              :key="slot.pos"
              class="podium-item"
              :class="`is-rank-${slot.pos}`"
            >
              <div v-if="slot.row" class="podium-card" @click="openDetail(slot.row)">
                <div class="podium-medal">{{ slot.row.rank }}</div>
                <div class="podium-name" :title="slot.row.project_name">{{ slot.row.project_name }}</div>
                <div class="podium-score">{{ formatScore(slot.row.score) }} 分</div>
                <el-tag v-if="slot.row.grade" size="small" effect="plain" :style="gradeChipStyle(slot.row.grade)">{{ slot.row.grade }}</el-tag>
                <span v-else class="podium-grade-empty">--</span>
              </div>
              <div v-else class="podium-placeholder"></div>
              <div v-if="slot.row" class="podium-base">第{{ slot.pos }}名</div>
            </div>
          </div>
          <el-empty v-else :image-size="100" description="暂无已纳入项目" />
        </section>

        <section class="list-panel">
          <el-table :data="pagedRows" stripe border empty-text="暂无其他排名项目">
            <el-table-column label="名次" width="56" align="center" prop="rank" />
            <el-table-column label="项目名称" min-width="90" prop="project_name" show-overflow-tooltip />
            <el-table-column label="等级" width="56" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.grade" size="small" effect="plain" :style="gradeChipStyle(row.grade)">{{ row.grade }}</el-tag>
                <span v-else>--</span>
              </template>
            </el-table-column>
            <el-table-column label="综合得分" width="84" align="center">
              <template #default="{ row }">{{ formatScore(row.score) }} 分</template>
            </el-table-column>
            <el-table-column label="扣分合计" width="84" align="center">
              <template #default="{ row }">{{ formatScore(row.deduct_total) }} 分</template>
            </el-table-column>
            <el-table-column label="操作" width="96" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openDetail(row)">扣分明细</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="otherRows.length > PAGE_SIZE" class="pager">
            <el-pagination
              v-model:current-page="page"
              background
              layout="total, prev, pager, next"
              :page-size="PAGE_SIZE"
              :total="otherRows.length"
            />
          </div>
        </section>
      </div>

      <el-drawer v-model="drawerVisible" :title="drawerRow ? `${drawerRow.project_name} · 扣分明细` : '扣分明细'" size="980px">
        <template v-if="drawerRow">
          <p class="drawer-score">
            综合得分 {{ formatScore(drawerRow.score) }} 分
            <el-tag v-if="drawerRow.grade" size="small" effect="plain" :style="gradeChipStyle(drawerRow.grade)">{{ drawerRow.grade }}</el-tag>
          </p>
          <el-table :data="drawerRow.lines" stripe border empty-text="暂无指标">
            <el-table-column label="指标" min-width="130" prop="indicator_name" />
            <el-table-column label="指标值" min-width="110">
              <template #default="{ row }">{{ formatValue(row) }}</template>
            </el-table-column>
            <el-table-column label="是否涉及" width="90" align="center">
              <template #default="{ row }">{{ row.involved ? '涉及' : '不涉及' }}</template>
            </el-table-column>
            <el-table-column label="扣分上限" width="90" align="center">
              <template #default="{ row }">{{ formatScore(row.cap) }} 分</template>
            </el-table-column>
            <el-table-column label="本项扣分" width="90" align="center">
              <template #default="{ row }">{{ formatScore(row.deduct) }} 分</template>
            </el-table-column>
            <el-table-column label="原始指标" min-width="300" prop="raw_text" class-name="raw-cell" />
          </el-table>
        </template>
      </el-drawer>
    </template>

    <template v-else>
      <el-empty v-if="!mine.included" :image-size="150" description="该项目不参与信息化考核评分" />
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
          <el-table-column label="指标" min-width="150" prop="indicator_name" />
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
          <el-table-column label="原始指标" min-width="280" prop="raw_text" class-name="raw-cell" />
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
.rank-layout { display: flex; gap: 16px; align-items: stretch; flex-wrap: wrap; }
.podium-panel {
  flex: 0 0 calc(50% - 8px);
  width: calc(50% - 8px);
  box-sizing: border-box;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: linear-gradient(180deg, #fdfaf6 0%, #ffffff 100%);
  padding: 16px;
}
.podium { display: flex; align-items: flex-end; gap: 12px; min-height: 360px; }
.podium-item { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 8px; }
.podium-card {
  width: 100%;
  text-align: center;
  padding: 16px 10px;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.podium-card:hover { box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); transform: translateY(-2px); }
.podium-medal {
  width: 40px;
  height: 40px;
  line-height: 40px;
  margin: 0 auto 8px;
  border-radius: 50%;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}
.is-rank-1 .podium-medal { background: #e6b800; }
.is-rank-2 .podium-medal { background: #9aa4b2; }
.is-rank-3 .podium-medal { background: #c07a3e; }
.podium-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.podium-score { margin: 4px 0; font-size: 24px; font-weight: 700; color: var(--ap-primary, #91003d); }
.podium-grade-empty { font-size: 12px; color: var(--ap-text-muted, #909399); }
.podium-placeholder { width: 100%; }
.podium-base {
  width: 100%;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}
.is-rank-1 .podium-base { height: 150px; background: linear-gradient(180deg, #f6c945, #e0a800); }
.is-rank-2 .podium-base { height: 116px; background: linear-gradient(180deg, #cbd3dd, #9aa4b2); }
.is-rank-3 .podium-base { height: 90px; background: linear-gradient(180deg, #d99a62, #b0703a); }
.list-panel { flex: 1 1 0; min-width: 0; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
:deep(.raw-cell) { white-space: normal; line-height: 1.45; overflow-wrap: break-word; word-break: normal; }
</style>
