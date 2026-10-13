<script setup>
/**
 * 修改密码弹窗（Web 端）
 * 原密码校验 → 新密码规则 → 保存后需使用新密码重新登录
 * 复用平台账号安全 Mock（Web 登录 / 建管 APP 同一套密码存储）
 */
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { changePassword, validatePassword } from '../../mock/accountSecurity.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 当前登录账号（仅用于校验，不在界面展示） */
  account: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const formRef = ref(null)
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const submitting = ref(false)

const rules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
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

function resetForm() {
  form.oldPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
  submitting.value = false
  formRef.value?.clearValidate()
}

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  const r = changePassword({
    account: props.account,
    oldPassword: form.oldPassword,
    newPassword: form.newPassword,
  })
  submitting.value = false
  if (!r.ok) return ElMessage.warning(r.msg)
  ElMessage.success('密码修改成功，请使用新密码重新登录')
  emit('success')
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="480px"
    :close-on-click-modal="false"
    append-to-body
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px" @submit.prevent>
      <el-form-item label="原密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          show-password
          placeholder="请输入原密码"
          aria-label="原密码"
        />
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
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" class="ap-btn-primary" :loading="submitting" @click="onSubmit">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>
