<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { checkCategoryTree, getItemLabel } from '../../composables/useInspectionPlan'

const route = useRoute()
const router = useRouter()

const taskInfo = {
  id: route.params.id,
  planName: '7月第4周安全巡检',
  project: '飞行区跑道延长工程',
  executor: '当前用户',
  deadline: '2026-07-28',
  planType: '周检',
}

// 巡检结果
const inspectResult = ref('') // '' | 'normal' | 'hazard'

// 检查项列表（仅查看）
const catTabs = computed(() => checkCategoryTree.map(c => ({ id: c.id, label: c.label })))
const activeCat = ref(catTabs.value[0]?.id || '')
const currentCatItems = computed(() => {
  const cat = checkCategoryTree.find(c => c.id === activeCat.value)
  return cat ? cat.items : []
})

// 隐患列表（类似系统自建）
const hazardItems = ref([])

function addHazard() {
  hazardItems.value.push({
    desc: '',
    photos: [],
    issueRectify: false,
    rectifyPerson: '',
    rectifyDeadline: '',
  })
}

function removeHazard(idx) {
  hazardItems.value.splice(idx, 1)
}

function triggerHazardPhoto(idx) {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) hazardItems.value[idx].photos.push(URL.createObjectURL(file))
  }
  input.click()
}

function removeHazardPhoto(itemIdx, photoIdx) {
  hazardItems.value[itemIdx].photos.splice(photoIdx, 1)
}

const personOptions = ['张工（安全总监）', '李工（安全主管）', '赵工（项目经理）']
const companionOptions = ['刘工（安全员）', '陈工（技术员）', '周工（施工员）', '吴工（质检员）']
const hasHazard = computed(() => hazardItems.value.length > 0)

const inspector = ref('')
const companions = ref([])
const selectedCompanion = ref('')
function addCompanion() {
  if (selectedCompanion.value && !companions.value.includes(selectedCompanion.value)) {
    companions.value.push(selectedCompanion.value)
  }
  selectedCompanion.value = ''
}

// 全部正常时的巡检照片
const normalPhotos = ref([])
function triggerNormalPhoto() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) normalPhotos.value.push(URL.createObjectURL(file))
  }
  input.click()
}
function removeNormalPhoto(idx) { normalPhotos.value.splice(idx, 1) }

function submitCheck() {
  if (!inspector.value) { ElMessage.warning('请选择巡检人'); return }
  if (!inspectResult.value) { ElMessage.warning('请选择巡检结果'); return }
  if (inspectResult.value === 'hazard') {
    if (hazardItems.value.length === 0) { ElMessage.warning('请至少新增一条隐患'); return }
    for (const [i, item] of hazardItems.value.entries()) {
      if (!item.desc.trim()) { ElMessage.warning(`第 ${i+1} 条隐患请填写说明`); return }
      if (item.issueRectify && !item.rectifyPerson) { ElMessage.warning(`第 ${i+1} 条隐患请选择整改人`); return }
      if (item.issueRectify && !item.rectifyDeadline) { ElMessage.warning(`第 ${i+1} 条隐患请选择整改截止日期`); return }
    }
  }
  ElMessage.success('检查结果已提交')
  router.push(`/mobile/tasks/${route.params.id}`)
}

