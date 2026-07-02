<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'
import ProjectGantt from './ProjectGantt.vue'

defineProps({
  project: { type: Object, required: true },
})

const emit = defineEmits(['back'])
</script>

<template>
  <main class="progress-detail-layout">
    <div class="detail-topbar panel-card">
      <div class="topbar-row">
        <button class="back-btn" type="button" @click="emit('back')">
          <el-icon :size="16"><ArrowLeft /></el-icon>
          返回
        </button>
        <div class="detail-heading-wrap">
          <span class="detail-heading">项目进度 · 控制性计划甘特图</span>
          <span class="detail-sub" :title="project.name">
            {{ project.shortName || project.name }}
          </span>
        </div>
      </div>
    </div>

    <div class="panel-card gantt-panel">
      <div class="panel-body gantt-body">
        <ProjectGantt :project="project" expanded />
      </div>
    </div>
  </main>
</template>

<style scoped>
.progress-detail-layout {
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
  font-size: calc(13px + var(--coc-font-boost));
  cursor: pointer;
  color: var(--coc-text-secondary);
}

.back-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.detail-heading-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-heading {
  font-size: calc(18px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.detail-sub {
  font-size: calc(13px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gantt-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.gantt-body {
  flex: 1;
  min-height: 0;
  padding: 14px 18px !important;
}
</style>
