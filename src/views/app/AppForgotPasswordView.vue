<script setup>
/**
 * 建管 APP · 找回密码
 * 两步：① 验证身份（账号 + 手机号 + 短信验证码）② 设置新密码
 * 演示口径：验证码固定 123456；不校验账号与手机号绑定关系、不发真实短信
 */
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppPhoneFrame from './AppPhoneFrame.vue'
import { syncRememberedPassword } from '../../mock/appSession.js'
import {
  SMS_RESEND_COOLDOWN_MS,
  resetPassword,
  sendSmsCode,
  smsCountdownSeconds,
  validateAccount,
  validatePhone,
} from '../../mock/accountSecurity.js'

const route = useRoute()
const router = useRouter()

const step = ref(1)
const countdown = ref(0)
let timer = null

const form = reactive({
  account: '',
  phone: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})
const showPwd = reactive({ next: false, confirm: false })

onMounted(() => {
  const acc = String(route.query.account || '').trim()
  if (acc) form.account = acc
})

function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) stopTimer()
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  countdown.value = 0
}

onUnmounted(stopTimer)

watch(
  () => form.phone,
  (val) => {
    const left = smsCountdownSeconds(val)
    if (left > 0) {
      countdown.value = left
      startTimer()
    } else if (!timer) {
      countdown.value = 0
    }
  },
)

function onSendCode() {
  const r = sendSmsCode({ phone: form.phone })
  if (!r.ok) return ElMessage.warning(r.msg)
  countdown.value = Math.ceil(SMS_RESEND_COOLDOWN_MS / 1000)
  startTimer()
  ElMessage.success('验证码已发送，请查收短信')
}

function goStep2() {
  const accountCheck = validateAccount(form.account)
  if (!accountCheck.ok) return ElMessage.warning(accountCheck.msg)
  const phoneCheck = validatePhone(form.phone)
  if (!phoneCheck.ok) return ElMessage.warning(phoneCheck.msg)
  if (!String(form.code).trim()) return ElMessage.warning('请输入验证码')
  step.value = 2
}

