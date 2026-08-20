<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  laborBlacklist as initialList,
  logBlacklistIdCardView,
} from '../../mock/laborBlacklist'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { useIdCardReveal } from '../../composables/useIdCardReveal'

const { isHqSelected } = useCurrentProject()
const list = ref(initialList.map((row) => ({ ...row })))
const filters = ref({ name: '', id_card: '' })
const {
  isVisible: isIdCardVisible,
  display: displayIdCard,
  reveal: viewIdCard,
} = useIdCardReveal({
  getRaw: (row) => row.id_card,
  onReveal: (row) => logBlacklistIdCardView({ id: row.id, name: row.name }),
})
const formVisible = ref(false)
const formRef = ref(null)
const formData = ref({ name: '', id_card: '', reason: '' })

const formRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  id_card: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{17}[\dXx]$)/, message: '身份证号格式不正确', trigger: 'blur' },
  ],
  reason: [{ required: true, message: '请输入拉黑原因', trigger: 'blur' }],
}

const filteredList = computed(() => {
  return list.value.filter((row) => {
    if (filters.value.name && !row.name.includes(filters.value.name.trim())) return false
    if (filters.value.id_card && !row.id_card.includes(filters.value.id_card.trim())) return false
    return true
  })
})

function handleReset() {
  filters.value = { name: '', id_card: '' }
}

function openForm() {
  formData.value = { name: '', id_card: '', reason: '' }
  formVisible.value = true
}

async function handleSubmit() {
  await formRef.value.validate()
  const exists = list.value.some((row) => row.id_card === formData.value.id_card)
  if (exists) {
    ElMessage.warning('该身份证号已在黑名单中')
    return
  }
  list.value.unshift({
    id: `bl-${Date.now()}`,
    name: formData.value.name.trim(),
    id_card: formData.value.id_card.trim(),
    reason: formData.value.reason.trim(),
    created_by: '当前用户',
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  })
  formVisible.value = false
  ElMessage.success('已加入劳务黑名单')
}

async function handleRemove(row) {
  await ElMessageBox.confirm(`确认将「${row.name}」移出黑名单？`, '提示', { type: 'warning' })
  list.value = list.value.filter((item) => item.id !== row.id)
  ElMessage.success('已移出黑名单')
}
</script>

<template>
  <div class="blacklist-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 劳务黑名单</div>
      <div class="page-heading">
        <h1 class="page-title">劳务黑名单</h1>
        <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openForm">新增</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="filters.name"
        placeholder="姓名"
        aria-label="姓名"
        clearable
        style="width: 140px"
      />
      <el-input
        v-model="filters.id_card"
        placeholder="身份证号"
        aria-label="身份证号"
        clearable
        style="width: 180px"
      />
      <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <div class="table-section">
      <div class="table-summary">共 {{ filteredList.length }} 人</div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column label="身份证号" min-width="200">
          <template #default="{ row }">
            <div class="id-card-cell">
              <span>{{ displayIdCard(row) }}</span>
              <el-button
                v-if="!isIdCardVisible(row.id)"
                link
                type="primary"
                size="small"
                @click="viewIdCard(row)"
              >
                查看
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="拉黑原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="created_by" label="登记人" width="100" />
        <el-table-column prop="created_at" label="登记时间" width="160" />
        <el-table-column v-if="isHqSelected" label="操作" width="90" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="danger" @click="handleRemove(row)">移出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" title="新增黑名单人员" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="90px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" maxlength="20" aria-label="请输入姓名"/>
        </el-form-item>
        <el-form-item label="身份证号" prop="id_card">
          <el-input v-model="formData.id_card" placeholder="请输入身份证号" maxlength="18" aria-label="请输入身份证号"/>
        </el-form-item>
        <el-form-item label="拉黑原因" prop="reason">
          <el-input
            v-model="formData.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入拉黑原因"
            maxlength="200"
            show-word-limit aria-label="请输入拉黑原因"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button class="ap-btn-primary" type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.blacklist-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 16px 20px;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
}

.table-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.id-card-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
