<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const cameras = [
  { id: 'cam-1', name: 'T3 东侧场面', status: '在线' },
  { id: 'cam-2', name: '卫星厅南门', status: '在线' },
  { id: 'cam-3', name: '材料堆场 A', status: '离线' },
  { id: 'cam-4', name: '临电配电间', status: '在线' },
]

function goBack() {
  router.push('/app/biz')
}
</script>

<template>
  <div class="video-page">
    <header class="mobile-header">
      <button type="button" class="back" @click="goBack">‹</button>
      <h1>视频中心</h1>
      <span class="spacer" />
    </header>
    <p class="tip">演示占位：展示本项目关联监控点位列表</p>
    <main class="cam-list">
      <article v-for="cam in cameras" :key="cam.id" class="cam-card">
        <div class="preview">视频预览区</div>
        <div class="cam-meta">
          <strong>{{ cam.name }}</strong>
          <span :class="['dot', cam.status === '在线' ? 'on' : 'off']">{{ cam.status }}</span>
        </div>
      </article>
    </main>
  </div>
</template>

<style scoped>
.video-page {
  min-height: 100%;
  background: #f4f5f7;
}
.mobile-header {
  display: flex;
  align-items: center;
  padding: 24px 16px;
  background: #8f0045;
  color: #fff;
}
.back {
  width: 72px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 56px;
  line-height: 1;
}
.mobile-header h1 {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 36px;
}
.spacer {
  width: 72px;
}
.tip {
  margin: 20px 28px;
  font-size: 24px;
  color: #909399;
}
.cam-list {
  padding: 0 24px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.cam-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
}
.preview {
  height: 280px;
  background: linear-gradient(135deg, #2c3e50, #4a5568);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
.cam-meta {
  display: flex;
  justify-content: space-between;
  padding: 24px 28px;
  font-size: 28px;
}
.dot.on {
  color: #67c23a;
}
.dot.off {
  color: #909399;
}
</style>
