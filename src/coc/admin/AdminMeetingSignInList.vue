<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { buildProjects } from '../mock/data.js'
import { todayYmd } from '../mock/dutyScreenData.js'
import {
  buildDutyMeetingRecord,
  ensureDutyMeetingRecordSeeds,
  isDutyMeetingActive,
  onDutyJoinChange,
} from '../utils/dutyMeetingAttendanceStorage.js'
import { getMeetingSignInRecords } from '../utils/meetingSignInStorage.js'

defineProps({
  title: { type: String, default: '会议记录' },
  description: {
    type: String,
    default:
      '指挥部会议记录：会议时间、本次调度项目，以及各项目值班人员的已参会 / 未参会清单（数据源：大屏「项目值班」人员参会标注）。',
  },
})

const date = todayYmd()
const dateFilter = ref('')
const projectKeyword = ref('')
const liveRecord = ref(null)
const history = ref([])
const detailVisible = ref(false)
const current = ref(null)
let offChange = null

/** 进行中的会议记录（实时读取大屏参会标注）+ 历史已结束记录 */
const list = computed(() => [liveRecord.value, ...history.value].filter(Boolean))

const filtered = computed(() => {
  let rows = list.value
  const dateQ = dateFilter.value
  if (dateQ) {
    rows = rows.filter((row) =>
      [row.date, row.meetingTime, row.endedAt, row.meetingPeriod].some((f) =>
        String(f || '').includes(dateQ),
      ),
    )
  }
  const projectQ = projectKeyword.value.trim()
  if (projectQ) {
    rows = rows.filter((row) => {
      const projectText = (row.dispatchProjects || []).join('、')
      return String(projectText).includes(projectQ)
    })
  }
  return rows
})

/** 会议进行中：实时展示当日值班人员参会情况；会议结束后只留已落库的历史记录 */
function load() {
  history.value = getMeetingSignInRecords()
  liveRecord.value = isDutyMeetingActive(date)
    ? buildDutyMeetingRecord({
        projects: buildProjects(),
        date,
        ongoing: true,
      })
    : null
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function meetingPeriodText(row) {
  if (row?.ongoing) return `${row.date || date} · 会议进行中`
  return row?.meetingPeriod || row?.meetingTime || '—'
}

function projectsText(row) {
  const names = row.dispatchProjects || []
  return names.length ? names.join('、') : '—'
}

onMounted(() => {
  // 演示：台账为空时补几场历史会议记录（口径同「结束会议」，人员取自当日值班）
  ensureDutyMeetingRecordSeeds({ projects: buildProjects() })
  load()
  offChange = onDutyJoinChange(load)
})

onUnmounted(() => {
  if (typeof offChange === 'function') offChange()
})
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-date-picker
          v-model="dateFilter"
          type="date"
          placeholder="会议日期"
          value-format="YYYY-MM-DD"
          clearable
          class="date-filter"
          aria-label="会议日期"
        />
        <el-input
          v-model="projectKeyword"
          placeholder="搜索调度项目…"
          clearable
          class="search-input"
          aria-label="搜索调度项目…"
        />
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无会议记录" @row-click="openDetail">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column label="会议时间" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ meetingPeriodText(row) }}
          </template>
        </el-table-column>
        <el-table-column label="调度项目" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ projectsText(row) }}
          </template>
        </el-table-column>
        <el-table-column label="已参会" width="90" align="center">
          <template #default="{ row }">
            {{ row.attendeeTotal || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="未参会" width="90" align="center">
          <template #default="{ row }">
            {{ row.absenteeTotal || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="row.ongoing ? 'warning' : 'info'" size="small" effect="plain">
              {{ row.ongoing ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="detailVisible"
      title="会议记录详情"
      width="820px"
      class="meeting-detail-dialog"
      destroy-on-close
    >
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="会议时间" :span="2">
            {{ meetingPeriodText(current) }}
          </el-descriptions-item>
          <el-descriptions-item label="已参会合计">
            {{ current.attendeeTotal || 0 }} 人
          </el-descriptions-item>
          <el-descriptions-item label="未参会合计">
            {{ current.absenteeTotal || 0 }} 人
          </el-descriptions-item>
          <el-descriptions-item label="调度项目" :span="2">
            {{ projectsText(current) }}
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-for="group in current.projectGroups || []"
          :key="group.projectId || group.projectName"
          class="project-block"
        >
          <div class="block-label">
            {{ group.projectName || '—' }} · 参会人员清单
            <span class="block-count">
              已参会 {{ group.attendeeCount ?? (group.attendees || []).length }} ·
              未参会 {{ group.absenteeCount ?? (group.absentees || []).length }}
            </span>
          </div>
          <el-table
            :data="group.attendees || []"
            stripe
            border
            size="small"
            empty-text="该项目无已参会人员"
          >
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column prop="role" label="岗位" min-width="120" />
            <el-table-column label="班次" width="80">
              <template #default="{ row }">{{ row.shift || '--' }}</template>
            </el-table-column>
            <el-table-column label="角色" width="80">
              <template #default="{ row }">{{ row.partyRole || '--' }}</template>
            </el-table-column>
            <el-table-column prop="joinTime" label="参会时间" width="100">
              <template #default="{ row }">{{ row.joinTime || '--' }}</template>
            </el-table-column>
          </el-table>
          <el-table
            v-if="(group.absentees || []).length"
            class="absentee-table"
            :data="group.absentees"
            stripe
            border
            size="small"
          >
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="name" label="未参会人员" min-width="100" />
            <el-table-column prop="role" label="岗位" min-width="120" />
            <el-table-column label="班次" width="80">
              <template #default="{ row }">{{ row.shift || '--' }}</template>
            </el-table-column>
            <el-table-column label="角色" width="80">
              <template #default="{ row }">{{ row.partyRole || '--' }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" min-width="110">
              <template #default="{ row }">{{ row.reason || '--' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 0;
}

.simple-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.date-filter {
  width: 150px;
}

.search-input {
  width: 220px;
  max-width: 40vw;
}

.page-body {
  padding-top: 4px;
}

.page-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ap-text-secondary, #909399);
  line-height: 1.5;
}

.project-block {
  margin-top: 16px;
}

.block-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text-primary, #303133);
}

.block-count {
  margin-left: 8px;
  font-weight: 400;
  font-size: 12px;
  color: var(--ap-text-secondary, #909399);
}

.absentee-table {
  margin-top: 8px;
}

.meeting-detail-dialog :deep(.el-dialog__body) {
  max-height: 62vh;
  overflow: auto;
}
</style>
