<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getRole,
  createEmptyRole,
  cloneRoleRecord,
  saveRole,
  roleLevelOptions,
} from '../../mock/roles'
import {
  webMenuPermissionTree,
  appMenuPermissionTree,
  collectMenuTreeKeys,
} from '../../utils/menuPermissionTree'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const form = ref(null)
const permTab = ref('web')
const webTreeRef = ref(null)
const appTreeRef = ref(null)
const checkAll = ref(false)

const isEdit = computed(() => Boolean(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '角色编辑' : '角色新增'))
const levelOptions = roleLevelOptions.filter((item) => item.value)

const currentTree = computed(() =>
  permTab.value === 'web' ? webMenuPermissionTree : appMenuPermissionTree,
)
const currentTreeRef = computed(() => (permTab.value === 'web' ? webTreeRef : appTreeRef))

const rules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { max: 50, message: '角色名称不超过50字', trigger: 'blur' },
  ],
  level: [{ required: true, message: '请选择角色级别', trigger: 'change' }],
  status: [{ required: true, message: '请选择角色状态', trigger: 'change' }],
}

onMounted(async () => {
  if (isEdit.value) {
    const detail = getRole(route.params.id)
    if (!detail) {
      ElMessage.warning('未找到角色信息')
      router.replace({ name: 'Sysrole' })
      return
    }
    form.value = cloneRoleRecord(detail)
  } else {
    form.value = createEmptyRole()
  }
  await nextTick()
  syncTreeCheckedKeys()
})

watch(permTab, async () => {
  checkAll.value = false
  await nextTick()
  syncTreeCheckedKeys()
})

function syncTreeCheckedKeys() {
  const tree = currentTreeRef.value.value
  if (!tree || !form.value) return
  const keys = permTab.value === 'web' ? form.value.webMenuIds : form.value.appMenuIds
  tree.setCheckedKeys(keys)
  updateCheckAllState()
}

function updateCheckAllState() {
  const tree = currentTreeRef.value.value
  if (!tree) return
  const allKeys = collectMenuTreeKeys(currentTree.value)
  const checked = tree.getCheckedKeys(false)
  checkAll.value = allKeys.length > 0 && checked.length >= allKeys.length
}

function handleTreeCheck() {
  const tree = currentTreeRef.value.value
  if (!tree || !form.value) return
  const keys = tree.getCheckedKeys(false)
  if (permTab.value === 'web') form.value.webMenuIds = keys
  else form.value.appMenuIds = keys
  updateCheckAllState()
}

function handleCheckAll(val) {
  const tree = currentTreeRef.value.value
  if (!tree || !form.value) return
  const keys = val ? collectMenuTreeKeys(currentTree.value) : []
  tree.setCheckedKeys(keys)
  if (permTab.value === 'web') form.value.webMenuIds = keys
  else form.value.appMenuIds = keys
}

function goBack() {
  router.push({ name: 'Sysrole' })
}

async function handleSubmit() {
  if (!formRef.value || !form.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    saveRole(form.value, isEdit.value ? route.params.id : undefined)
    ElMessage.success(isEdit.value ? '保存成功' : '新增成功')
    router.push({ name: 'Sysrole' })
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

    <el-form ref="formRef" :model="form" :rules="rules" label-width="88px" class="role-form">
      <section class="form-section">
        <div class="section-title">基本信息</div>
        <el-row :gutter="24">
          <el-col :span="8">
            <el-form-item label="角色名称" prop="name" required>
              <el-input
                v-model="form.name"
                placeholder="请输入"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="角色级别" prop="level" required>
              <el-select v-model="form.level" placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="opt in levelOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number
                v-model="form.sortOrder"
                :min="0"
                :max="9999"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="角色状态" prop="status" required>
              <el-radio-group v-model="form.status">
                <el-radio value="启用">启用</el-radio>
                <el-radio value="禁用">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="备注">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="2"
                placeholder="请输入"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="form-section">
        <div class="section-title">功能权限</div>
        <el-tabs v-model="permTab" class="perm-tabs">
          <el-tab-pane label="WEB功能" name="web" />
          <el-tab-pane label="APP功能" name="app" />
        </el-tabs>

        <div class="perm-toolbar">
          <el-checkbox v-model="checkAll" @change="handleCheckAll">全选</el-checkbox>
        </div>

        <el-tree
          v-show="permTab === 'web'"
          ref="webTreeRef"
          :data="webMenuPermissionTree"
          show-checkbox
          node-key="id"
          default-expand-all
          check-strictly
          :props="{ label: 'label', children: 'children' }"
          class="menu-tree"
          @check="handleTreeCheck"
        />
        <el-tree
          v-show="permTab === 'app'"
          ref="appTreeRef"
          :data="appMenuPermissionTree"
          show-checkbox
          node-key="id"
          default-expand-all
          check-strictly
          :props="{ label: 'label', children: 'children' }"
          class="menu-tree"
          @check="handleTreeCheck"
        />
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
  margin-bottom: 24px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text-primary);
  margin-bottom: 16px;
}

.perm-tabs {
  margin-bottom: 8px;
}

.perm-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px 12px;
  background: var(--ap-bg-muted, #f5f7fa);
  border: 1px solid var(--ap-border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.menu-tree {
  border: 1px solid var(--ap-border);
  border-radius: 0 0 6px 6px;
  padding: 8px 12px;
  max-height: 420px;
  overflow: auto;
}
</style>
