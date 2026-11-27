<script setup>
import { canExecuteInspectionStep } from '../../utils/inspectionWorkflowIdentity'
import { ref, computed, onMounted, onScopeDispose, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getLatestInspectionRectification, getVisibleMobileRectification, submitInspectionRectification } from '../../composables/useMobileRectification'
import { useInspectionRectificationPhotoPreviews } from '../../composables/useInspectionRectificationPhotoPreviews'
import { validateAttachFile } from '../../constants/attachmentUpload.js'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'
import MobileRectifyBasicInfo from '../../components/MobileRectifyBasicInfo.vue'

import { workflowFlowRecords, currentWorkflowStep, isInspectionRectificationReturned } from '../../utils/inspectionRectificationWorkflow'

function today() {
 const date = new Date()
 return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

const route = useRoute()
const router = useRouter()
const { rectifyBase } = useMobileRouteBase()
const rid = computed(() => route.params.id)

const record = computed(() => getVisibleMobileRectification(rid.value))
const missing = computed(() => !record.value)
const isRectification = computed(() => currentWorkflowStep(record.value)?.key === 'rectify')
const canHandle = computed(() => isRectification.value && canExecuteInspectionStep(record.value, 'rectify'))

const rectDate = ref(today())
const rectPhotos = ref([])
const rectNote = ref('')
const flowCollapsed = ref(false)
const submitting = ref(false)
const editingReturned = computed(() => canHandle.value && isInspectionRectificationReturned(record.value))
const photoPreviews = useInspectionRectificationPhotoPreviews()
const uploadedUrls = new Set()

function clearUploadedPhotos() {
  uploadedUrls.forEach(url => URL.revokeObjectURL(url))
  uploadedUrls.clear()
}

onScopeDispose(clearUploadedPhotos)

onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

watch([rid, editingReturned], async () => {
  photoPreviews.clear()
  clearUploadedPhotos()
  const previous = editingReturned.value ? getLatestInspectionRectification(record.value) : null
  rectDate.value = previous?.date || today()
  rectNote.value = previous?.note || ''
  rectPhotos.value = []
  if (!previous?.photos.length) return
  const restored = await photoPreviews.load(previous.photos)
  if (restored) rectPhotos.value = restored
}, { immediate: true })

const flowRecords = computed(() => workflowFlowRecords(record.value))

function triggerPhoto() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const error = validateAttachFile(file, 'image', { currentCount: rectPhotos.value.length })
    if (error) return ElMessage.warning(error)
    const url = URL.createObjectURL(file)
    uploadedUrls.add(url)
    rectPhotos.value.push({ name: file.name, url })
  }
  input.click()
}
function removePhoto(i) {
  const [removed] = rectPhotos.value.splice(i, 1)
  if (uploadedUrls.delete(removed?.url)) URL.revokeObjectURL(removed.url)
}

async function submitRectify() {
  if (!canHandle.value || submitting.value || photoPreviews.loading.value) return
  if (missing.value) {
    ElMessage.error('未找到整改单，无法提交')
    return
  }
  if (!rectDate.value) {
    ElMessage.warning('请选择整改日期')
    return
  }
  if (rectPhotos.value.length === 0) {
    ElMessage.warning('请至少上传一张整改照片')
    return
  }
  if (!rectNote.value.trim()) {
    ElMessage.warning('请填写整改说明')
    return
  }
  submitting.value = true
  try {
    const ok = await submitInspectionRectification(rid.value, {
      rectificationDate: rectDate.value,
      rectificationNote: rectNote.value.trim(),
      rectificationPhotos: [...rectPhotos.value],
    })
    if (!ok) return ElMessage.error('提交失败，当前节点可能已变更，请返回列表刷新后重试')
  } catch {
    return ElMessage.error('整改照片保存失败，请检查浏览器存储空间后重试')
  } finally {
    submitting.value = false
  }
  ElMessage.success(`整改结果已提交，已流转至${record.value.currentNode}`)
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}

