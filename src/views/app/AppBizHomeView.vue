<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  hydrateAppSession,
  listAppUserOrgs,
  setAppSelectedOrgId,
  getAppSelectedOrg,
} from '../../mock/appSession.js'

const router = useRouter()
const orgOptions = ref([])
const selectedOrgId = ref('')

onMounted(() => {
  hydrateAppSession()
  orgOptions.value = listAppUserOrgs()
  const cur = getAppSelectedOrg()
  selectedOrgId.value = cur.id || orgOptions.value[0]?.id || ''
  if (selectedOrgId.value) setAppSelectedOrgId(selectedOrgId.value)
})

const selectedOrgName = computed(() => {
  const hit = orgOptions.value.find((o) => o.id === selectedOrgId.value)
  return hit?.orgName || '请选择组织'
})

function onOrgChange() {
  setAppSelectedOrgId(selectedOrgId.value)
}

const entries = [
  { key: 'video', title: '视频中心', path: '/app/video', icon: '📹' },
  { key: 'tasks', title: '巡检管理', path: '/app/tasks', icon: '📋' },
  { key: 'rectify', title: '整改复查', path: '/app/rectify', icon: '🔧' },
  { key: 'mat-entry', title: '材料设备进场', path: '/app/mat/entry', icon: '📦' },
  { key: 'mat-exit', title: '材料设备退场', path: '/app/mat/exit', icon: '🚚' },
]

function openEntry(item) {
  router.push(item.path)
}
</script>

<template>
  <div class="biz-page">
    <header class="mobile-header">
      <h1>业务功能</h1>
    </header>

    <section class="org-bar">
      <label class="org-label">组织名称</label>
      <div class="org-select-wrap">
        <select v-model="selectedOrgId" class="org-select" @change="onOrgChange">
          <option v-for="org in orgOptions" :key="org.id" :value="org.id">
            {{ org.orgName }}
          </option>
        </select>
        <span class="org-caret" aria-hidden="true">▾</span>
      </div>
      <p class="org-hint">当前：{{ selectedOrgName }}</p>
    </section>

    <main class="entry-grid">
      <button
        v-for="item in entries"
        :key="item.key"
        type="button"
        class="grid-item"
        @click="openEntry(item)"
      >
        <span class="grid-icon">{{ item.icon }}</span>
        <span class="grid-title">{{ item.title }}</span>
      </button>
    </main>
  </div>
</template>

<style scoped>
.biz-page {
  min-height: 100%;
  background: #f4f5f7;
}
.mobile-header {
  padding: 28px 36px;
  background: #8f0045;
  color: #fff;
}
.mobile-header h1 {
  margin: 0;
  font-size: 40px;
  text-align: center;
  font-weight: 600;
}
.org-bar {
  margin: 24px;
  padding: 28px;
  background: #fff;
  border-radius: 20px;
}
.org-label {
  display: block;
  font-size: 26px;
  color: #909399;
  margin-bottom: 12px;
}
.org-select-wrap {
  position: relative;
}
.org-select {
  width: 100%;
  height: 88px;
  padding: 0 72px 0 28px;
  border: 1px solid #e4e7ed;
  border-radius: 16px;
  background: #fafafa;
  font-size: 30px;
  color: #1f2329;
  appearance: none;
  -webkit-appearance: none;
}
.org-select:focus {
  outline: none;
  border-color: #8f0045;
}
.org-caret {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%);
  color: #909399;
  font-size: 28px;
  pointer-events: none;
}
.org-hint {
  margin: 16px 0 0;
  font-size: 24px;
  color: #a8abb2;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  padding: 8px 24px 40px;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 220px;
  border: none;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  padding: 24px 12px;
}
.grid-item:active {
  background: #fce8f0;
}
.grid-icon {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  background: #fce8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
}
.grid-title {
  font-size: 26px;
  color: #1f2329;
  text-align: center;
  line-height: 1.35;
  font-weight: 500;
}
</style>
