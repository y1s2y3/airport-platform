<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
})

const rows = computed(() => {
  const list = [...props.projects]
    .filter((p) => p.status === '在建')
    .sort((a, b) => b.onSiteWorkers - a.onSiteWorkers)
    .slice(0, 6)

  const max = list[0]?.onSiteWorkers || 1

  return list.map((p) => ({
    id: p.id,
    name: p.shortName || p.name,
    fullName: p.name,
    value: p.onSiteWorkers,
    pct: Math.max(6, Math.round((p.onSiteWorkers / max) * 100)),
  }))
})
</script>

<template>
  <div class="panel-card compare-panel">
    <div class="panel-title compact title-left">
      <span>项目人数对比</span>
    </div>
    <div class="panel-body compare-body">
      <ul v-if="rows.length" class="compare-list">
        <li v-for="row in rows" :key="row.id" class="compare-row">
          <span class="compare-name" :title="row.fullName">{{ row.name }}</span>
          <div class="compare-bar-track">
            <div class="compare-bar" :style="{ width: `${row.pct}%` }" />
          </div>
          <span class="compare-value">{{ row.value.toLocaleString() }}</span>
        </li>
      </ul>
      <div v-else class="compare-empty">暂无在建项目数据</div>
    </div>
  </div>
</template>

<style scoped>
.compare-panel {
  flex: 1;
  min-height: 0;
}

.panel-title.compact.title-left {
  font-size: 18px;
  justify-content: flex-start;
}

.compare-body {
  padding: 10px 12px 12px !important;
  min-height: 0;
  overflow: hidden;
}

.compare-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 6px;
  margin: 0;
  padding: 0;
}

.compare-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}

.compare-name {
  flex: 0 0 46%;
  max-width: 46%;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--coc-text);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-bar-track {
  flex: 1;
  min-width: 36px;
  height: 20px;
  background: #f0f2f5;
  border-radius: 6px;
  overflow: hidden;
}

.compare-bar {
  height: 100%;
  min-width: 4px;
  border-radius: 6px;
  background: linear-gradient(90deg, #c97b63 0%, #e8b4a0 100%);
  transition: width 0.35s ease;
}

.compare-value {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--coc-text);
  min-width: 34px;
  text-align: right;
}

.compare-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--coc-text-muted);
  font-size: 13px;
}
</style>
