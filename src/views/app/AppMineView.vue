<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAppMineProfile, logoutApp } from '../../mock/appSession.js'

const router = useRouter()
const profile = computed(() => getAppMineProfile())

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

    <div class="logout-wrap">
      <button type="button" class="logout-btn" @click="onLogout">退出登录</button>
    </div>
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
.logout-wrap {
  padding: 48px 24px;
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