function goBack() {
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">{{ editingReturned ? '编辑整改' : '整改执行' }}</h1>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <div v-if="!isRectification" class="empty-tip">当前节点：{{ record.currentNode || '流程结束' }}</div>
      <MobileRectifyBasicInfo :record="record" />

      <div class="section">
        <div class="section-title collapsible" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="ca">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </div>
        <div v-show="!flowCollapsed" class="fl">
          <div v-for="(f, i) in flowRecords" :key="i" class="fi" :class="{ cur: f.cur }">
            <div class="fd" :class="{ cur: f.cur }"></div>
            <div class="fc">
              <div class="fc-row">
                <span class="fa">{{ f.a }}</span>
                <span class="fd2">{{ f.d || '进行中' }}</span>
              </div>
              <span class="fd2">处理人：{{ f.by || '--' }}</span>
              <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sc">
        <div class="sct">隐患信息</div>
        <div class="ir"><span class="il">隐患类别</span><span>{{ record.hazardCategory || '安全管理' }}</span></div>
        <div class="ir"><span class="il">隐患等级</span><span>{{ record.hazardLevel || '未设置' }}</span></div>
        <div class="ir"><span class="il">整改要求</span><span style="white-space:pre-wrap">{{ record.rectifyRequirement || '未填写' }}</span></div>
        <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
        <div class="ir"><span class="il">隐患照片</span><span>{{ displayPhotos(record.hazardPhotos) }}</span></div>
      </div>

      <div v-if="canHandle" class="sc">
        <div class="sct">{{ editingReturned ? '编辑上次整改内容' : '本次整改' }}</div>
        <div class="fr"><span class="fl-label">整改日期 <i class="req">*</i></span><input type="date" v-model="rectDate" class="fi-input" /></div>
        <div class="fr">
          <span class="fl-label">整改照片 <i class="req">*</i></span>
          <div class="pg">
            <div v-for="(photo, i) in rectPhotos" :key="i" class="pb">
              <el-image v-if="photo.url" :src="photo.url" :alt="photo.name" fit="cover" :preview-src-list="[photo.url]" preview-teleported />
              <span v-else>{{ photo.name }}</span>
              <button class="pd" type="button" :aria-label="'移除整改照片 ' + (i + 1)" @click="removePhoto(i)">✕</button>
            </div>
            <button class="pa" type="button" :disabled="photoPreviews.loading.value" @click="triggerPhoto">+ 拍照</button>
          </div>
        </div>
        <div class="fr"><span class="fl-label">整改说明 <i class="req">*</i></span><textarea v-model="rectNote" class="fta" placeholder="请描述整改情况..." rows="3"></textarea></div>
      </div>

      <div v-if="canHandle" class="bb">
        <button class="sb" :disabled="submitting || photoPreviews.loading.value" @click="submitRectify">✓ 提交整改结果</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.empty-tip { margin:40px 16px; padding:24px; text-align:center; color:#999; background:#fff; border-radius:10px; }


.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }

.fr { display:flex; gap:8px; margin-bottom:12px; align-items:flex-start; }
.fl-label { color:#666; flex-shrink:0; width:72px; font-size:13px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.fi-input { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.fta { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; }
.pg { flex:1; display:flex; gap:6px; flex-wrap:wrap; }
.pb :deep(.el-image) { width:100%; height:100%; border-radius:8px; }
.pb { width:68px; height:68px; border:1px solid #ddd; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; position:relative; background:#f0faf0; }
.pd { position:absolute; top:2px; right:2px; width:18px; height:18px; border-radius:50%; border:none; background:rgba(0,0,0,0.4); color:#fff; font-size:10px; cursor:pointer; }
.pa { width:68px; height:68px; border:1.5px dashed #ddd; border-radius:8px; background:#fafafa; font-size:12px; color:#999; cursor:pointer; }

.section { background:#fff; border-radius:10px; padding:12px 16px 6px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.section-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:8px; padding-left:10px; border-left:3px solid #8f0045; }
.section-title.collapsible { cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.ca { font-size:12px; color:#999; font-weight:400; }
.fl { padding-left:6px; }
.fi { display:flex; gap:10px; padding-bottom:14px; position:relative; }
.fi::before { content:''; position:absolute; left:7px; top:15px; bottom:0; width:1px; background:#e0e0e0; }
.fi:last-child::before { display:none; }
.fd { width:14px; height:14px; border-radius:50%; background:#4285f4; flex-shrink:0; margin-top:2px; }
.fd.cur { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.fc { display:flex; flex-direction:column; gap:4px; flex:1; }
.fc-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
.fa { font-size:13px; color:#1f2329; font-weight:500; }
.fd2 { font-size:12px; color:#999; flex-shrink:0; }
.fdl { font-size:11px; color:#606266; background:#f5f7fa; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; font-weight:600; }

.bb { position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:10px 16px; padding-bottom:calc(10px+env(safe-area-inset-bottom,0)); }
.sb { width:100%; padding:14px; border:none; border-radius:10px; background:#8f0045; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
</style>
