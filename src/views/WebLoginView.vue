<script setup>
/**
 * Web 端 · 平台登录页
 * 账号 + 密码登录（不提供「忘记密码」，密码由管理员在「系统管理 → 用户管理」中重置）
 * 说明：本页为平台登录入口，未登录也可直接访问后台（演示不拦截）
 */
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { APP_VERSION } from '../config/appVersion.js'
import { verifyAccountPassword } from '../mock/accountSecurity.js'
import { hydrateWebSession, loginWeb } from '../mock/webSession.js'

const STORAGE_ACCOUNT = 'web-login-account'

const router = useRouter()
const formRef = ref(null)
const form = reactive({
  account: '',
  password: '',
  remember: true,
})
const loading = ref(false)

const rules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

onMounted(() => {
  hydrateWebSession()
  try {
    const saved = localStorage.getItem(STORAGE_ACCOUNT)
    if (saved) {
      form.account = saved
      form.remember = true
    }
  } catch {
    /* ignore */
  }
})

function rememberAccount(account) {
  try {
    if (account) localStorage.setItem(STORAGE_ACCOUNT, account)
    else localStorage.removeItem(STORAGE_ACCOUNT)
  } catch {
    /* ignore */
  }
}

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  const r = verifyAccountPassword({ account: form.account, password: form.password })
  loading.value = false
  if (!r.ok) return ElMessage.warning(r.msg)
  rememberAccount(form.remember ? form.account : '')
  loginWeb(form.account)
  ElMessage.success('登录成功')
  router.replace('/workbench')
}
</script>

<template>
  <div class="login-page">
    <section class="brand-side">
      <div class="brand-logo" aria-hidden="true">
        <svg viewBox="0 0 36 36" width="56" height="56">
          <circle cx="18" cy="18" r="17" fill="rgba(255, 255, 255, 0.14)" />
          <path d="M10 24 L18 11 L26 24 Z" fill="none" stroke="#fff" stroke-width="1.8" />
          <line x1="12" y1="24" x2="24" y2="24" stroke="#fff" stroke-width="1.8" />
        </svg>
      </div>
      <h1 class="brand-title">工程建设智慧管控一体化平台</h1>
      <p class="brand-sub">深圳机场扩建工程指挥部信息化平台</p>
      <ul class="brand-points">
        <li>质量、安全、进度、材料设备全流程线上化与审批留痕</li>
        <li>指挥部与项目部两级视角，业务数据统一台账</li>
        <li>Web 后台与建管 APP 双端协同</li>
      </ul>
    </section>

    <section class="form-side">
      <div class="form-card">
        <h2 class="form-title">账号登录</h2>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent>
          <el-form-item prop="account">
            <el-input v-model="form.account" placeholder="请输入账号" clearable aria-label="账号" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="请输入密码"
              aria-label="密码"
            />
          </el-form-item>
          <div class="form-meta">
            <el-checkbox v-model="form.remember">记住账号</el-checkbox>
          </div>
          <el-button
            class="submit-btn ap-btn-primary"
            type="primary"
            size="large"
            :loading="loading"
            @click="onSubmit"
          >
            登 录
          </el-button>
        </el-form>
        <p class="form-footer">工程建设智慧管控一体化平台 · {{ APP_VERSION }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: var(--ap-bg);
}
.brand-side {
  flex: 1.05;
  min-width: 0;
  padding: 72px 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(155deg, #6b0034 0%, #8f0045 58%, #a80052 100%);
  color: #fff;
}
.brand-logo {
  margin-bottom: 28px;
}
.brand-title {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.35;
}
.brand-sub {
  margin-top: 14px;
  font-size: 15px;
  opacity: 0.82;
}
.brand-points {
  margin-top: 40px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.9;
}
.brand-points li {
  position: relative;
  padding-left: 18px;
}
.brand-points li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
}
.form-side {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
}
.form-card {
  width: 100%;
  max-width: 400px;
  background: var(--ap-card);
  border: 1px solid var(--ap-border);
  border-radius: 12px;
  padding: 36px 32px 28px;
  box-shadow: 0 12px 36px rgba(31, 35, 41, 0.08);
}
.form-title {
  margin-bottom: 26px;
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  text-align: center;
}
.form-meta {
  display: flex;
  align-items: center;
  margin: 2px 0 22px;
}
.submit-btn {
  width: 100%;
  letter-spacing: 6px;
}
.form-footer {
  margin-top: 26px;
  text-align: center;
  font-size: 12px;
  color: var(--ap-text-muted);
}
@media (max-width: 960px) {
  .brand-side {
    display: none;
  }
}
</style>
