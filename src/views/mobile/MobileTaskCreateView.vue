<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { addMobileInspectionTask } from '../../mock/mobileInspectionTasks'
import { INSPECTION_CATEGORIES, buildInspectionTaskNo } from '../../config/inspectionManagement'
import {
  inspectorCandidates,
  getProjectRectifierLabel,
  getProjectReviewerLabel,
} from '../../composables/useInspectionPersonConfig'

const router = useRouter()

const form = ref({
  inspectionCategory: '安全',
  inspDate: new Date().toISOString().slice(0, 10),
  project: '',
  inspector: '当前用户',
  companions: [],
  photos: [],
  result: '',
  // 每条隐患独立配置整改单，巡检单：隐患：整改单 = 1：n：n
  hazardItems: [],
})

const projectOptions = ['T3 航站楼扩建工程', '飞行区跑道延长工程', '新货运站建设工程', '机场北片区路网工程', '员工宿舍楼工程']
const personOptions = inspectorCandidates.map(p => `${p.name}（${p.role}）`)
const companionOptions = ['刘工（安全员）', '陈工（技术员）', '周工（施工员）', '吴工（质检员）']

const selectedCompanion = ref('')
function addCompanion() {
  if (selectedCompanion.value && !form.value.companions.includes(selectedCompanion.value)) {
    form.value.companions.push(selectedCompanion.value)
  }
  selectedCompanion.value = ''
}

function addHazard() {
  const defaultRectifier = getProjectRectifierLabel(form.value.project)
  const defaultReviewer = getProjectReviewerLabel(form.value.project)
  form.value.hazardItems.push({
    desc: '',
    photos: [],
    rectifyPerson: defaultRectifier,
    reviewPerson: defaultReviewer,
    rectifyDeadline: '',
  })
}

watch(() => form.value.project, project => {
  form.value.hazardItems.forEach(item => {
    item.rectifyPerson = getProjectRectifierLabel(project)
    item.reviewPerson = getProjectReviewerLabel(project)
  })
})
function removeHazard(idx) {
  form.value.hazardItems.splice(idx, 1)
}
function triggerHazardPhoto(idx) {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) form.value.hazardItems[idx].photos.push(URL.createObjectURL(file))
  }
  input.click()
}
function removeHazardPhoto(itemIdx, photoIdx) {
  form.value.hazardItems[itemIdx].photos.splice(photoIdx, 1)
}

function triggerPhoto() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) form.value.photos.push(URL.createObjectURL(file))
  }
  input.click()
}

function removePhoto(i) { form.value.photos.splice(i, 1) }

function submitInspection() {
  if (!form.value.inspectionCategory) { ElMessage.warning('请选择巡检分类'); return }
  if (!form.value.inspDate) { ElMessage.warning('请选择巡检日期'); return }
  if (!form.value.project) { ElMessage.warning('请选择所属项目'); return }
  if (!form.value.result) { ElMessage.warning('请选择巡检结果'); return }
  if (form.value.result === 'normal' && form.value.photos.length === 0) {
    ElMessage.warning('全部正常时请至少上传一张巡检照片')
    return
  }
  if (form.value.result === 'hazard') {
    if (form.value.hazardItems.length === 0) { ElMessage.warning('请至少添加一条隐患'); return }
    for (const [i,item] of form.value.hazardItems.entries()) {
      if (!item.desc.trim()) { ElMessage.warning(`第 ${i+1} 条隐患请填写说明`); return }
      if (!item.photos?.length) { ElMessage.warning(`第 ${i+1} 条隐患请至少上传一张照片`); return }
      if (!item.rectifyPerson) {
        ElMessage.warning(`第 ${i+1} 条隐患请选择整改人`)
        return
      }
      if (!item.reviewPerson) {
        ElMessage.warning(`第 ${i+1} 条隐患请选择复查人`)
        return
      }
      if (!item.rectifyDeadline) {
        ElMessage.warning(`第 ${i+1} 条隐患请选择整改截止日期`)
        return
      }
    }
  }

  const now = Date.now()
  const dateKey = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const taskNo = buildInspectionTaskNo(form.value.inspectionCategory, form.value.inspDate, Number(String(now).slice(-3)))
  const hazardItems = form.value.hazardItems.map((item, index) => {
    const rectifyNo = `ZG${dateKey}${String(now).slice(-4)}${String(index + 1).padStart(2, '0')}`
    return {
      desc: item.desc,
      photos: [...item.photos],
      hasRectify: true,
      rectifyNo,
      rectifyId: `self-${rectifyNo}`,
      rectifyPerson: item.rectifyPerson,
      reviewPerson: item.reviewPerson,
      rectifyDeadline: item.rectifyDeadline,
    }
  })
  const rectifyCount = hazardItems.length

  const newTask = {
    id: `self-${now}`,
    taskNo,
    source: '系统自建', inspectionCategory: form.value.inspectionCategory,
    taskName: `${form.value.project}${form.value.inspectionCategory}检查`,
    project: form.value.project, executor: form.value.inspector,
    inspector: form.value.inspector, companions: [...form.value.companions],
    deadline: form.value.inspDate, status: '已完成',
    inspDate: form.value.inspDate,
    submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    itemCount: 0, hazardCount: form.value.hazardItems.length,
    photos: form.value.photos,
    result: form.value.result,
    normalPhotos: form.value.result === 'normal' ? [...form.value.photos] : [],
    hazardItems,
    hasRectify: rectifyCount > 0,
    rectifyCount,
  }

  addMobileInspectionTask(newTask)
  ElMessage.success(`巡检记录已提交${rectifyCount ? `，已下发 ${rectifyCount} 份整改单` : ''}`)
  router.push('/mobile/tasks')
}

