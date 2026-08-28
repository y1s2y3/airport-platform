<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { label: '进场申请', path: '/mobile/mat/entry' },
  { label: '退场登记', path: '/mobile/mat/exit' },
]

function isActive(path) {
  if (path === '/mobile/mat/entry') {
    return route.path === path || route.path.startsWith('/mobile/mat/entry/')
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

function go(path) {
  if (isActive(path)) return
  router.push(path)
}
</script>

<template>
  <nav class="sub-nav" aria-label="材料设备进场移动端导航">
    <button
      v-for="tab in tabs"
      :key="tab.path"
      type="button"
      class="sub-nav-item"
      :class="{ active: isActive(tab.path) }"
      @click="go(tab.path)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.sub-nav {
  display: flex;
  gap: 8px;
  margin: 10px 16px 0;
  padding: 4px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.sub-nav-item {
  flex: 1;
  border: none;
  background: transparent;
  color: #666;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.sub-nav-item.active {
  background: #8f0045;
  color: #fff;
  font-weight: 600;
}
</style>
