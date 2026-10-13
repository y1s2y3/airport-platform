<script setup>
/**
 * 建管 APP · 密码修改
 * 原密码校验 → 新密码规则 → 保存后需使用新密码重新登录
 */
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppBizSubPage from './AppBizSubPage.vue'
import {
  appLoginAccount,
  getAppMineProfile,
  logoutApp,
  syncRememberedPassword,
} from '../../mock/appSession.js'
import { changePassword } from '../../mock/accountSecurity.js'

const router = useRouter()

const account = computed(() => appLoginAccount.value || getAppMineProfile().account || '')

const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const show = reactive({ old: false, next: false, confirm: false })

function onSubmit() {
  if (!form.oldPassword) return ElMessage.warning('请输入原密码')
  if (!form.newPassword) return ElMessage.warning('请输入新密码')
  if (form.newPassword !== form.confirmPassword) {
    return ElMessage.warning('两次输入的新密码不一致')
  }
  // 退出登录会清空当前账号，先留存本次要携带回登录页的账号
  const currentAccount = account.value
  const r = changePassword({
    account: currentAccount,
    oldPassword: form.oldPassword,
    newPassword: form.newPassword,
  })
  if (!r.ok) return ElMessage.warning(r.msg)
  syncRememberedPassword(currentAccount, form.newPassword)
  ElMessage.success('密码修改成功，请使用新密码重新登录')
  logoutApp()
  router.replace({ path: '/app/login', query: currentAccount ? { account: currentAccount } : {} })
}
</script>

<template>
  <AppBizSubPage title="密码修改" back-to="/app/mine" :scale-mobile="false">
    <div class="pwd-page">
      <form class="pwd-form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field-label">原密码</span>
          <div class="input-wrap">
            <input
              v-model="form.oldPassword"
              :type="show.old ? 'text' : 'password'"
              placeholder="请输入原密码"
              autocomplete="current-password"
            />
            <button type="button" class="eye" @click="show.old = !show.old">
              {{ show.old ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>
        <label class="field">
          <span class="field-label">新密码</span>
          <div class="input-wrap">
            <input
              v-model="form.newPassword"
              :type="show.next ? 'text' : 'password'"
              placeholder="8～20 位，含字母和数字"
              autocomplete="new-password"
            />
            <button type="button" class="eye" @click="show.next = !show.next">
              {{ show.next ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>
        <label class="field">
          <span class="field-label">确认新密码</span>
          <div class="input-wrap">
            <input
              v-model="form.confirmPassword"
              :type="show.confirm ? 'text' : 'password'"
              placeholder="请再次输入新密码"
              autocomplete="new-password"
            />
            <button type="button" class="eye" @click="show.confirm = !show.confirm">
              {{ show.confirm ? '隐藏' : '显示' }}
            </button>
          </div>
        </label>
        <button class="submit" type="submit">确认修改</button>
      </form>
    </div>
  </AppBizSubPage>
</template>

<style scoped>
.pwd-page {
  min-height: 100%;
  background: #f4f5f7;
  padding: 24px;
  box-sizing: border-box;
}
.pwd-form {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field-label {
  font-size: 28px;
  color: #606266;
}
.input-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 96px;
  padding: 0 28px;
  background: #f7f8fa;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
}
.input-wrap:focus-within {
  border-color: #8f0045;
  box-shadow: 0 0 0 4px rgba(143, 0, 69, 0.12);
}
.input-wrap input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 32px;
  color: #1f2329;
}
.eye {
  border: none;
  background: transparent;
  color: #8f0045;
  font-size: 26px;
  padding: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.submit {
  margin-top: 12px;
  height: 96px;
  border: none;
  border-radius: 48px;
  background: #8f0045;
  color: #fff;
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 8px;
  cursor: pointer;
}
.submit:active {
  opacity: 0.9;
}
</style>
