<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginApp, getRememberedLogin, hydrateAppSession } from '../../mock/appSession.js'
import AppPhoneFrame from './AppPhoneFrame.vue'

const router = useRouter()
const form = reactive({
  account: '',
  password: '',
  remember: false,
})
const loading = ref(false)
const showPwd = ref(false)

onMounted(() => {
  hydrateAppSession()
  const remembered = getRememberedLogin()
  if (remembered.remember) {
    form.account = remembered.account
    form.password = remembered.password
    form.remember = true
  }
})

function onSubmit() {
  loading.value = true
  const r = loginApp({
    account: form.account,
    password: form.password,
    remember: form.remember,
  })
  loading.value = false
  if (!r.ok) return ElMessage.warning(r.msg)
  ElMessage.success('登录成功')
  router.replace('/app/personal')
}
</script>

<template>
  <AppPhoneFrame :bottom-pad="0">
    <div class="login-screen">
      <header class="hero">
        <div class="status-bar" aria-hidden="true">
          <span>9:41</span>
          <span class="status-icons">●●●</span>
        </div>
        <div class="brand">
          <div class="logo">建</div>
          <h1>建管 APP</h1>
          <p>智慧工程建设管控一体化平台</p>
        </div>
      </header>

      <main class="panel">
        <h2 class="panel-title">账号登录</h2>
        <form class="form" @submit.prevent="onSubmit">
          <label class="field">
            <span class="field-label">账号</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">👤</span>
              <input
                v-model="form.account"
                type="text"
                placeholder="请输入账号"
                autocomplete="username"
              />
            </div>
          </label>
          <label class="field">
            <span class="field-label">密码</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">🔒</span>
              <input
                v-model="form.password"
                :type="showPwd ? 'text' : 'password'"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
              <button type="button" class="eye" @click="showPwd = !showPwd">
                {{ showPwd ? '隐' : '显' }}
              </button>
            </div>
          </label>
          <label class="remember">
            <input v-model="form.remember" type="checkbox" />
            <span>记住密码</span>
          </label>
          <button class="submit" type="submit" :disabled="loading">
            {{ loading ? '登录中…' : '登 录' }}
          </button>
        </form>
        <p class="hint">演示：任意非空账号与密码即可登录</p>
      </main>
    </div>
  </AppPhoneFrame>
</template>

<style scoped>
.login-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f4f5f7;
}
.hero {
  background: linear-gradient(165deg, #6b0034 0%, #8f0045 100%);
  color: #fff;
  padding: 0 48px 72px;
  flex-shrink: 0;
}
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
  font-size: 28px;
  opacity: 0.9;
  padding-top: 16px;
}
.status-icons {
  letter-spacing: 4px;
  font-size: 16px;
}
.brand {
  text-align: center;
  padding-top: 72px;
}
.logo {
  width: 140px;
  height: 140px;
  margin: 0 auto 28px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  font-size: 56px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand h1 {
  margin: 0;
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 2px;
}
.brand p {
  margin: 16px 0 0;
  font-size: 26px;
  opacity: 0.85;
  line-height: 1.4;
}
.panel {
  flex: 1;
  margin-top: -36px;
  background: #f4f5f7;
  border-radius: 36px 36px 0 0;
  padding: 48px 48px 56px;
}
.panel-title {
  margin: 0 0 36px;
  font-size: 36px;
  font-weight: 600;
  color: #1f2329;
}
.form {
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
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
}
.input-wrap:focus-within {
  border-color: #8f0045;
  box-shadow: 0 0 0 4px rgba(143, 0, 69, 0.12);
}
.input-icon {
  font-size: 32px;
  opacity: 0.7;
  flex-shrink: 0;
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
.remember {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 28px;
  color: #606266;
  user-select: none;
}
.remember input {
  width: 32px;
  height: 32px;
  accent-color: #8f0045;
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
.submit:disabled {
  opacity: 0.7;
}
.hint {
  margin: 40px 0 0;
  text-align: center;
  font-size: 24px;
  color: #a8abb2;
  line-height: 1.5;
}
</style>