function goBack() { router.push('/mobile/tasks') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">新建巡检</h1>
    </header>

    <div class="form-body">
      <div class="form-section">
        <div class="fs-title">巡检信息</div>

        <div class="form-row">
          <span class="form-label">巡检分类<span class="required-mark">*</span></span>
          <div class="form-tags">
            <button v-for="category in INSPECTION_CATEGORIES" :key="category" class="tag-btn" :class="{ active: form.inspectionCategory === category }" @click="form.inspectionCategory = category">{{ category }}</button>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">巡检日期<span class="required-mark">*</span></span>
          <input type="date" v-model="form.inspDate" class="form-input" />
        </div>

        <div class="form-row">
          <span class="form-label">所属项目<span class="required-mark">*</span></span>
          <select v-model="form.project" class="form-input">
            <option value="" disabled>请选择项目</option>
            <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <div class="form-row">
          <span class="form-label">执行人</span>
          <input :value="form.inspector" class="form-input" disabled />
        </div>

        <div class="form-row">
          <span class="form-label">同行人</span>
          <div class="companion-group">
            <span v-for="(c,i) in form.companions" :key="i" class="comp-tag">{{ c }}<button class="comp-del" @click="form.companions.splice(i,1)">✕</button></span>
            <select v-model="selectedCompanion" class="form-input comp-select" @change="addCompanion">
              <option value="" disabled>添加同行人</option>
              <option v-for="p in companionOptions" :key="p" :value="p" :disabled="form.companions.includes(p)">{{ p }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="fs-title">巡检结果</div>

        <div v-if="form.result === 'normal'" class="form-row">
          <span class="form-label">巡检照片<span class="required-mark">*</span></span>
          <div class="photo-group">
            <div v-for="(url,i) in form.photos" :key="i" class="photo-box"><span>📷 已拍</span><button class="photo-del" @click="removePhoto(i)">✕</button></div>
            <button class="photo-add" @click="triggerPhoto">+ 拍照</button>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">是否有隐患<span class="required-mark">*</span></span>
          <div class="result-group">
            <button class="result-btn ok" :class="{ active: form.result === 'normal' }" @click="form.result = 'normal'; form.hazardItems = []">✓ 全部正常</button>
            <button class="result-btn hazard" :class="{ active: form.result === 'hazard' }" @click="form.result = 'hazard'; if (form.hazardItems.length===0) addHazard()">⚠ 有隐患</button>
          </div>
        </div>

        <!-- 隐患列表（可新增多条） -->
        <div v-if="form.result === 'hazard'" class="hazard-list">
          <div v-for="(item, idx) in form.hazardItems" :key="idx" class="hazard-item-row">
            <div class="hi-header">
              <span class="hi-num">⚠ 隐患 {{ idx + 1 }}</span>
              <button v-if="form.hazardItems.length > 1" class="hi-remove" @click="removeHazard(idx)">✕</button>
            </div>
            <div class="form-row">
              <span class="form-label" style="width:56px">说明<span class="required-mark">*</span></span>
              <textarea v-model="item.desc" class="form-textarea" placeholder="请描述隐患情况..." rows="2"></textarea>
            </div>
            <div class="form-row">
              <span class="form-label" style="width:56px">照片<span class="required-mark">*</span></span>
              <div class="photo-group">
                <div v-for="(url,pi) in item.photos" :key="pi" class="photo-box"><span>📷</span><button class="photo-del" @click="removeHazardPhoto(idx, pi)">✕</button></div>
                <button class="photo-add" @click="triggerHazardPhoto(idx)">+ 拍照</button>
              </div>
            </div>
            <div class="rectify-section">
              <div class="rectify-required-tip">
                发现隐患后将自动生成整改单，请完善整改信息
              </div>
              <div class="form-row">
                <span class="form-label">整改人<span class="required-mark">*</span></span>
                <select v-model="item.rectifyPerson" class="form-input">
                  <option value="" disabled>请选择整改人</option>
                  <option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-row">
                <span class="form-label">复查人<span class="required-mark">*</span></span>
                <select v-model="item.reviewPerson" class="form-input">
                  <option value="" disabled>请选择复查人</option>
                  <option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-row">
                  <span class="form-label">整改截止日期<span class="required-mark">*</span></span>
                <input type="date" v-model="item.rectifyDeadline" class="form-input" />
              </div>
            </div>
          </div>
          <button class="add-hazard-btn" @click="addHazard">+ 新增隐患项</button>
          <div class="rectify-summary">
            已录入 {{ form.hazardItems.length }} 条隐患，将下发
            {{ form.hazardItems.length }} 份整改单
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="submit-btn" @click="submitInspection">✓ 提交巡检记录</button>
    </div>
  </div>
</template>

<style scoped>
.companion-group { flex:1; display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
.comp-tag { display:inline-flex; align-items:center; gap:2px; padding:3px 8px; background:#f0f0f0; border-radius:4px; font-size:12px; color:#333; }
.comp-del { background:none; border:none; font-size:10px; color:#999; cursor:pointer; padding:0; margin-left:2px; }
.comp-select { width:auto; min-width:110px; }
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); display:flex; flex-direction:column; }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }
.form-body { flex:1; padding:12px 16px; overflow-y:auto; }
.form-section { background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.fs-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:12px; padding-left:8px; border-left:3px solid #8f0045; }
.form-row { display:flex; gap:8px; margin-bottom:14px; align-items:flex-start; }
.form-row:last-child { margin-bottom:0; }
.form-label { color:#666; flex-shrink:0; width:72px; font-size:13px; padding-top:4px; }
.required-mark { color:#e53935; margin-left:2px; font-weight:600; }
.form-input { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; background:#fff; }
.form-textarea { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; }
.form-tags { flex:1; display:flex; gap:6px; flex-wrap:wrap; }
.tag-btn { padding:6px 14px; border:1px solid #ddd; border-radius:16px; background:#fff; font-size:13px; color:#666; cursor:pointer; }
.tag-btn.active { background:#8f0045; color:#fff; border-color:#8f0045; }
.photo-group { flex:1; display:flex; gap:6px; flex-wrap:wrap; }
.photo-box { width:68px; height:68px; border:1px solid #ddd; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; position:relative; background:#f0faf0; }
.photo-del { position:absolute; top:2px; right:2px; width:18px; height:18px; border-radius:50%; border:none; background:rgba(0,0,0,0.4); color:#fff; font-size:10px; cursor:pointer; }
.photo-add { width:68px; height:68px; border:1.5px dashed #ddd; border-radius:8px; background:#fafafa; font-size:12px; color:#999; cursor:pointer; }

/* 隐患列表 */
.hazard-list { width:100%; }
.hazard-item-row { background:#fafafa; border-radius:8px; padding:10px; margin-bottom:8px; }
.hi-header { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
.hi-num { font-size:12px; font-weight:600; color:#e53935; }
.hi-remove { margin-left:auto; width:20px; height:20px; border-radius:50%; border:none; background:#ffebee; color:#e53935; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.add-hazard-btn { width:100%; padding:10px; border:1.5px dashed #ddd; border-radius:8px; background:#fafafa; font-size:13px; color:#999; cursor:pointer; }
.rectify-section { margin-top:10px; padding-top:10px; border-top:1px solid #eee; }
.rectify-section .form-label { width:72px !important; }
.rectify-required-tip { margin-bottom:10px; padding:7px 9px; border-radius:6px; background:#fff3e0; color:#b26a00; font-size:12px; }
.rectify-summary { margin-top:8px; padding:8px 10px; border-radius:6px; background:#fceef4; color:#8f0045; font-size:12px; text-align:center; }

.result-group { flex:1; display:flex; gap:8px; }
.result-btn { flex:1; padding:10px; border:1.5px solid #ddd; border-radius:8px; background:#fff; font-size:13px; font-weight:500; cursor:pointer; }
.result-btn.ok.active { border-color:#34a853; color:#34a853; background:#e8f5e9; }
.result-btn.hazard.active { border-color:#e53935; color:#e53935; background:#ffebee; }
.bottom-bar { position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:10px 16px; padding-bottom:calc(10px + env(safe-area-inset-bottom,0)); }
.submit-btn { width:100%; padding:14px; border:none; border-radius:10px; background:#8f0045; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
</style>
