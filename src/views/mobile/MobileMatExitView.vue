<script setup>
/**
 * APP · 退场登记（现场照片仅拍照）
 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  getExitDetail,
  listExitableEntries,
  listExits,
  registerExit,
} from '../../mock/mat.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const mode = ref('list') // list | create | detail

const form = reactive({
  entry_id: '',
  exit_qty: '',
  reason: '',
  photo_file: '',
})
const photoPreview = ref('')
const detail = ref(null)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExits(scopeProjectId.value, {})
})

const exitable = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listExitableEntries(scopeProjectId.value)
})

const selected = computed(() => exitable.value.find((e) => e.entry_id === form.entry_id) || null)

function resetForm() {
  form.entry_id = ''
  form.exit_qty = ''
  form.reason = ''
  form.photo_file = ''
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
  }
}

function openCreate() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  resetForm()
  mode.value = 'create'
}

function openDetail(row) {
  detail.value = getExitDetail(row.exit_id)
  mode.value = 'detail'
}

function takePhoto() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    form.photo_file = `拍照-退场现场-${Date.now()}.jpg`
    photoPreview.value = URL.createObjectURL(file)
    ElMessage.success('已拍照')
  }
  input.click()
}

function clearPhoto() {
  form.photo_file = ''
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
  }
}

function onSubmit() {
  if (!form.entry_id) return ElMessage.warning('请选择进场单')
  if (!form.exit_qty || Number(form.exit_qty) <= 0) return ElMessage.warning('请填写退场数量')
  if (!form.reason.trim()) return ElMessage.warning('请填写退场原因')
  if (!form.photo_file) return ElMessage.warning('请拍照上传现场照片')

  const r = registerExit({
    entry_id: form.entry_id,
    exit_qty: form.exit_qty,
    reason: form.reason,
    photo_file: form.photo_file,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('退场已登记生效')
  resetForm()
  mode.value = 'list'
  tick.value += 1
}

function goBack() {
  if (mode.value !== 'list') {
    mode.value = 'list'
    return
  }
  router.back()
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">
        {{ mode === 'create' ? '登记退场' : mode === 'detail' ? '退场详情' : '退场登记' }}
      </h1>
      <button v-if="mode === 'list'" type="button" class="mh-action" @click="openCreate">登记</button>
    </header>

    <template v-if="mode === 'list'">
      <div v-if="isHqSelected" class="tip-banner">请先在顶部切换到具体项目</div>
      <div v-else class="tip-banner muted">当前：{{ scopeProjectLabel }} · 现场照片仅拍照</div>

      <div class="list-body">
        <div v-if="!list.length" class="empty">暂无退场记录</div>
        <button
          v-for="row in list"
          :key="row.exit_id"
          type="button"
          class="card"
          @click="openDetail(row)"
        >
          <div class="card-top">
            <span class="card-id">{{ row.exit_id }}</span>
            <span class="card-time">{{ row.exit_time }}</span>
          </div>
          <div class="card-title">{{ row.material_name || row.entry_id }}</div>
          <div class="card-meta">
            进场单 {{ row.entry_id }} · 退场 {{ row.exit_qty }}{{ row.unit || '' }}
          </div>
          <div class="card-meta">{{ row.reason || '—' }}</div>
        </button>
      </div>

      <div class="bottom-bar">
        <button type="button" class="submit-btn" @click="openCreate">＋ 登记退场</button>
      </div>
    </template>

    <template v-else-if="mode === 'create'">
      <div class="form-body">
        <section class="form-section">
          <div class="fs-title">退场信息</div>
          <div class="form-row">
            <span class="form-label">进场单<span class="required-mark">*</span></span>
            <select v-model="form.entry_id" class="form-input">
              <option value="" disabled>请选择可退场进场单</option>
              <option v-for="e in exitable" :key="e.entry_id" :value="e.entry_id">
                {{ e.entry_id }} · {{ e.material_name }} · 余量 {{ e.quantity }}{{ e.unit }}
              </option>
            </select>
          </div>
          <div v-if="selected" class="hint-box">
            品牌 {{ selected.brand_name || '—' }} · 供应商 {{ selected.supplier || '—' }}
          </div>
          <div class="form-row">
            <span class="form-label">退场数量<span class="required-mark">*</span></span>
            <input
              v-model="form.exit_qty"
              class="form-input"
              type="number"
              :placeholder="selected ? `最多 ${selected.quantity}${selected.unit || ''}` : '数量'"
            />
          </div>
          <div class="form-row">
            <span class="form-label">退场原因<span class="required-mark">*</span></span>
            <textarea
              v-model="form.reason"
              class="form-textarea"
              rows="3"
              placeholder="请填写退场原因"
            />
          </div>
          <div class="form-row">
            <span class="form-label">现场照片<span class="required-mark">*</span></span>
            <div class="photo-group">
              <div v-if="form.photo_file" class="photo-box">
                <img v-if="photoPreview" :src="photoPreview" alt="" />
                <span v-else>📷 已拍</span>
                <button type="button" class="photo-del" @click="clearPhoto">✕</button>
              </div>
              <button v-else type="button" class="photo-add" @click="takePhoto">+ 拍照</button>
            </div>
          </div>
        </section>
      </div>
      <div class="bottom-bar">
        <button type="button" class="submit-btn" @click="onSubmit">提交退场登记</button>
      </div>
    </template>

    <template v-else-if="mode === 'detail' && detail">
      <div class="form-body">
        <section class="form-section">
          <div class="fs-title">退场详情</div>
          <div class="detail-row"><span>退场单号</span><b>{{ detail.exit_id }}</b></div>
          <div class="detail-row"><span>进场单号</span><b>{{ detail.entry_id }}</b></div>
          <div class="detail-row"><span>材料名称</span><b>{{ detail.material_name || '—' }}</b></div>
          <div class="detail-row">
            <span>退场数量</span><b>{{ detail.exit_qty }}{{ detail.unit || '' }}</b>
          </div>
          <div class="detail-row"><span>退场原因</span><b>{{ detail.reason || '—' }}</b></div>
          <div class="detail-row"><span>现场照片</span><b>{{ detail.photo_file || '—' }}</b></div>
          <div class="detail-row"><span>登记时间</span><b>{{ detail.exit_time || '—' }}</b></div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mp {
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}
.mh {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mb {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  padding: 0 4px 0 0;
  line-height: 1;
  cursor: pointer;
}
.mt {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.mh-action {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #fff;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.tip-banner {
  margin: 10px 16px 0;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 12px;
  color: #ad6800;
}
.tip-banner.muted {
  background: #fff;
  color: #666;
}
.list-body,
.form-body {
  flex: 1;
  padding: 12px 16px;
}
.empty {
  text-align: center;
  color: #999;
  padding: 48px 0;
  font-size: 14px;
}
.card {
  width: 100%;
  text-align: left;
  background: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.card-id {
  font-size: 12px;
  color: #8f0045;
  font-weight: 600;
}
.card-time {
  font-size: 11px;
  color: #999;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 4px;
}
.card-meta {
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}
.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.fs-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #8f0045;
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  align-items: flex-start;
}
.form-label {
  color: #666;
  flex-shrink: 0;
  width: 72px;
  font-size: 13px;
  padding-top: 8px;
}
.required-mark {
  color: #e53935;
}
.form-input,
.form-textarea {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  min-width: 0;
}
.form-textarea {
  resize: none;
}
.hint-box {
  margin: -6px 0 12px 80px;
  font-size: 12px;
  color: #888;
}
.photo-group {
  flex: 1;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.photo-box {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  overflow: hidden;
}
.photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  line-height: 18px;
}
.photo-add {
  width: 72px;
  height: 72px;
  border: 1px dashed #c0c4cc;
  border-radius: 8px;
  background: #fafafa;
  color: #8f0045;
  font-size: 12px;
  cursor: pointer;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}
.detail-row span {
  color: #888;
  flex-shrink: 0;
}
.detail-row b {
  font-weight: 500;
  color: #333;
  text-align: right;
  word-break: break-all;
}
.bottom-bar {
  position: sticky;
  bottom: 0;
  width: 100%;
  margin-top: auto;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 5;
}
.submit-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px;
  background: #8f0045;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
</style>
