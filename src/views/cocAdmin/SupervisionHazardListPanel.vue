<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, View } from '@element-plus/icons-vue'
import { HAZARD_LEVELS, HAZARD_REPORTERS } from '../../coc/mock/data.js'
import {
  getSupervisionHazards,
  saveSupervisionHazard,
  emptySupervisionHazard,
} from '../../utils/cocAdminDeviceStorage.js'

const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const detailVisible = ref(false)
const form = ref(emptySupervisionHazard())
const current = ref(null)

const hazardTypeOptions = [
  { value: 'safety', label: '安全' },
  { value: 'quality', label: '质量' },
]

function defaultDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) =>
    [
      row.description,
      row.rectifier,
      row.hazardLevel,
      hazardTypeLabel(row.hazardType),
    ].some((f) => String(f || '').includes(q)),
  )
})

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function hazardTypeTag(type) {
  return type === 'quality' ? 'success' : 'warning'
}

function load() {
  list.value = getSupervisionHazards()
}

function openCreate() {
  form.value = emptySupervisionHazard({
    hazardDeadline: defaultDeadline(),
  })
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptySupervisionHazard(row)
  formVisible.value = true
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function validateForm() {
  if (!form.value.description?.trim()) {
    ElMessage.warning('请填写隐患描述')
    return false
  }
  if (!form.value.rectifier?.trim()) {
    ElMessage.warning('请选择整改人')
    return false
  }
  if (!form.value.hazardDeadline) {
    ElMessage.warning('请选择整改期限')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveSupervisionHazard(form.value)
  load()
  formVisible.value = false
  ElMessage.success('监理隐患已保存')
}

onMounted(load)
</script>

<template>
  <div class="hazard-tab">
    <div class="tab-toolbar">
      <el-input v-model="keyword" placeholder="搜索隐患描述、整改人…" clearable class="search-input" />
      <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无监理隐患记录">
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column label="类型" width="72" align="center">
        <template #default="{ row }">
          <el-tag :type="hazardTypeTag(row.hazardType)" size="small">
            {{ hazardTypeLabel(row.hazardType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="隐患描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="hazardLevel" label="等级" width="72" align="center" />
      <el-table-column prop="rectifier" label="整改人" width="88" show-overflow-tooltip />
      <el-table-column prop="hazardDeadline" label="整改期限" width="112" />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="formVisible"
      :title="form.id ? '编辑监理隐患' : '新增监理隐患'"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="100px" class="hazard-form">
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.hazardType">
            <el-radio v-for="opt in hazardTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="隐患描述" required>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            :placeholder="form.hazardType === 'quality' ? '请描述发现的质量隐患' : '请描述发现的安全隐患'"
          />
        </el-form-item>
        <el-form-item label="等级" required>
          <el-radio-group v-model="form.hazardLevel">
            <el-radio v-for="item in HAZARD_LEVELS" :key="item" :value="item">{{ item }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="整改人" required>
          <el-select v-model="form.rectifier" placeholder="选择整改人" style="width: 100%">
            <el-option v-for="name in HAZARD_REPORTERS" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="整改期限" required>
          <el-date-picker
            v-model="form.hazardDeadline"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择整改期限"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理隐患详情" width="520px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述">{{ current.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ current.rectifier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ current.hazardDeadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.uploadTime }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hazard-tab {
  padding-top: 4px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 280px;
}
</style>
