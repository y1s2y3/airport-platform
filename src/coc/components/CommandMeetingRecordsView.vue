<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'
import { COMMAND_MEETING_HISTORY } from '../mock/data.js'

const emit = defineEmits(['back'])
</script>

<template>
  <main class="meeting-records-layout">
    <div class="detail-topbar panel-card">
      <div class="topbar-row">
        <button class="back-btn" type="button" @click="emit('back')">
          <el-icon :size="16"><ArrowLeft /></el-icon>
          返回
        </button>
        <span class="detail-heading">调度指挥会议 · 会议记录</span>
      </div>
    </div>

    <div class="panel-card records-panel">
      <div class="panel-title compact">历史会议</div>
      <div class="panel-body records-body">
        <div v-for="item in COMMAND_MEETING_HISTORY" :key="item.id" class="record-card">
          <div class="record-head">
            <span class="record-title">{{ item.title }}</span>
            <span class="record-duration">{{ item.duration }}</span>
          </div>
          <div class="record-meta">
            <span>{{ item.startTime }}</span>
            <span>主持：{{ item.host }}</span>
            <span>已入会 {{ item.joinedCount }} · 未入会 {{ item.pendingCount }}</span>
          </div>
          <p class="record-summary">{{ item.summary }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.meeting-records-layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 16px 28px 20px;
  gap: 14px;
}

.detail-topbar {
  flex-shrink: 0;
  padding: 16px 24px;
}

.topbar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--coc-text-secondary);
}

.back-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.detail-heading {
  font-size: 18px;
  font-weight: 700;
  color: var(--coc-text);
}

.records-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact {
  font-size: 16px;
}

.records-body {
  padding: 16px 20px !important;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  padding: 14px 16px;
  border: 1px solid var(--coc-border);
  border-radius: 10px;
  background: #faf8f6;
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.record-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--coc-text);
}

.record-duration {
  font-size: 12px;
  color: var(--coc-accent);
  font-weight: 600;
  flex-shrink: 0;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 12px;
  color: var(--coc-text-secondary);
  margin-bottom: 8px;
}

.record-summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--coc-text);
}
</style>
