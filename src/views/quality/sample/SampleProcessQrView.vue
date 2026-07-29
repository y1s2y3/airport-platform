<script setup>
import './sample-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProcessDetail } from '../../../mock/sample.js'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.query.id || '')
const detail = computed(() => (id.value ? getProcessDetail(id.value) : null))
</script>

<template>
  <div class="qm-page page-card qr-page">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 工序样板二维码内容</div>
      <h1 class="page-title">工序样板标准（扫码查看）</h1>
      <p class="page-tip">仅展示交底与样板资料，不记录学习 / 签到</p>
    </div>

    <el-empty v-if="!detail" description="内容不存在" />
    <el-empty
      v-else-if="detail.status !== 'approved' || !detail.qr_code"
      description="该工序样板尚未赋码或未通过审批"
    />

    <template v-else>
      <div class="qr-card">
        <div class="qr-code-box">
          <div class="qr-fake">{{ detail.qr_code }}</div>
          <p class="qr-hint">演示二维码标识</p>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="工序名称">{{ detail.process_name }}</el-descriptions-item>
          <el-descriptions-item label="使用部位">{{ detail.use_part }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
          <el-descriptions-item label="技术交底">{{ detail.briefing_content }}</el-descriptions-item>
          <el-descriptions-item label="样板照片">
            {{ detail.photo_files?.length ? detail.photo_files.join('、') : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="样板视频">
            {{ detail.video_files?.length ? detail.video_files.join('、') : '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="form-actions">
        <el-button @click="router.back()">返回</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qr-card {
  display: grid;
  gap: 16px;
  max-width: 720px;
}

.qr-code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-fake {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #303133;
  background: repeating-linear-gradient(
    45deg,
    #f5f7fa,
    #f5f7fa 8px,
    #e4e7ed 8px,
    #e4e7ed 16px
  );
  font-weight: 700;
  font-size: 13px;
  text-align: center;
  padding: 8px;
  word-break: break-all;
}

.qr-hint {
  margin: 0;
  font-size: 12px;
  color: #909399;
}
</style>
