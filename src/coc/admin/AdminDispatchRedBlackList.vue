<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ATTACH_PRESETS, validateAttachFile } from '../../constants/attachmentUpload.js'
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
    projectShort: '',
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

/** 项目全称 → 项目简称（用于历史记录回显兜底） */
const shortNameByFullName = new Map(projectOptions.map((p) => [p.fullName, p.shortName]))

/**
 * 项目部名称口径（用户 2026-10-19）：由项目简称自动带出，表单只读、不可修改。
 * 规则：项目简称 + 「项目部」；已以「部」结尾的不重复拼接。
 */
function toDeptName(shortName) {
  const text = String(shortName || '').trim()
  if (!text) return ''
  return /部$/.test(text) ? text : `${text}项目部`
}

/**
 * 列表「项目简称」列展示值。
 * 口径（用户 2026-10-19）：项目部名称与项目简称两列并存，不再展示项目全称。
 * 回显优先级：记录自带 projectShort → 按全称反查基础数据 → 记录里非「项目部」形式的旧简称
 * → 全称截断兜底 → `--`
 */
function displayProjectShort(row) {
  if (row?.projectShort) return row.projectShort
  const hit = shortNameByFullName.get(row?.fullName)
  if (hit) return hit
  const legacy = String(row?.shortName || '').trim()
  if (legacy && !/部$/.test(legacy)) return legacy
  const text = String(row?.fullName || '').trim()
  if (!text) return '--'
  return text.length > 12 ? `${text.slice(0, 12)}…` : text
}

/** 列表「项目部名称」列展示值：历史记录同样按简称推导，保证两列口径一致 */
function displayProjectDept(row) {
  const name = String(row?.shortName || '').trim()
  if (name) return toDeptName(name)
  const short = displayProjectShort(row)
  return short && short !== '--' ? toDeptName(short) : '--'
}

const periodOptions = computed(() => getRedBlackBoardPeriods())

const filtered = computed(() => {
  let list = records.value
  if (selectedPeriod.value) list = list.filter((item) => item.period === selectedPeriod.value)
  const q = keyword.value.trim()
  if (!q) return list
  return list.filter((item) =>
    [item.shortName, item.projectShort, item.fullName, item.description]
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
  // 历史记录可能只存了旧口径，编辑时按列表同一套规则回填，保证「简称→项目部名称」联动一致
  const short = displayProjectShort(row)
  const dept = displayProjectDept(row)
  form.value = {
    ...row,
    projectShort: short === '--' ? '' : short,
    shortName: dept === '--' ? '' : dept,
    periodYear: Number(parsed.year) || new Date().getFullYear(),
    periodNo: parsed.periodNo || 1,
  }
  formVisible.value = true
}

/** 选项目简称 → 自动带出项目部名称（只读）与项目全称（内部留痕） */
function onProjectShortPick(shortName) {
  const project = projectOptions.find((item) => item.shortName === shortName)
  form.value.fullName = project ? project.fullName : ''
  form.value.shortName = toDeptName(shortName)
}

function validateForm() {
  if (!form.value.periodYear || !form.value.periodNo) {
    ElMessage.warning('请填写所属期数')
    return false
  }
  if (!form.value.projectShort?.trim()) {
    ElMessage.warning('请选择项目简称')
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
  // 黑红榜单图片使用 10MB 宽档（用户 2026-10-19 指定），其它图片位仍为 5MB
  const err = validateAttachFile(file, 'image10', { currentCount: 0, max: 1 })
  if (err) {
    ElMessage.warning(err)
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
        <el-table-column label="项目部名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ displayProjectDept(row) }}</template>
        </el-table-column>
        <el-table-column label="项目简称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ displayProjectShort(row) }}</template>
        </el-table-column>
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
            v-model="form.projectShort"
            filterable
            allow-create
            default-first-option
            placeholder="选择项目简称"
            style="width: 100%"
            @change="onProjectShortPick" aria-label="选择项目简称">
            <el-option
              v-for="item in projectOptions"
              :key="item.id"
              :label="item.shortName"
              :value="item.shortName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="项目部名称">
          <el-input
            v-model="form.shortName"
            readonly
            placeholder="选项目简称后自动带出，不可修改"
            aria-label="项目部名称，选项目简称后自动带出，不可修改"/>
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
              :accept="ATTACH_PRESETS.image10.accept"
              :before-upload="handleImageUpload"
            >
              <div class="upload-placeholder">点击或拖拽上传现场图片</div>
            </el-upload>
            <p class="upload-hint">{{ ATTACH_PRESETS.image10.hint }}</p>
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

.upload-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--coc-text-secondary);
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
