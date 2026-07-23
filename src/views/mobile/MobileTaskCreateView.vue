<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions'
import { addMobileInspectionTask } from '../../mock/mobileInspectionTasks'

const router = useRouter()
const { isHqSelected, headerProjectLabel } = useCurrentProject()

/** 项目层级新建：默认带入当前项目 */
const defaultProject = !isHqSelected.value ? headerProjectLabel.value : ''

const form = ref({
  inspType: '周检',
  inspDate: new Date().toISOString().slice(0, 10),
  project: defaultProject,
  inspector: '',
  companions: [],
  photos: [],
  inspContent: '',
  result: '',
  hazardItems: [],  // [{ desc: '', photos: [] }]
  hasRectify: false,
  rectifyNote: '',
  rectifyPerson: '',
  rectifyDeadline: '',
})

const inspectTypes = ['周检', '月检', '专项巡检']
const projectOptions = computed(() => {
  const names = COC_PROJECT_OPTIONS.map((p) => p.label).filter(Boolean)
  const cur = form.value.project
  if (cur && !names.includes(cur)) return [cur, ...names]
  return names
})
const personOptions = ['张工（安全总监）', '李工（安全主管）', '王工（安全员）', '赵工（项目经理）']
const companionOptions = ['刘工（安全员）', '陈工（技术员）', '周工（施工员）', '吴工（质检员）']

const selectedCompanion = ref('')
function addCompanion() {
  if (selectedCompanion.value && !form.value.companions.includes(selectedCompanion.value)) {
    form.value.companions.push(selectedCompanion.value)
  }
  selectedCompanion.value = ''
}

