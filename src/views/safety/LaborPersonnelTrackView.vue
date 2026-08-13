<script setup>
/**
 * 人员轨迹：菜单点击已在侧栏直接外跳；本页仅作深链兼容，进入后尝试外跳并返回。
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { openTrackExternalByKind } from '../../utils/trackExternalJump'

const router = useRouter()

onMounted(() => {
  openTrackExternalByKind('labor')
  if (window.history.length > 1) router.back()
  else router.replace('/labor/dashboard')
})
</script>

<template>
  <div class="track-redirect page-card">
    <p>正在打开人员轨迹系统…</p>
  </div>
</template>

<style scoped>
.track-redirect { padding: 24px; color: var(--ap-text-muted); font-size: 14px; }
</style>
