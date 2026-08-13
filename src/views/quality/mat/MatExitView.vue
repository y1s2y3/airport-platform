<script setup>
import './mat-page.css'
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listExitableEntries,
  listExits,
  getExitDetail,
  registerExit,
} from '../../../mock/mat.js'

const { isHqSelected, scopeProjectId } = useQmProjectScope()
const tick = ref(0)
const keyword = ref('')

const createVisible = ref(false)
const detailVisible = ref(false)
const detail = ref(null)

const form = reactive({
  entry_id: '',
  exit_qty: '',
  reason: '',
  photo_file: '',
})

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExits(scopeProjectId.value, { keyword: keyword.value })
})

const exitable = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExitableEntries(scopeProjectId.value)
})

const selected = computed(() => exitable.value.find((e) => e.entry_id === form.entry_id) || null)

function resetFilter() {
  keyword.value = ''
}

function resetForm() {
  form.entry_id = ''
  form.exit_qty = ''
  form.reason = ''
  form.photo_file = ''
}

function openCreate() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  resetForm()
  createVisible.value = true
}

function openDetail(row) {
  detail.value = getExitDetail(row.exit_id)
  detailVisible.value = true
}

function onPhotoChange(uploadFile) {
  form.photo_file = uploadFile?.name || ''
}

function onPhotoRemove() {
  form.photo_file = ''
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const r = registerExit({
    entry_id: form.entry_id,
    exit_qty: form.exit_qty,
    reason: form.reason,
    photo_file: form.photo_file,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('退场已登记生效')
  createVisible.value = false
  resetForm()
  tick.value += 1
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料退场登记</div>
      <h1 class="page-title">材料退场登记</h1>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="退场登记为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="退场单号 / 进场单号 / 材料 / 品牌 / 原因"
          style="width: 280px"
          :prefix-icon="Search"
        />
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增退场登记</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无退场记录">
        <el-table-column prop="exit_id" label="退场单号" width="130" />
        <el-table-column prop="entry_id" label="进场单号" width="110" />
        <el-table-column prop="material_name" label="材料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="brand_name" label="品牌" width="100" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.supplier || '—' }}</template>
        </el-table-column>
        <el-table-column label="退场数量" width="110">
          <template #default="{ row }">{{ row.exit_qty }}{{ row.unit || '' }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="退场原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="operator" label="登记人" width="100" />
        <el-table-column prop="exit_time" label="登记时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 新增退场登记 -->
    <el-dialog
      v-model="createVisible"
      title="新增退场登记"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="进场单" required>
          <el-select
            v-model="form.entry_id"
            filterable
            clearable
            placeholder="选择已通过且未退场的进场单"
            style="width: 100%"
          >
            <el-option
              v-for="e in exitable"
              :key="e.entry_id"
              :label="`${e.entry_id} · ${e.material_name} · ${e.quantity}${e.unit}`"
              :value="e.entry_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selected" label="品牌/供应商">
          <span>{{ selected.brand_name }} / {{ selected.supplier }}</span>
        </el-form-item>
        <el-form-item v-if="selected" label="施工部位">
          <span>{{ selected.use_part || '—' }}</span>
        </el-form-item>
        <el-form-item label="退场数量" required>
          <el-input v-model="form.exit_qty" placeholder="数量" style="width: 160px" />
          <span v-if="selected" class="muted" style="margin-left: 8px">
            进场 {{ selected.quantity }}{{ selected.unit }}
          </span>
        </el-form-item>
        <el-form-item label="退场原因" required>
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="3"
            placeholder="请填写原因"
          />
        </el-form-item>
        <el-form-item label="现场照片">
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept="image/*"
            :on-change="onPhotoChange"
            :on-remove="onPhotoRemove"
          >
            <el-button>上传</el-button>
          </el-upload>
          <span class="muted" style="margin-left: 8px">非必填</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">登记退场</el-button>
      </template>
    </el-dialog>

    <!-- 退场详情 -->
    <el-dialog
      v-model="detailVisible"
      title="退场详情"
      width="640px"
      destroy-on-close
    >
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="退场单号">{{ detail.exit_id }}</el-descriptions-item>
          <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
          <el-descriptions-item label="材料名称">{{ detail.material_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联定样">{{ detail.sample_id || '—' }}</el-descriptions-item>
          <el-descriptions-item label="品牌">{{ detail.brand_name || '—' }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detail.supplier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="生产厂家">{{ detail.manufacturer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工部位">{{ detail.use_part || '—' }}</el-descriptions-item>
          <el-descriptions-item label="进场数量">
            <template v-if="detail.quantity != null">{{ detail.quantity }}{{ detail.unit }}</template>
            <template v-else>—</template>
          </el-descriptions-item>
          <el-descriptions-item label="退场数量">
            {{ detail.exit_qty }}{{ detail.unit || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="登记人">{{ detail.operator || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ detail.exit_time }}</el-descriptions-item>
          <el-descriptions-item label="退场原因" :span="2">{{ detail.reason }}</el-descriptions-item>
          <el-descriptions-item label="现场照片" :span="2">
            {{ detail.photo_file || '未上传' }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button type="primary" @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
