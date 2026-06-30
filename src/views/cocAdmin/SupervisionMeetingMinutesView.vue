<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, View } from '@element-plus/icons-vue'
import { getSupervisionMeetings, addSupervisionMeeting } from '../../utils/cocAdminDeviceStorage.js'

defineProps({
  title: { type: String, default: '监理会议纪要' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) =>
    [row.title, row.project, row.fileName, row.status].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getSupervisionMeetings()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function handleUpload(uploadFile) {
  const fileName = uploadFile.name || '监理会议纪要'
  addSupervisionMeeting({ fileName, title: fileName.replace(/\.[^.]+$/, '') })
  load()
  ElMessage.success('会议纪要已上传，系统正在识别归档隐患数据')
  return false
}

function statusTagType(status) {
  if (status === '已归档') return 'success'
  if (status === '识别中') return 'warning'
  return 'info'
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-input v-model="keyword" placeholder="搜索标题、项目、文件名…" clearable class="search-input" />
        <el-upload :show-file-list="false" accept=".pdf,.doc,.docx" :before-upload="handleUpload">
          <el-button type="primary" :icon="Upload">上传纪要</el-button>
        </el-upload>
      </div>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无监理会议纪要">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="title" label="会议标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="project" label="识别项目" width="120" />
        <el-table-column prop="fileName" label="文件" min-width="180" show-overflow-tooltip />
        <el-table-column prop="hazardCount" label="隐患条数" width="96" align="center" />
        <el-table-column prop="uploadTime" label="上传时间" width="148" />
        <el-table-column prop="status" label="状态" width="96">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="detailVisible" title="监理会议纪要详情" width="560px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="会议标题">{{ current.title }}</el-descriptions-item>
          <el-descriptions-item label="识别项目">{{ current.project }}</el-descriptions-item>
          <el-descriptions-item label="文件名称">{{ current.fileName }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ current.uploadTime }}</el-descriptions-item>
          <el-descriptions-item label="归档状态">
            <el-tag :type="statusTagType(current.status)" size="small">{{ current.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="识别隐患">{{ current.hazardCount }} 条</el-descriptions-item>
        </el-descriptions>
        <p class="detail-tip">系统将根据会议标题自动识别项目并归档安全质量隐患数据，识别完成后可关联隐患库检索。</p>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #909399;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.search-input {
  width: 240px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.detail-tip {
  margin: 16px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #909399;
}
</style>
