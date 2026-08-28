<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getCocAdminItem } from '../../config/menu.js'
import { ensureDailyWorkSeed } from '../../coc/utils/dailyWorkStorage.js'
import { ensureDispatchMeetingSeed } from '../../coc/utils/dispatchMeetingStorage.js'
import { ensureMonitorGroupSeed } from '../../coc/utils/monitorAdminStorage.js'
import { ensureRedBlackBoardSeed } from '../../coc/utils/redBlackBoardStorage.js'
import '../../coc/admin/admin.css'
import '../../coc/admin/admin-video.css'

onMounted(() => {
  ensureDailyWorkSeed()
  ensureDispatchMeetingSeed()
  ensureMonitorGroupSeed()
  ensureRedBlackBoardSeed()
})

const route = useRoute()

const item = computed(() => getCocAdminItem(route.meta.cocAdminKey))
</script>

<template>
  <div v-if="item" class="coc-admin-page">
    <div v-if="item.roles?.length" class="role-bar">
      <span class="role-label">适用角色</span>
      <el-tag v-for="role in item.roles" :key="role" size="small" type="info">{{ role }}</el-tag>
    </div>
    <component :is="item.component" :title="item.label" :description="item.description" />
  </div>
</template>

<style scoped>
.coc-admin-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  background: #fafafa;
}

.role-label {
  font-size: 13px;
  color: var(--ap-text-secondary, #909399);
}
</style>
