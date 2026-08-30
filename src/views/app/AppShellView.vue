<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appLoggedIn, hydrateAppSession } from '../../mock/appSession.js'
import AppPhoneFrame from './AppPhoneFrame.vue'

hydrateAppSession()

const route = useRoute()
const router = useRouter()

const hideTabBar = computed(() => !!route.meta?.hideTabBar)
const tabBarH = 96

const tabs = [
  { key: 'personal', label: '个人中心', path: '/app/personal' },
  { key: 'biz', label: '业务功能', path: '/app/biz' },
  { key: 'mine', label: '我的', path: '/app/mine' },
]

const activeKey = computed(() => {
  const p = route.path
  if (p.startsWith('/app/mine')) return 'mine'
  if (p.startsWith('/app/biz') || route.meta?.appBiz) return 'biz'
  if (route.meta?.appPersonal || p.startsWith('/app/personal') || p.startsWith('/app/todo') || p.startsWith('/app/warning')) {
    return 'personal'
  }
  return 'personal'
})

function goTab(tab) {
  if (!appLoggedIn.value) {
    router.replace('/app/login')
    return
  }
  router.push(tab.path)
}
</script>

<template>
  <AppPhoneFrame :bottom-pad="hideTabBar ? 0 : tabBarH">
    <div class="shell-body">
      <router-view />
    </div>
    <nav v-if="!hideTabBar" class="tab-bar" aria-label="建管APP底部导航">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-item"
        :class="{ active: activeKey === tab.key }"
        @click="goTab(tab)"
      >
        <span class="tab-icon" aria-hidden="true">
          <template v-if="tab.key === 'personal'">◎</template>
          <template v-else-if="tab.key === 'biz'">▦</template>
          <template v-else>●</template>
        </span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </AppPhoneFrame>
</template>

<style scoped>
.shell-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f4f5f7;
}
.tab-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96px;
  display: flex;
  background: #fff;
  border-top: 1px solid #ebeef5;
  z-index: 20;
  box-sizing: border-box;
  padding-bottom: 12px;
}
.tab-item {
  flex: 1;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 22px;
  color: #909399;
  cursor: pointer;
}
.tab-item.active {
  color: #8f0045;
  font-weight: 600;
}
.tab-icon {
  font-size: 28px;
  line-height: 1;
}
</style>
