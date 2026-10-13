<script setup>
/**
 * 忘记密码弹窗（Web 端）
 * 单页表单：账号 + 手机号 + 短信验证码 → 设置新密码
 * 复用平台账号安全 Mock（Web 登录 / 建管 APP 同一套密码存储）
 */
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  SMS_RESEND_COOLDOWN_MS,
  resetPassword,
  sendSmsCode,
  smsCountdownSeconds,
  validatePassword,
  validatePhone,
} from '../../mock/accountSecurity.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 登录表单里已填的账号，打开弹窗时自动带出 */
  defaultAccount: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const formRef = ref(null)
const form = reactive({
  account: '',
  phone: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
})
const submitting = ref(false)
const countdown = ref(0)
let timer = null

const rules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  code: [{ required: true, message: '请输入短信验证码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        const r = validatePassword(value)
        return r.ok ? callback() : callback(new Error(r.msg))
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) =>
        value === form.newPassword ? callback() : callback(new Error('两次输入的新密码不一致')),
      trigger: 'blur',
    },
  ],
}

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
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.defaultAccount) form.account = props.defaultAccount
    const left = smsCountdownSeconds(form.phone)
    if (left > 0) {
      countdown.value = left
      startTimer()
    }
  },
)

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
  if (countdown.value > 0) return
  const phoneCheck = validatePhone(form.phone)
  if (!phoneCheck.ok) return ElMessage.warning(phoneCheck.msg)
  const r = sendSmsCode({ phone: form.phone })
  if (!r.ok) return ElMessage.warning(r.msg)
  countdown.value = Math.ceil(SMS_RESEND_COOLDOWN_MS / 1000)
  startTimer()
  ElMessage.success('验证码已发送，请查收短信')
}

function resetForm() {
  form.account = ''
  form.phone = ''
  form.code = ''
  form.newPassword = ''
  form.confirmPassword = ''
  submitting.value = false
  formRef.value?.clearValidate()
}

function onClose() {
  resetForm()
  visible.value = false
}

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  const r = resetPassword({
    account: form.account,
    phone: form.phone,
    code: form.code,
    newPassword: form.newPassword,
  })
  submitting.value = false
  if (!r.ok) return ElMessage.warning(r.msg)
  ElMessage.success('密码重置成功，请使用新密码登录')
  emit('success', form.account)
  resetForm()
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="忘记密码"
    width="520px"
    :close-on-click-modal="false"
    append-to-body
    @close="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" @submit.prevent>
      <el-form-item label="账号" prop="account">
        <el-input v-model="form.account" placeholder="请输入账号" clearable aria-label="账号" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="form.phone"
          maxlength="11"
          placeholder="请输入绑定手机号"
          clearable
          aria-label="手机号"
        />
      </el-form-item>
      <el-form-item label="验证码" prop="code">
        <div class="code-row">
          <el-input v-model="form.code" maxlength="6" placeholder="请输入短信验证码" aria-label="短信验证码" />
          <el-button class="code-btn" :disabled="countdown > 0" @click="onSendCode">
            {{ countdown > 0 ? `${countdown} 秒后重发` : '获取验证码' }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          show-password
          placeholder="8～20 位，含字母和数字"
          aria-label="新密码"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
          aria-label="确认新密码"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="onClose">取消</el-button>
      <el-button type="primary" class="ap-btn-primary" :loading="submitting" @click="onSubmit">
        确认重置
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.code-row {
  display: flex;
  gap: 12px;
  width: 100%;
}
.code-row .el-input {
  flex: 1;
}
.code-btn {
  flex-shrink: 0;
  min-width: 124px;
}
</style>
