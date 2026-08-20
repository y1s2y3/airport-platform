<script setup>
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  positionRecords,
  positionLevelOptions,
  createEmptyPosition,
  clonePosition,
  savePosition,
  deletePosition,
  syncPositions,
} from '../../mock/positions'
import { roleRecords } from '../../mock/roles'
import { useOrgScope } from '../../composables/useOrgScope'

const { isHqSelected, isRoleVisibleToCurrentUser } = useOrgScope()

const nameFilter = ref('')
const levelFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyPosition())

const dialogTitle = computed(() => (editingId.value ? '岗位编辑' : '岗位新增'))

const roleOptions = computed(() =>
  roleRecords.value
    .filter((item) => isRoleVisibleToCurrentUser(item.id))
    .map((item) => ({ value: item.id, label: item.name })),
)

const levelOptions = computed(() => {
  if (isHqSelected.value) return positionLevelOptions.filter((item) => item.value)
  return positionLevelOptions.filter((item) => item.value === '项目')
})

const rules = {
  code: [{ required: true, message: '请输入岗位编码', trigger: 'blur' }],
  name: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' },
    { max: 10, message: '岗位名称不超过10字', trigger: 'blur' },
  ],
  level: [{ required: true, message: '请选择岗位级别', trigger: 'change' }],
  duty: [{ max: 50, message: '岗位职责不超过50字', trigger: 'blur' }],
}

const filteredList = computed(() => {
  const kw = nameFilter.value.trim().toLowerCase()
  return positionRecords.value.filter((row) => {
    if (!isHqSelected.value && row.level !== '项目') return false
    if (levelFilter.value && row.level !== levelFilter.value) return false
    if (!kw) return true
    return row.name.toLowerCase().includes(kw) || row.code.toLowerCase().includes(kw)
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  nameFilter.value = ''
  levelFilter.value = ''
  currentPage.value = 1
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyPosition()
  if (!isHqSelected.value) {
    form.value.level = '项目'
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = clonePosition(row)
  dialogVisible.value = true
}

function handleSync() {
  const count = syncPositions()
  ElMessage.success(`已同步岗位数据，共 ${count} 条`)
}

function showHeadcount(row) {
  if (!row.headcount) return
  ElMessage.info(`岗位「${row.name}」当前在岗 ${row.headcount} 人`)
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除岗位「${row.name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    if (deletePosition(row.id)) {
      ElMessage.success('已删除')
    }
  } catch {
    /* cancelled */
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    savePosition(form.value, editingId.value || undefined)
    dialogVisible.value = false
    ElMessage.success(editingId.value ? '保存成功' : '新增成功')
  })
}
</script>

<template>
  <div class="position-page page-card">
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">岗位名称</span>
        <el-input
          v-model="nameFilter"
          class="filter-input"
          placeholder="请输入"
          clearable
          @keyup.enter="handleSearch" aria-label="请输入"/>
        <span class="field-label">岗位级别</span>
        <el-select v-model="levelFilter" placeholder="请选择" clearable class="filter-select" aria-label="请选择">
          <el-option
            v-for="opt in levelOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
      <div class="table-actions">
        <el-button @click="handleSync">同步</el-button>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">
          新增
        </el-button>
      </div>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无岗位数据">
      <el-table-column prop="name" label="岗位名称" min-width="150" />
      <el-table-column prop="level" label="岗位级别" width="100" align="center" />
      <el-table-column prop="source" label="岗位来源" width="110" align="center" />
      <el-table-column label="岗位人数" width="100" align="center">
        <template #default="{ row }">
          <el-button v-if="row.headcount" link type="primary" @click="showHeadcount(row)">
            {{ row.headcount }}
          </el-button>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column prop="duty" label="岗位职责" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="720px"
      destroy-on-close
      class="position-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="岗位编码" prop="code" required>
              <el-input v-model="form.code" placeholder="请输入" aria-label="请输入"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位名称" prop="name" required>
              <el-input
                v-model="form.name"
                placeholder="请输入"
                maxlength="10"
                show-word-limit aria-label="请输入"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="岗位级别" prop="level" required>
              <el-select v-model="form.level" placeholder="请选择岗位级别" style="width: 100%" aria-label="请选择岗位级别">
                <el-option
                  v-for="opt in levelOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色">
              <el-select
                v-model="form.roleId"
                placeholder="请选择角色"
                clearable
                filterable
                style="width: 100%" aria-label="请选择角色">
                <el-option
                  v-for="opt in roleOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="岗位职责" prop="duty">
              <el-input
                v-model="form.duty"
                type="textarea"
                :rows="3"
                placeholder="请输入"
                maxlength="50"
                show-word-limit aria-label="请输入"/>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.position-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-input {
  width: 160px;
}

.filter-select {
  width: 120px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.total-text {
  font-size: 14px;
  color: var(--ap-text-secondary);
}

.table-actions {
  display: flex;
  gap: 8px;
}

.ap-table {
  flex: 1;
}

.table-footer {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.op-divider {
  color: var(--ap-border);
  margin: 0 2px;
}
</style>
