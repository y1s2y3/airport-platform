<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { buildProjects } from '../mock/data.js'
import {
  getRedBlackBoardRecords,
  getRedBlackBoardPeriods,
  saveRedBlackBoardRecord,
  removeRedBlackBoardRecord,
  formatRedBlackPeriod,
  buildRedBlackPeriodKey,
  getCurrentRedBlackPeriodKey,
  parseRedBlackPeriod,
} from '../utils/redBlackBoardStorage.js'

defineProps({
  title: { type: String, default: '黑红榜单' },
  description: {
    type: String,
    default:
      '维护项目红榜/黑榜展示，支持从隐患库、处罚单直接勾选入榜，按期汇总展示与历史追溯。',
  },
})

const keyword = ref('')
const selectedPeriod = ref('')
const records = ref([])
const formVisible = ref(false)
const formMode = ref('create')

function emptyForm() {
  const current = parseRedBlackPeriod(selectedPeriod.value || getCurrentRedBlackPeriodKey())
  return {
    id: '',
    period: selectedPeriod.value || getCurrentRedBlackPeriodKey(),
    periodYear: Number(current.year) || new Date().getFullYear(),
    periodNo: current.periodNo || new Date().getMonth() + 1,
    boardType: 'red',
    shortName: '',
    fullName: '',
    description: '',
    image: '',
    imageHue: 145,
  }
}

const form = ref(emptyForm())
const projectOptions = buildProjects().map((p) => ({
  id: p.id,
  shortName: p.shortName || p.name,
  fullName: p.name,
}))

const periodOptions = computed(() => getRedBlackBoardPeriods())

const filtered = computed(() => {
  let list = records.value
  if (selectedPeriod.value) list = list.filter((item) => item.period === selectedPeriod.value)
  const q = keyword.value.trim()
  if (!q) return list
  return list.filter((item) =>
    [item.shortName, item.fullName, item.description]
      .some((field) => String(field || '').includes(q)),
  )
})

const periodSummary = computed(() => {
  const red = filtered.value.filter((item) => item.boardType === 'red').length
  const black = filtered.value.filter((item) => item.boardType === 'black').length
  return { red, black }
})

function load() {
  records.value = getRedBlackBoardRecords()
  if (!selectedPeriod.value) {
    selectedPeriod.value = periodOptions.value[0] || getCurrentRedBlackPeriodKey()
  }
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyForm()
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  const parsed = parseRedBlackPeriod(row.period)
  form.value = {
    ...row,
    periodYear: Number(parsed.year) || new Date().getFullYear(),
    periodNo: parsed.periodNo || 1,
  }
  formVisible.value = true
}

function onProjectPick(shortName) {
  const project = projectOptions.find((item) => item.shortName === shortName)
  if (project) form.value.fullName = project.fullName
}

function validateForm() {
  if (!form.value.periodYear || !form.value.periodNo) {
    ElMessage.warning('请填写所属期数')
    return false
  }
  if (!form.value.shortName?.trim()) {
    ElMessage.warning('请填写项目简称')
    return false
  }
  if (!form.value.description?.trim()) {
    ElMessage.warning('请填写榜单说明')
    return false
  }
  if (!form.value.image) {
    ElMessage.warning('请上传榜单图片')
    return false
  }
  return true
}

function handleImageUpload(uploadFile) {
  const file = uploadFile.raw
  if (!file || !file.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('图片大小不超过 2MB')
    return false
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    form.value.image = event.target.result
  }
  reader.readAsDataURL(file)
  return false
}

function clearImage() {
  form.value.image = ''
}

