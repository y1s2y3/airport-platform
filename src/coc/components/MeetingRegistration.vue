<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildPersonPhotoUrl } from '../mock/data.js'

const props = defineProps({
  personnel: { type: Array, default: () => [] },
  embedded: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

function isAttendee(person) {
  return person.jobType === '管理'
}

function personPhoto(item) {
  return item.photo || buildPersonPhotoUrl(item.name, item.id?.length || 0)
}

function personRole(item) {
  return item.role || item.position || '—'
}

function formatTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

const entries = ref([])

function initEntries(list) {
  const attendees = list.filter(isAttendee)
  const now = formatTime()
  entries.value = attendees.map((person) => ({
    ...person,
    joined: true,
    joinTime: now,
  }))
}

watch(
  () => props.personnel,
  (list) => initEntries(list || []),
  { immediate: true },
)

const sortedEntries = computed(() => {
  const joined = entries.value.filter((item) => item.joined)
  const pending = entries.value.filter((item) => !item.joined)
  return [...joined, ...pending]
})

const joinedCount = computed(() => entries.value.filter((item) => item.joined).length)

function markAbsent(id) {
  const item = entries.value.find((entry) => entry.id === id)
  if (!item || !item.joined) return
  item.joined = false
  item.joinTime = null
  ElMessage.info(`${item.name} 已标记为未参会`)
}

function markJoined(id) {
  const item = entries.value.find((entry) => entry.id === id)
  if (!item || item.joined) return
  item.joined = true
  item.joinTime = formatTime()
  ElMessage.success(`${item.name} 已登记参会`)
}
</script>

<template>
  <div
    class="meeting-registration-root"
    :class="{ embedded, compact }"
  >
    <div class="panel-card meeting-panel" :class="{ 'is-embedded': embedded }">
      <div class="panel-title compact title-left">
        <span>参会人员</span>
        <span class="head-meta">
          <span class="count-tag">已参会 {{ joinedCount }}/{{ entries.length }}</span>
        </span>
      </div>
      <div class="panel-body scroll-body">
      <div v-if="!entries.length" class="empty-state">
        <p>暂无管理人员</p>
      </div>
      <table v-else class="attendee-table">
        <thead>
          <tr>
            <th class="col-idx">序号</th>
            <th>人员</th>
            <th class="col-status">参会状态</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in sortedEntries"
            :key="item.id"
            :class="{ 'row-absent': !item.joined }"
          >
            <td class="col-idx">{{ idx + 1 }}</td>
            <td class="person-cell">
              <div class="person-info">
                <el-image
                  :src="personPhoto(item)"
                  fit="cover"
                  class="person-thumb"
                  :preview-src-list="[personPhoto(item)]"
                  preview-teleported
                  hide-on-click-modal
                />
                <div class="person-text">
                  <div class="person-name">{{ item.name }}</div>
                  <div class="person-role">{{ personRole(item) }}</div>
                </div>
              </div>
            </td>
            <td class="col-status">
              <span class="status-tag" :class="item.joined ? 'joined' : 'absent'">
                {{ item.joined ? '已参会' : '未参会' }}
              </span>
            </td>
            <td class="col-action">
              <el-button
                v-if="item.joined"
                link
                type="danger"
                @click="markAbsent(item.id)"
              >
                移除
              </el-button>
              <el-button
                v-else
                link
                type="primary"
                @click="markJoined(item.id)"
              >
                参会
              </el-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  </div>
</template>

<style scoped>
.meeting-registration-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.meeting-registration-root.embedded {
  flex: 1;
  min-height: 0;
}

.meeting-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.meeting-panel.is-embedded {
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  box-shadow: none;
  background: #fff;
}

.meeting-registration-root.compact .panel-title.compact.title-left {
  font-size: calc(12px + var(--coc-font-boost));
  padding: 6px 10px;
  gap: 8px;
}

.meeting-registration-root.compact .count-tag {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 2px 8px;
}

.meeting-registration-root.compact .attendee-table {
  font-size: calc(11px + var(--coc-font-boost));
}

.meeting-registration-root.compact .attendee-table th,
.meeting-registration-root.compact .attendee-table td {
  padding: 8px 8px;
}

.meeting-registration-root.compact .col-idx {
  width: 40px;
}

.meeting-registration-root.compact .col-status {
  width: 72px;
}

.meeting-registration-root.compact .col-action {
  width: 52px;
}

.meeting-registration-root.compact .person-thumb {
  width: 32px;
  height: 40px;
}

.meeting-registration-root.compact .person-name {
  font-size: calc(11px + var(--coc-font-boost));
}

.meeting-registration-root.compact .person-role {
  font-size: calc(10px + var(--coc-font-boost));
}

.meeting-registration-root.compact .empty-state {
  min-height: 80px;
  font-size: calc(12px + var(--coc-font-boost));
}

.panel-title.compact.title-left {
  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
  gap: 12px;
}

.head-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.count-tag {
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
  padding: 3px 10px;
  border-radius: 20px;
}

.scroll-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 !important;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
}

.attendee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(12px + var(--coc-font-boost));
}

.attendee-table th,
.attendee-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--coc-border);
  text-align: left;
  vertical-align: middle;
}

.attendee-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #faf8f6;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.col-idx {
  width: 44px;
  text-align: center;
}

.col-status {
  width: 72px;
  white-space: nowrap;
}

.col-action {
  width: 52px;
  text-align: center;
  white-space: nowrap;
}

.person-cell {
  min-width: 0;
}

.person-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.person-thumb {
  width: 32px;
  height: 42px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid var(--coc-border);
  cursor: zoom-in;
  overflow: hidden;
  background: #f5f5f5;
}

.person-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
}

.person-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.person-name {
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-role {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-absent td {
  background: rgba(144, 147, 153, 0.04);
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
}

.status-tag.joined {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.status-tag.absent {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}
</style>
