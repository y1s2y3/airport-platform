<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAppMineProfile, logoutApp } from '../../mock/appSession.js'
import { APP_VERSION } from '../../config/appVersion.js'
import { checkAppUpdate } from '../../mock/appUpdate.js'
import AppUpdateDialog from './AppUpdateDialog.vue'

const router = useRouter()
const profile = computed(() => getAppMineProfile())
/** 版本检查结果（有新版本时点击直接弹出更新内容，不跳二级页） */
const appUpdate = checkAppUpdate()
const updateDialogVisible = ref(false)

function onVersionCheck() {
  if (appUpdate.hasUpdate) {
    updateDialogVisible.value = true
    return
  }
  ElMessage.success('当前已是最新版本')
}

function goPasswordChange() {
  router.push('/app/password')
}

async function onLogout() {
  try {
    await ElMessageBox.confirm('确认退出建管 APP？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  logoutApp()
  ElMessage.success('已退出')
  router.replace('/app/login')
}
</script>

<template>
  <div class="mine-page">
    <header class="mobile-header">
      <h1>我的</h1>
    </header>
    <section class="profile-card">
      <div class="avatar">{{ profile.avatarText }}</div>
      <div class="profile-main">
        <div class="name">{{ profile.name }}</div>
        <div class="phone">{{ profile.phone }}</div>
        <div class="account">账号 {{ profile.account }}</div>
      </div>
    </section>

    <section class="org-block">
      <div class="block-title">组织列表</div>
      <div v-for="(org, idx) in profile.orgs" :key="idx" class="org-row">
        <div class="org-name">{{ org.orgName }}</div>
        <div class="org-post">岗位：{{ org.position }}</div>
      </div>
    </section>

    <section class="setting-block">
      <button type="button" class="setting-row" @click="onVersionCheck">
        <span class="setting-label">版本检查</span>
        <span v-if="appUpdate.hasUpdate" class="update-tag">新版本</span>
        <span class="setting-value">{{ APP_VERSION }}</span>
      </button>
      <button type="button" class="setting-row" @click="goPasswordChange">
        <span class="setting-label">密码修改</span>
        <span class="setting-value"></span>
        <span class="setting-arrow" aria-hidden="true">›</span>
      </button>
    </section>

    <div class="logout-wrap">
      <button type="button" class="logout-btn" @click="onLogout">退出登录</button>
    </div>

    <AppUpdateDialog v-model:visible="updateDialogVisible" :info="appUpdate" />
  </div>
</template>

<style scoped>
.mine-page {
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
.profile-card {
  margin: 24px;
  padding: 36px;
  background: #fff;
  border-radius: 20px;
  display: flex;
  gap: 28px;
  align-items: center;
}
.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #8f0045;
  color: #fff;
  font-size: 48px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.profile-main .name {
  font-size: 36px;
  font-weight: 600;
  color: #1f2329;
}
.profile-main .phone,
.profile-main .account {
  margin-top: 10px;
  font-size: 26px;
  color: #909399;
}
.org-block {
  margin: 0 24px;
  background: #fff;
  border-radius: 20px;
  padding: 28px 32px;
}
.block-title {
  font-size: 30px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}
.org-row {
  padding: 20px 0;
  border-top: 1px solid #f0f2f5;
}
.org-row:first-of-type {
  border-top: none;
}
.org-name {
  font-size: 28px;
  color: #1f2329;
}
.org-post {
  margin-top: 8px;
  font-size: 24px;
  color: #909399;
}
.setting-block {
  margin: 24px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
}
.setting-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 96px;
  padding: 0 32px;
  border: none;
  border-top: 1px solid #f0f2f5;
  background: transparent;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.setting-row:first-of-type {
  border-top: none;
}
.setting-label {
  flex: 1;
  font-size: 30px;
  color: #303133;
}
.setting-value {
  font-size: 26px;
  color: #909399;
}
.update-tag {
  flex-shrink: 0;
  border-radius: 24px;
  padding: 6px 18px;
  background: #fdf0f6;
  border: 1px solid #f0c6dc;
  color: #8f0045;
  font-size: 22px;
  font-weight: 600;
}
.setting-arrow {
  font-size: 36px;
  line-height: 1;
  color: #c0c4cc;
}
.logout-wrap {
  padding: 32px 24px 48px;
}
.logout-btn {
  width: 100%;
  height: 88px;
  border: 1px solid #f56c6c;
  background: #fff;
  color: #f56c6c;
  border-radius: 16px;
  font-size: 30px;
  cursor: pointer;
}
</style>
