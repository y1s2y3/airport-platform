<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, Minus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getSysUser,
  createEmptySysUser,
  cloneSysUser,
  saveSysUser,
} from '../../mock/sysUsers'
import { getOrgPositions } from '../../mock/orgStructure'
import { useOrgScope } from '../../composables/useOrgScope'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const form = ref(null)
const { isHqSelected, orgNodeOptions, defaultOrgNodeId } = useOrgScope()

const isEdit = computed(() => Boolean(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '编辑' : '新增'))

const positionOptions = computed(() => {
  if (!form.value?.orgId) return []
  return getOrgPositions(form.value.orgId).map((item) => ({
    value: item.id,
    label: item.name,
  }))
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  loginAccount: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  orgId: [{ required: true, message: '请选择所属组织', trigger: 'change' }],
}

onMounted(() => {
  if (isEdit.value) {
    const detail = getSysUser(route.params.id)
    if (!detail) {
      ElMessage.warning('未找到用户信息')
      router.replace({ name: 'Sysuser' })
      return
    }
    form.value = cloneSysUser(detail)
    return
  }
  form.value = createEmptySysUser()
  if (!isHqSelected.value) {
    form.value.orgId = defaultOrgNodeId.value
  }
})

watch(
  () => form.value?.orgId,
  (orgId, prev) => {
    if (!form.value || orgId === prev) return
    form.value.positions = ['']
  },
)

function goBack() {
  router.push({ name: 'Sysuser' })
}

function addPositionRow() {
  form.value.positions.push('')
}

function removePositionRow(index) {
  if (form.value.positions.length <= 1) {
    form.value.positions = ['']
    return
  }
  form.value.positions.splice(index, 1)
}

async function handleSubmit() {
  if (!formRef.value || !form.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    saveSysUser(form.value, isEdit.value ? route.params.id : undefined)
    ElMessage.success(isEdit.value ? '保存成功' : '新增成功')
    router.push({ name: 'Sysuser' })
  })
}
</script>

<template>
  <div v-if="form" class="form-page page-card">
    <div class="form-header">
      <el-button text class="back-btn" :icon="ArrowLeft" @click="goBack">返回</el-button>
      <h1 class="form-title">{{ pageTitle }}</h1>
      <div class="form-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">保存</el-button>
      </div>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="user-form">
      <section class="form-section">
        <div class="section-title">基本信息</div>
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="姓名" prop="name" required>
              <el-input v-model="form.name" placeholder="请输入姓名" aria-label="请输入姓名"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="登录账号" prop="loginAccount" required>
              <el-input v-model="form.loginAccount" placeholder="请输入登录账号" aria-label="请输入登录账号"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="请输入备注" aria-label="请输入备注"/>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="手机号" prop="phone" required>
              <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" aria-label="请输入手机号"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="邮箱" prop="email" required>
              <el-input v-model="form.email" placeholder="请输入邮箱" aria-label="请输入邮箱"/>
            </el-form-item>
          </el-col>

          <el-col :span="8">
            <el-form-item label="所属组织" prop="orgId" required>
              <el-select v-model="form.orgId" placeholder="选择组织" filterable style="width: 100%" aria-label="选择组织">
                <el-option
                  v-for="opt in orgNodeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <div v-for="(pos, index) in form.positions" :key="index" class="position-row">
              <el-form-item :label="index === 0 ? '岗位' : ''" class="position-item">
                <el-select
                  v-model="form.positions[index]"
                  placeholder="选择岗位"
                  clearable
                  filterable
                  style="width: 100%"
                  :disabled="!form.orgId" aria-label="选择岗位">
                  <el-option
                    v-for="opt in positionOptions"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
              <div class="position-actions">
                <el-button :icon="Plus" @click="addPositionRow" />
                <el-button :icon="Minus" @click="removePositionRow(index)" />
              </div>
            </div>
          </el-col>
        </el-row>
      </section>
    </el-form>
  </div>
</template>

<style scoped>
.form-page {
  padding: 16px 20px 24px;
  min-height: calc(100vh - 120px);
}

.form-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ap-border-light);
}

.back-btn {
  padding-left: 0;
  font-size: 14px;
}

.form-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text-primary);
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 8px;
}

.form-section {
  margin-top: 4px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text-primary);
  margin-bottom: 16px;
}

.position-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.position-item {
  flex: 1;
  margin-bottom: 12px;
}

.position-actions {
  display: flex;
  gap: 4px;
  padding-top: 2px;
}

.position-actions .el-button {
  width: 32px;
  padding: 8px;
}
</style>
