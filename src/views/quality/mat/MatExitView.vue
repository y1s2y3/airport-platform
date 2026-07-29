<script setup>
import './mat-page.css'
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listExitableEntries,
  listExits,
  registerExit,
} from '../../../mock/mat.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)

const form = reactive({
  entry_id: '',
  exit_qty: '',
  reason: '',
  photo_file: '',
})

const exitable = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExitableEntries(scopeProjectId.value)
})

const exits = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExits(scopeProjectId.value)
})

const selected = computed(() => exitable.value.find((e) => e.entry_id === form.entry_id) || null)

function mockPhoto() {
  form.photo_file = '退场照片-演示.jpg'
  ElMessage.success('已模拟上传退场照片（非必填）')
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
  form.entry_id = ''
  form.exit_qty = ''
  form.reason = ''
  form.photo_file = ''
  tick.value += 1
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料退场登记</div>
      <h1 class="page-title">材料退场登记</h1>
      <p class="page-tip">
        施工登记即生效 · 照片非必填 · 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
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
      <section class="form-section">
        <h2 class="section-title">登记退场</h2>
        <el-form label-width="110px">
          <el-form-item label="进场单" required>
            <el-select
              v-model="form.entry_id"
              filterable
              clearable
              placeholder="选择已通过且未退场的进场单"
              style="width: 100%; max-width: 520px"
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
          <el-form-item label="退场数量" required>
            <el-input v-model="form.exit_qty" style="width: 200px" placeholder="数量" />
            <span v-if="selected" class="muted" style="margin-left: 8px">
              进场 {{ selected.quantity }}{{ selected.unit }}
            </span>
          </el-form-item>
          <el-form-item label="退场原因" required>
            <el-input
              v-model="form.reason"
              type="textarea"
              :rows="3"
              style="max-width: 520px"
              placeholder="请填写原因"
            />
          </el-form-item>
          <el-form-item label="现场照片">
            <el-button @click="mockPhoto">模拟上传（非必填）</el-button>
            <span class="muted" style="margin-left: 8px">{{ form.photo_file || '未上传' }}</span>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onSubmit">登记退场</el-button>
          </el-form-item>
        </el-form>
      </section>

      <el-card shadow="never">
        <template #header>本项目退场记录</template>
        <el-table :data="exits" stripe border empty-text="暂无退场记录">
          <el-table-column prop="exit_id" label="退场单号" width="130" />
          <el-table-column prop="entry_id" label="进场单号" width="110" />
          <el-table-column prop="exit_qty" label="数量" width="90" />
          <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="photo_file" label="照片" width="140">
            <template #default="{ row }">{{ row.photo_file || '—' }}</template>
          </el-table-column>
          <el-table-column prop="exit_time" label="登记时间" width="170" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>