function addHazard() {
  form.value.hazardItems.push({ desc: '', photos: [] })
}
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
  if (!form.value.inspDate) { ElMessage.warning('请选择巡检日期'); return }
  if (!form.value.project) { ElMessage.warning('请选择所属项目'); return }
  if (!form.value.inspector) { ElMessage.warning('请选择巡检人'); return }
  if (!form.value.inspContent.trim()) { ElMessage.warning('请填写巡检内容'); return }
  if (!form.value.result) { ElMessage.warning('请选择巡检结果'); return }
  if (form.value.result === 'hazard') {
    if (form.value.hazardItems.length === 0) { ElMessage.warning('请至少添加一条隐患'); return }
    for (const [i,item] of form.value.hazardItems.entries()) {
      if (!item.desc.trim()) { ElMessage.warning(`第 ${i+1} 条隐患请填写说明`); return }
    }
  }
  if (form.value.hasRectify && !form.value.rectifyPerson) { ElMessage.warning('请选择整改人'); return }
  if (form.value.hasRectify && !form.value.rectifyDeadline) { ElMessage.warning('请选择整改截止日期'); return }

  const taskNo = `XJ${new Date().toISOString().slice(0,10).replace(/-/g,'')}${String(Date.now()).slice(-4)}`
  const selfRectifyNo = form.value.hasRectify ? `ZG${String(Date.now()).slice(-6)}` : ''

  const newTask = {
    id: `self-${Date.now()}`,
    taskNo,
    planNo: '',
    source: '系统自建',
    inspType: form.value.inspType,
    planType: form.value.inspType,
    planName: `【自建】${form.value.inspType}巡检`,
    project: form.value.project,
    executor: form.value.inspector || '当前用户',
    deadline: form.value.inspDate,
    status: '已完成',
    overdue: false,
    itemCount: 0,
    hazardCount: form.value.hazardItems.length,
    photos: form.value.photos,
    inspContent: form.value.inspContent.trim(),
    result: form.value.result,
    hazardItems: form.value.hazardItems.map((h) => ({ desc: h.desc, photos: [...h.photos] })),
    hasRectify: form.value.hasRectify,
    rectifyNo: selfRectifyNo,
    rectifyId: selfRectifyNo ? `self-${selfRectifyNo}` : '',
    rectifyPerson: form.value.rectifyPerson,
    rectifyDeadline: form.value.rectifyDeadline,
  }

  addMobileInspectionTask(newTask)
  ElMessage.success(`巡检记录已提交${form.value.hasRectify ? '，已下发整改单' : ''}`)
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
          <span class="form-label">巡检类型 <i class="req">*</i></span>
          <div class="form-tags">
            <button v-for="t in inspectTypes" :key="t" class="tag-btn" :class="{ active: form.inspType === t }" @click="form.inspType = t">{{ t }}</button>
          </div>
        </div>

        <div class="form-row">
          <span class="form-label">巡检日期 <i class="req">*</i></span>
          <input type="date" v-model="form.inspDate" class="form-input" />
        </div>

        <div class="form-row">
          <span class="form-label">所属项目 <i class="req">*</i></span>
          <select v-model="form.project" class="form-input" :disabled="!isHqSelected">
            <option value="" disabled>请选择项目</option>
            <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>

        <div class="form-row">
          <span class="form-label">巡检人 <i class="req">*</i></span>
          <select v-model="form.inspector" class="form-input">
            <option value="" disabled>请选择</option>
            <option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option>
          </select>
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

        <div class="form-row">
          <span class="form-label">巡检内容 <i class="req">*</i></span>
          <textarea
            v-model="form.inspContent"
            class="form-textarea"
            placeholder="请填写本次巡检内容..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <span class="form-label">是否有隐患 <i class="req">*</i></span>
          <div class="result-group">
            <button class="result-btn ok" :class="{ active: form.result === 'normal' }" @click="form.result = 'normal'; form.hasRectify = false">✓ 全部正常</button>
            <button class="result-btn hazard" :class="{ active: form.result === 'hazard' }" @click="form.result = 'hazard'; form.hasRectify = false; if (form.hazardItems.length===0) addHazard()">⚠ 有隐患</button>
          </div>
        </div>

        <!-- 结果明细区：按钮下方固定占位，避免内容插在按钮上方跳动 -->
        <div class="result-detail" :class="{ idle: !form.result }">
          <div v-show="!form.result" class="result-placeholder">请选择是否有隐患后填写结果明细</div>

          <div v-show="form.result === 'normal'" class="form-row result-block">
            <span class="form-label">巡检照片</span>
            <div class="photo-group">
              <div v-for="(url,i) in form.photos" :key="i" class="photo-box"><span>📷 已拍</span><button class="photo-del" @click="removePhoto(i)">✕</button></div>
              <button class="photo-add" @click="triggerPhoto">+ 拍照</button>
            </div>
          </div>

          <div v-show="form.result === 'hazard'" class="result-block">
            <div class="hazard-list">
              <div v-for="(item, idx) in form.hazardItems" :key="idx" class="hazard-item-row">
                <div class="hi-header">
                  <span class="hi-num">⚠ 隐患 {{ idx + 1 }}</span>
                  <button v-if="form.hazardItems.length > 1" class="hi-remove" @click="removeHazard(idx)">✕</button>
                </div>
                <div class="form-row">
                  <span class="form-label" style="width:56px">说明 <i class="req">*</i></span>
                  <textarea v-model="item.desc" class="form-textarea" placeholder="请描述隐患情况..." rows="2"></textarea>
                </div>
                <div class="form-row">
                  <span class="form-label" style="width:56px">照片</span>
                  <div class="photo-group">
                    <div v-for="(url,pi) in item.photos" :key="pi" class="photo-box"><span>📷</span><button class="photo-del" @click="removeHazardPhoto(idx, pi)">✕</button></div>
                    <button class="photo-add" @click="triggerHazardPhoto(idx)">+ 拍照</button>
                  </div>
                </div>
              </div>
              <button type="button" class="add-hazard-btn" @click="addHazard">+ 新增隐患项</button>
            </div>

            <div class="form-row">
              <span class="form-label">下发整改单</span>
              <label class="switch-row">
                <input type="checkbox" v-model="form.hasRectify" class="switch-input" />
                <span class="switch-track"><span class="switch-dot"></span></span>
                <span>{{ form.hasRectify ? '已下发' : '不下发' }}</span>
              </label>
            </div>

            <div v-show="form.hasRectify" class="form-row">
              <span class="form-label">整改人 <i class="req">*</i></span>
              <select v-model="form.rectifyPerson" class="form-input">
                <option value="" disabled>请选择整改人</option>
                <option v-for="p in personOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div v-show="form.hasRectify" class="form-row">
              <span class="form-label">整改截止 <i class="req">*</i></span>
              <input type="date" v-model="form.rectifyDeadline" class="form-input" />
            </div>
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
.form-label { color:#666; flex-shrink:0; width:auto; min-width:84px; max-width:100px; font-size:13px; padding-top:4px; line-height:1.35; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.form-input:disabled {
  background:#f5f5f5;
  color:#333;
  opacity:1;
  border-color:#e0e0e0;
  cursor:not-allowed;
}
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

.result-group { flex:1; display:flex; gap:8px; }
.result-btn { flex:1; padding:10px; border:1.5px solid #ddd; border-radius:8px; background:#fff; font-size:13px; font-weight:500; cursor:pointer; }
.result-btn.ok.active { border-color:#34a853; color:#34a853; background:#e8f5e9; }
.result-btn.hazard.active { border-color:#e53935; color:#e53935; background:#ffebee; }
.result-detail {
  margin-top: 4px;
  min-height: 88px;
  border: 1px dashed #eee;
  border-radius: 10px;
  padding: 10px;
  background: #fafafa;
  transition: min-height 0.2s ease;
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
.result-block { width: 100%; }
.result-block .form-row:last-child { margin-bottom: 0; }
.switch-row { display:flex; align-items:center; gap:8px; cursor:pointer; }
.switch-input { display:none; }
.switch-track { width:44px; height:24px; border-radius:12px; background:#ddd; position:relative; transition:background 0.2s; }
.switch-input:checked + .switch-track { background:#8f0045; }
.switch-dot { position:absolute; top:2px; left:2px; width:20px; height:20px; border-radius:50%; background:#fff; transition:left 0.2s; }
.switch-input:checked + .switch-track .switch-dot { left:22px; }
.bottom-bar { position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:10px 16px; padding-bottom:calc(10px + env(safe-area-inset-bottom,0)); }
.submit-btn { width:100%; padding:14px; border:none; border-radius:10px; background:#8f0045; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
</style>