function onReset() {
  if (!form.newPassword) return ElMessage.warning('请输入新密码')
  if (form.newPassword !== form.confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  const r = resetPassword({
    account: form.account,
    phone: form.phone,
    code: form.code,
    newPassword: form.newPassword,
  })
  if (!r.ok) {
    ElMessage.warning(r.msg)
    if (r.msg.includes('验证码')) step.value = 1
    return
  }
  syncRememberedPassword(form.account, form.newPassword)
  ElMessage.success('密码重置成功，请使用新密码登录')
  router.replace({ path: '/app/login', query: { account: String(form.account).trim() } })
}

function backToLogin() {
  const acc = String(form.account || '').trim()
  router.replace({ path: '/app/login', query: acc ? { account: acc } : {} })
}
</script>

<template>
  <AppPhoneFrame :bottom-pad="0">
    <div class="forgot-screen">
      <header class="nav">
        <button type="button" class="nav-back" aria-label="返回登录" @click="backToLogin">‹</button>
        <h1>找回密码</h1>
        <span class="nav-holder" aria-hidden="true"></span>
      </header>

      <div class="steps" aria-label="找回密码步骤">
        <div class="step" :class="{ active: step === 1, done: step > 1 }">
          <span class="step-no">{{ step > 1 ? '✓' : '1' }}</span>
          <span class="step-text">验证身份</span>
        </div>
        <span class="step-line" :class="{ done: step > 1 }"></span>
        <div class="step" :class="{ active: step === 2 }">
          <span class="step-no">2</span>
          <span class="step-text">设置新密码</span>
        </div>
      </div>

      <main class="panel">
        <form v-if="step === 1" class="form" @submit.prevent="goStep2">
          <p class="panel-tip">请输入账号与绑定手机号，通过短信验证码验证身份。</p>
          <label class="field">
            <span class="field-label">账号</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">👤</span>
              <input v-model="form.account" type="text" placeholder="请输入账号" autocomplete="username" />
            </div>
          </label>
          <label class="field">
            <span class="field-label">手机号</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">📱</span>
              <input
                v-model="form.phone"
                type="tel"
                maxlength="11"
                placeholder="请输入绑定手机号"
                autocomplete="tel"
              />
            </div>
          </label>
          <label class="field">
            <span class="field-label">短信验证码</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">🔑</span>
              <input v-model="form.code" type="text" maxlength="6" placeholder="请输入验证码" />
              <button
                type="button"
                class="code-btn"
                :disabled="countdown > 0"
                @click="onSendCode"
              >
                {{ countdown > 0 ? `${countdown} 秒后重发` : '获取验证码' }}
              </button>
            </div>
          </label>
          <button class="submit" type="submit">下一步</button>
        </form>

        <form v-else class="form" @submit.prevent="onReset">
          <p class="panel-tip">请设置新密码，保存后请使用新密码登录。</p>
          <label class="field">
            <span class="field-label">新密码</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">🔒</span>
              <input
                v-model="form.newPassword"
                :type="showPwd.next ? 'text' : 'password'"
                placeholder="8～20 位，含字母和数字"
                autocomplete="new-password"
              />
              <button type="button" class="eye" @click="showPwd.next = !showPwd.next">
                {{ showPwd.next ? '隐' : '显' }}
              </button>
            </div>
          </label>
          <label class="field">
            <span class="field-label">确认新密码</span>
            <div class="input-wrap">
              <span class="input-icon" aria-hidden="true">🔒</span>
              <input
                v-model="form.confirmPassword"
                :type="showPwd.confirm ? 'text' : 'password'"
                placeholder="请再次输入新密码"
                autocomplete="new-password"
              />
              <button type="button" class="eye" @click="showPwd.confirm = !showPwd.confirm">
                {{ showPwd.confirm ? '隐' : '显' }}
              </button>
            </div>
          </label>
          <div class="btn-row">
            <button type="button" class="ghost" @click="step = 1">上一步</button>
            <button class="submit" type="submit">确认重置</button>
          </div>
        </form>
      </main>
    </div>
  </AppPhoneFrame>
</template>

<style scoped>
.forgot-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f4f5f7;
}
.nav {
  display: flex;
  align-items: center;
  min-height: 104px;
  padding: 16px 28px;
  background: #8f0045;
  color: #fff;
  flex-shrink: 0;
}
.nav-back {
  width: 72px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 56px;
  line-height: 1;
  padding: 0;
  text-align: left;
  cursor: pointer;
}
.nav h1 {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 36px;
  font-weight: 600;
}
.nav-holder {
  width: 72px;
  flex-shrink: 0;
}
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 48px 8px;
  background: #8f0045;
  color: rgba(255, 255, 255, 0.6);
}
.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
}
.step.active,
.step.done {
  color: #fff;
  font-weight: 600;
}
.step-no {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.step-line {
  width: 96px;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
}
.step-line.done {
  background: #fff;
}
.panel {
  flex: 1;
  margin-top: 36px;
  background: #f4f5f7;
  border-radius: 36px 36px 0 0;
  padding: 48px 48px 56px;
}
.panel-tip {
  margin: 0 0 12px;
  font-size: 26px;
  line-height: 1.5;
  color: #909399;
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
.code-btn {
  flex-shrink: 0;
  height: 60px;
  padding: 0 20px;
  border: 1px solid #8f0045;
  border-radius: 30px;
  background: #fff;
  color: #8f0045;
  font-size: 24px;
  cursor: pointer;
}
.code-btn:disabled {
  border-color: #dcdfe6;
  color: #a8abb2;
  cursor: not-allowed;
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
.btn-row {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}
.btn-row .submit {
  flex: 1;
  margin-top: 0;
}
.ghost {
  height: 96px;
  padding: 0 40px;
  border: 1px solid #8f0045;
  border-radius: 48px;
  background: #fff;
  color: #8f0045;
  font-size: 32px;
  cursor: pointer;
}
</style>