function goBack() { router.push('/mobile/tasks') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">执行巡检</h1>
    </header>

    <div class="task-bar">
      <div class="task-bar-top">
        <span class="task-bar-name">{{ taskInfo.planName }}</span>
        <span class="task-bar-tag">{{ taskInfo.planType }}</span>
      </div>
      <div class="task-bar-info">
        <span>{{ taskInfo.project }}</span>
        <span>执行人：{{ taskInfo.executor }}</span>
        <span>截止：{{ taskInfo.deadline }}</span>
      </div>
      <div class="task-bar-form">
        <div class="tbf-row">
          <span class="tbf-label">巡检人 <i class="req">*</i></span>
          <select v-model="inspector" class="tbf-select">
            <option value="" disabled>请选择</option>
            <option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="tbf-row">
          <span class="tbf-label">同行人</span>
          <div class="tbf-tags">
            <span v-for="(p,i) in companions" :key="i" class="tbf-tag">{{ p }}<button class="tbf-tag-del" @click="companions.splice(i,1)">✕</button></span>
            <select v-model="selectedCompanion" class="tbf-select tbf-select-sm" @change="addCompanion">
              <option value="" disabled>添加同行人</option>
              <option v-for="p in companionOptions" :key="p" :value="p" :disabled="companions.includes(p)">{{ p }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 检查项（仅查看） -->
    <div class="check-body">
      <div class="left-tabs">
        <button v-for="cat in catTabs" :key="cat.id" class="left-tab" :class="{ active: activeCat === cat.id }" @click="activeCat = cat.id">
          {{ cat.label }}
        </button>
      </div>
      <div class="right-items">
        <div v-for="item in currentCatItems" :key="item.id" class="ci-card">
          <div class="ci-name">{{ item.label }}</div>
        </div>
      </div>
    </div>

    <!-- 巡检结果 -->
    <div class="result-bar">
      <div class="result-title">巡检结果 <i class="req">*</i></div>
      <div class="result-group">
        <button class="result-btn ok" :class="{ active: inspectResult === 'normal' }" @click="inspectResult = 'normal'">✓ 全部正常</button>
        <button class="result-btn hazard" :class="{ active: inspectResult === 'hazard' }" @click="inspectResult = 'hazard'; if(hazardItems.length===0) addHazard()">⚠ 有隐患</button>
      </div>

      <div class="result-detail" :class="{ idle: !inspectResult }">
        <div v-show="!inspectResult" class="result-placeholder">请选择巡检结果后填写明细</div>

        <div v-show="inspectResult === 'normal'" class="normal-photo">
          <div class="form-row">
            <span class="form-label">巡检照片</span>
            <div class="photo-group">
              <div v-for="(url,i) in normalPhotos" :key="i" class="photo-box"><span>📷</span><button class="photo-del" @click="removeNormalPhoto(i)">✕</button></div>
              <button class="photo-add" @click="triggerNormalPhoto">+ 拍照</button>
            </div>
          </div>
        </div>

        <div v-show="inspectResult === 'hazard'" class="hazard-area-inner">
          <div v-for="(item, idx) in hazardItems" :key="idx" class="hazard-card">
            <div class="hc-header">
              <span class="hc-num">⚠ 隐患 {{ idx + 1 }}</span>
              <button v-if="hazardItems.length > 1" class="hc-del" @click="removeHazard(idx)">✕</button>
            </div>
            <div class="form-row">
              <span class="form-label">说明 <i class="req">*</i></span>
              <textarea v-model="item.desc" class="form-ta" placeholder="请描述隐患情况..." rows="2"></textarea>
            </div>
            <div class="form-row">
              <span class="form-label">照片</span>
              <div class="photo-group">
                <div v-for="(url, pi) in item.photos" :key="pi" class="photo-box"><span>📷</span><button class="photo-del" @click="removeHazardPhoto(idx, pi)">✕</button></div>
                <button class="photo-add" @click="triggerHazardPhoto(idx)">+ 拍照</button>
              </div>
            </div>
            <div class="rectify-toggle-row">
              <label class="toggle-label">
                <span>下发整改单</span>
                <button type="button" class="toggle-btn" :class="{ on: item.issueRectify }" @click="item.issueRectify = !item.issueRectify">
                  <span class="toggle-dot"></span>
                </button>
              </label>
            </div>
            <div v-show="item.issueRectify" class="rectify-fields">
              <div class="rf-row"><span class="rf-label">整改人 <i class="req">*</i></span>
                <select v-model="item.rectifyPerson" class="rf-select"><option value="" disabled>请选择</option><option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option></select>
              </div>
              <div class="rf-row"><span class="rf-label">整改截止 <i class="req">*</i></span>
                <input type="date" v-model="item.rectifyDeadline" class="rf-select" />
              </div>
            </div>
          </div>
          <button type="button" class="add-hazard-btn" @click="addHazard">+ 新增隐患项</button>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <button class="submit-btn" @click="submitCheck">✓ 提交检查结果</button>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:env(safe-area-inset-bottom,0); display:flex; flex-direction:column; box-shadow:0 0 20px rgba(0,0,0,0.05); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }

.task-bar { background:#fff; padding:12px 16px; border-bottom:1px solid #eee; }
.task-bar-top { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.task-bar-name { font-size:15px; font-weight:600; color:#1f2329; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.task-bar-tag { font-size:10px; color:#f5a623; background:#fff8e6; padding:2px 6px; border-radius:3px; font-weight:500; flex-shrink:0; }
.task-bar-form { margin-top:10px; padding-top:10px; border-top:1px solid #f0f0f0; }
.tbf-row { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; }
.tbf-label { font-size:13px; color:#666; width:56px; flex-shrink:0; padding-top:6px; }
.tbf-select { flex:1; padding:6px 8px; border:1px solid #ddd; border-radius:6px; font-size:13px; background:#fff; }
.tbf-select-sm { padding:4px 6px; font-size:12px; min-width:110px; }
.tbf-tags { flex:1; display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
.tbf-tag { display:inline-flex; align-items:center; gap:2px; padding:2px 8px; background:#f0f0f0; border-radius:4px; font-size:12px; color:#333; }
.tbf-tag-del { background:none; border:none; font-size:10px; color:#999; cursor:pointer; padding:0; margin-left:2px; }
.task-bar-info { display:flex; gap:12px; font-size:12px; color:#999; flex-wrap:wrap; }

/* 检查项（仅查看） */
.check-body { flex:1; min-height: 160px; display:flex; overflow:hidden; }
.left-tabs { width:100px; flex-shrink:0; background:#fafafa; overflow-y:auto; border-right:1px solid #eee; padding:4px 0; }
.left-tab {
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  width:100%;
  padding:12px 6px;
  border:none;
  background:none;
  font-size:12px;
  color:#666;
  cursor:pointer;
  text-align:center;
  line-height:1.35;
  border-left:3px solid transparent;
  overflow:hidden;
  word-break:break-all;
}
.left-tab.active { color:#8f0045; font-weight:600; background:#fceef4; border-left-color:#8f0045; }
.right-items { flex:1; overflow-y:auto; padding:12px 14px; }
.ci-card { background:#fff; border-radius:10px; padding:12px 14px; margin-bottom:8px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
.ci-name { font-size:14px; color:#1f2329; line-height:1.5; }

/* 巡检结果 */
.result-bar { background:#fff; padding:12px 16px; border-top:1px solid #eee; }
.result-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:10px; }
.result-group { display:flex; gap:8px; margin-bottom:10px; }
.result-btn { flex:1; padding:10px; border:1.5px solid #ddd; border-radius:8px; background:#fff; font-size:13px; font-weight:500; cursor:pointer; text-align:center; }
.result-btn.ok.active { border-color:#34a853; background:#e8f5e9; color:#34a853; }
.result-btn.hazard.active { border-color:#e53935; background:#ffebee; color:#e53935; }
.result-detail {
  min-height: 88px;
  max-height: 42vh;
  overflow-y: auto;
  border: 1px dashed #eee;
  border-radius: 10px;
  padding: 10px;
  background: #fafafa;
}
.result-detail:not(.idle) {
  border-style: solid;
  border-color: #f0e0e4;
  background: #fff;
  min-height: 120px;
}
.result-placeholder {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #bbb;
}
.normal-photo { width: 100%; }
.hazard-area-inner { width: 100%; }

/* 隐患区域 */
.hazard-card { background:#fafafa; border-radius:10px; padding:14px; margin-bottom:10px; border:1px solid #f0e0e4; }
.hc-header { display:flex; align-items:center; margin-bottom:8px; }
.hc-num { font-size:13px; font-weight:600; color:#e53935; flex:1; }
.hc-del { width:20px; height:20px; border-radius:50%; border:none; background:#ffebee; color:#e53935; font-size:12px; cursor:pointer; }
.form-row { display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; }
.form-label { color:#666; flex-shrink:0; width:56px; font-size:13px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.rf-label .req { margin-left:2px; }
.form-ta { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; }
.photo-group { flex:1; display:flex; gap:6px; flex-wrap:wrap; }
.photo-box { width:56px; height:56px; border:1px solid #ddd; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px; position:relative; background:#f0faf0; }
.photo-del { position:absolute; top:-4px; right:-4px; width:18px; height:18px; border-radius:50%; border:none; background:rgba(0,0,0,0.4); color:#fff; font-size:10px; cursor:pointer; }
.photo-add { width:56px; height:56px; border:1.5px dashed #ddd; border-radius:8px; background:#fafafa; font-size:12px; color:#999; cursor:pointer; }

.rectify-toggle-row { margin-bottom:8px; }
.toggle-label { display:flex; align-items:center; gap:8px; font-size:13px; color:#666; cursor:pointer; }
.toggle-btn { width:40px; height:22px; border-radius:11px; border:none; background:#ddd; cursor:pointer; position:relative; padding:0; }
.toggle-btn.on { background:#8f0045; }
.toggle-dot { position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:left 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
.toggle-btn.on .toggle-dot { left:20px; }

.rectify-fields { display:flex; flex-direction:column; gap:8px; padding-top:6px; border-top:1px solid #f0f0f0; }
.rf-row { display:flex; align-items:center; gap:10px; }
.rf-label { font-size:13px; color:#666; width:72px; flex-shrink:0; }
.rf-select { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; font-family:inherit; }

.add-hazard-btn { width:100%; padding:10px; border:1.5px dashed #ddd; border-radius:8px; background:#fafafa; font-size:13px; color:#999; cursor:pointer; margin-bottom:10px; }

.bottom-bar { position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:10px 16px; padding-bottom:calc(10px + env(safe-area-inset-bottom,0)); }
.submit-btn { width:100%; padding:14px; border:none; border-radius:10px; background:#8f0045; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
.submit-btn:active { opacity:0.85; }
</style>
