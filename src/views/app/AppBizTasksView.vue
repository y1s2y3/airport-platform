<script setup>
import { useRouter } from 'vue-router'
import AppBizSubPage from './AppBizSubPage.vue'
import MobileTaskListView from '../mobile/MobileTaskListView.vue'

const router = useRouter()
/** APP 内页自带的顶栏被 AppBizSubPage 隐藏，这里在 APP 顶栏补一个“新建巡检”入口 */
function goCreate() { router.push('/app/tasks/create') }
</script>

<template>
  <AppBizSubPage title="巡检管理">
    <template #header-action>
      <button type="button" class="header-action" aria-label="新建巡检" @click="goCreate">＋</button>
    </template>
    <MobileTaskListView />
  </AppBizSubPage>
</template>

<style scoped>
.header-action {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.header-action:active { background: rgba(255, 255, 255, 0.32); }
</style>
