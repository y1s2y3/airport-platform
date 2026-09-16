<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ensureMeetingSignInSeed,
  getMeetingSignInRecords,
  onMeetingSignInChange,
} from '../utils/meetingSignInStorage.js'

defineProps({
  title: { type: String, default: '会议记录' },
  description: {
    type: String,
    default:
      '指挥部会议签到台账：记录会议时间、本次调度项目及各项目参会结束时的已参会人员清单。',
  },
})

const keyword = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)
let offChange = null

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) => {
    const projectText = (row.dispatchProjects || []).join('、')
    const peopleText = (row.projectGroups || [])
      .flatMap((g) => (g.attendees || []).map((a) => a.name))
      .join('、')
    return [row.id, row.meetingTime, row.endedAt, row.meetingPeriod, projectText, peopleText].some(
      (f) => String(f || '').includes(q),
    )
  })
})

function load() {
  list.value = getMeetingSignInRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function meetingPeriodText(row) {
  return row?.meetingPeriod || row?.meetingTime || '—'
}

function projectsText(row) {
  const names = row.dispatchProjects || []
  return names.length ? names.join('、') : '—'
}

onMounted(() => {
  ensureMeetingSignInSeed()
  load()
  offChange = onMeetingSignInChange(load)
})

onUnmounted(() => {
  if (typeof offChange === 'function') offChange()
})
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <el-input
        v-model="keyword"
        placeholder="搜索会议时间、调度项目…"
        clearable
        class="search-input"
        aria-label="搜索会议时间、调度项目…"
      />
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
        <el-table-column label="已参会人数" width="100" align="center">
          <template #default="{ row }">
            {{ row.attendeeTotal || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="会议记录详情" width="780px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="会议时间">
            {{ meetingPeriodText(current) }}
          </el-descriptions-item>
          <el-descriptions-item label="调度项目">
            {{ projectsText(current) }}
          </el-descriptions-item>
          <el-descriptions-item label="已参会合计">
            {{ current.attendeeTotal || 0 }} 人
          </el-descriptions-item>
        </el-descriptions>

        <div
          v-for="group in current.projectGroups || []"
          :key="group.projectId || group.projectName"
          class="project-block"
        >
          <div class="block-label">{{ group.projectName || '—' }} · 参会人员清单</div>
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
}

.search-input {
  width: 280px;
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
</style>