function submitForm() {
  if (!validateForm()) return
  const period = buildRedBlackPeriodKey(form.value.periodYear, form.value.periodNo)
  saveRedBlackBoardRecord({ ...form.value, period })
  load()
  selectedPeriod.value = period
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '已新增榜单条目' : '已更新榜单条目')
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定删除「${row.shortName}」的${row.boardType === 'red' ? '红榜' : '黑榜'}记录？`, '提示', {
    type: 'warning',
  })
    .then(() => {
      removeRedBlackBoardRecord(row.id)
      load()
      ElMessage.success('已删除')
    })
    .catch(() => {})
}

watch(selectedPeriod, () => {
  keyword.value = ''
})

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-select
          v-model="selectedPeriod"
          placeholder="选择期数"
          style="width: 168px"
          filterable aria-label="选择期数">
          <el-option
            v-for="item in periodOptions"
            :key="item"
            :label="formatRedBlackPeriod(item)"
            :value="item"
          />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索项目、说明…" clearable class="search-input" aria-label="搜索项目、说明…"/>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>

    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>

      <div class="period-bar">
        <span class="period-label">{{ formatRedBlackPeriod(selectedPeriod) }}</span>
        <span class="period-stats">
          红榜 {{ periodSummary.red }} 条 · 黑榜 {{ periodSummary.black }} 条
        </span>
      </div>

      <el-table :data="filtered" stripe border empty-text="该期暂无黑红榜数据，请点击新增">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column label="榜单" width="88">
          <template #default="{ row }">
            <el-tag :type="row.boardType === 'red' ? 'danger' : 'info'" size="small">
              {{ row.boardType === 'red' ? '红榜' : '黑榜' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="shortName" label="项目简称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="fullName" label="项目全称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
        <el-table-column prop="updatedAt" label="更新时间" width="168" />
        <el-table-column label="图片" width="88">
          <template #default="{ row }">
            <div class="thumb-cell">
              <img v-if="row.image" :src="row.image" alt="榜单图" class="thumb-img" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新增黑红榜条目' : '编辑黑红榜条目'"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="96px">
        <el-form-item label="所属期数" required>
          <div class="period-input-row">
            <el-input-number v-model="form.periodYear" :min="2020" :max="2035" controls-position="right" />
            <span class="period-unit">年 第</span>
            <el-input-number v-model="form.periodNo" :min="1" :max="52" controls-position="right" />
            <span class="period-unit">期</span>
          </div>
        </el-form-item>
        <el-form-item label="榜单类型" required>
          <el-radio-group v-model="form.boardType">
            <el-radio value="red">红榜</el-radio>
            <el-radio value="black">黑榜</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="项目简称" required>
          <el-select
            v-model="form.shortName"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入项目简称"
            style="width: 100%"
            @change="onProjectPick" aria-label="选择或输入项目简称">
            <el-option
              v-for="item in projectOptions"
              :key="item.id"
              :label="item.shortName"
              :value="item.shortName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="项目全称">
          <el-input v-model="form.fullName" placeholder="选填，可自动带出" aria-label="选填，可自动带出"/>
        </el-form-item>
        <el-form-item label="榜单说明" required>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="填写上榜原因或典型做法说明" aria-label="填写上榜原因或典型做法说明"/>
        </el-form-item>
        <el-form-item label="榜单图片" required>
          <div class="image-upload">
            <div v-if="form.image" class="image-preview">
              <img :src="form.image" alt="预览" class="preview-img" />
              <el-button size="small" type="danger" plain @click="clearImage">移除</el-button>
            </div>
            <el-upload
              v-else
              drag
              :show-file-list="false"
              accept="image/*"
              :before-upload="handleImageUpload"
            >
              <div class="upload-placeholder">点击或拖拽上传现场图片</div>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #909399;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-wrap: wrap;
}

.search-input {
  width: 220px;
}

.page-body {
  padding: 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.period-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 14px;
  background: #faf8f6;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
}

.period-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--coc-text);
}

.period-stats {
  font-size: 12px;
  color: var(--coc-text-muted);
}

.period-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.period-unit {
  font-size: 13px;
  color: var(--coc-text-secondary);
}

.thumb-cell {
  width: 64px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  background: #1a1a1a;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-upload {
  width: 100%;
}

.image-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.preview-img {
  width: 200px;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--coc-border);
}

.upload-placeholder {
  padding: 24px 12px;
  font-size: 13px;
  color: var(--coc-text-muted);
}
</style>
