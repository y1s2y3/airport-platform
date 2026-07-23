<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDispatchMeetingRecords } from '../utils/dispatchMeetingStorage.js'

defineProps({
  title: { type: String, default: '会议记录' },
  description: {
    type: String,
    default:
      '记录调度会议/监理例会纪要，支持AI语音转写、安全质量内容自动摘取及与项目关联检索。',
  },
})

const keyword = ref('')
const list = ref([])
const detailVisible = ref(false)
const recordingVisible = ref(false)
const transcriptVisible = ref(false)
const current = ref(null)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((item) =>
    [item.title, item.host, item.minutes, ...(item.attendees || [])]
      .some((field) => String(field || '').includes(q)),
  )
})

const currentTranscript = computed(() => current.value?.transcript || [])

function load() {
  list.value = getDispatchMeetingRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function openRecordingDialog() {
  if (!current.value?.hasRecording) {
    ElMessage.info('本次会议暂无录音文件')
    return
  }
  recordingVisible.value = true
}

function openTranscriptDialog() {
  if (!currentTranscript.value.length) {
    ElMessage.info('本次会议暂无对话资料')
    return
  }
  transcriptVisible.value = true
}

function downloadRecording() {
  ElMessage.success(`已开始下载：${current.value?.recordingFilename || '会议录音'}`)
}

function previewRecording() {
  ElMessage.info('演示环境暂不支持在线播放，请下载后在本地查看')
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <el-input
        v-model="keyword"
        placeholder="搜索会议名称、主持人、参会人…"
        clearable
        class="search-input"
      />
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无会议记录" @row-click="openDetail">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="title" label="会议名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="startTime" label="会议时间" width="148" />
        <el-table-column prop="duration" label="时长" width="80" />
        <el-table-column prop="host" label="主持人" width="96" />
        <el-table-column label="参会人" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ (row.attendees || []).slice(0, 3).join('、') }}
            <span v-if="(row.attendees || []).length > 3">等{{ row.joinedCount }}人</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="会议记录详情" width="860px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="会议名称" :span="2">{{ current.title }}</el-descriptions-item>
          <el-descriptions-item label="会议时间">{{ current.startTime }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ current.duration }}</el-descriptions-item>
          <el-descriptions-item label="主持人">{{ current.host }}</el-descriptions-item>
          <el-descriptions-item label="入会/未入会">
            已入会 {{ current.joinedCount }} · 未入会 {{ current.pendingCount }}
          </el-descriptions-item>
          <el-descriptions-item label="参会人员" :span="2">
            {{ (current.attendees || []).join('、') || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="material-bar">
          <span class="material-label">会议资料</span>
          <el-button size="small" :disabled="!current.hasRecording" @click="openRecordingDialog">
            录音文件
          </el-button>
          <el-button size="small" :disabled="!currentTranscript.length" @click="openTranscriptDialog">
            会议过程对话
          </el-button>
        </div>

        <div class="content-block">
          <div class="block-label">会议纪要</div>
          <div class="summary-content">{{ current.minutes }}</div>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="recordingVisible"
      title="录音文件"
      width="520px"
      append-to-body
      destroy-on-close
    >
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="文件名称">
            {{ current.recordingFilename || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="会议时长">{{ current.duration }}</el-descriptions-item>
          <el-descriptions-item label="录制时间">{{ current.startTime }}</el-descriptions-item>
          <el-descriptions-item v-if="current.recordingLocalPath" label="本地路径">
            {{ current.recordingLocalPath }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="recording-actions">
          <el-button type="primary" @click="previewRecording">在线播放</el-button>
          <el-button @click="downloadRecording">下载录音</el-button>
        </div>
        <p class="recording-tip">录音由会议 AI 实时采集生成，支持在线播放与本地归档下载。</p>
      </template>
    </el-dialog>

    <el-dialog
      v-model="transcriptVisible"
      title="会议过程对话"
      width="760px"
      append-to-body
      destroy-on-close
    >
      <div class="dialogue-scroll">
        <div
          v-for="(msg, idx) in currentTranscript"
          :key="idx"
          class="dialogue-item"
          :class="msg.role"
        >
          <span class="dlg-time">{{ msg.time }}</span>
          <span class="dlg-speaker">{{ msg.speaker }}</span>
          <span class="dlg-content">{{ msg.content }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 17px;
}

.search-input {
  width: 280px;
}

.page-body {
  padding: 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.material-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  background: #faf8f6;
}

.material-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text);
  margin-right: 4px;
}

.content-block {
  margin-top: 16px;
}

.block-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text);
  margin-bottom: 8px;
}

.summary-content {
  padding: 14px 16px;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  background: #faf8f6;
  font-size: 13px;
  line-height: 1.85;
  color: var(--coc-text);
  white-space: pre-wrap;
  max-height: 320px;
  overflow-y: auto;
}

.recording-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.recording-tip {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--coc-text-muted);
}

.dialogue-scroll {
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialogue-item {
  display: grid;
  grid-template-columns: 52px 88px 1fr;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  background: #faf8f6;
  border: 1px solid var(--coc-border);
}

.dialogue-item.ai,
.dialogue-item.speech {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.25);
}

.dlg-time {
  color: var(--coc-text-muted);
  font-size: 12px;
}

.dlg-speaker {
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.dlg-content {
  color: var(--coc-text);
  line-height: 1.6;
}
</style>
