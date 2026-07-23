<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const rid = route.params.id

const dataMap = {
  'rec-001': { rn:'ZG202607001', tn:'XJ20260728001', pj:'飞行区跑道延长工程', rf:'赵工', rv:'张工', dl:'2026-07-30', isRejected:false,
    item:{ desc:'五芯电缆破损，线路未按规范敷设', p:['📷 隐患照片1'] } },
  'rec-006': { rn:'ZG202607006', tn:'XJ20260721003', pj:'T3航站楼扩建工程', rf:'王工', rv:'张工', dl:'2026-07-22', isRejected:true,
    item:{ desc:'脚手架施工方案未报审即施工', p:['📷 隐患照片1'] },
    prev:{ rd:'2026-07-20', rp:['📷 整改照片1'], rn:'已补报方案' },
    prv:{ d:'2026-07-22', c:'整改不彻底，电缆接头处仍有裸露', r:'不通过' } },
}

const info = computed(() => dataMap[rid] || dataMap['rec-001'])
const isRejected = computed(() => info.value.isRejected)

const rectDate = ref('')
const rectPhotos = ref([])
const rectNote = ref('')
const flowCollapsed = ref(false)

const flowRecords = computed(() => isRejected.value ? [
  { a:'下发整改单', d:'2026-07-20 14:00' },
  { a:'整改人提交整改结果', d:'2026-07-22 16:30' },
  { a:'复查不通过，退回继续整改', d:'2026-07-24 10:00', dt:'整改不彻底' },
  { a:'等待整改人重新整改', d:'', cur:true },
] : [
  { a:'下发整改单', d:'2026-07-25 09:00' },
  { a:'等待整改人执行', d:'', cur:true },
])

function triggerPhoto() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment'
  input.onchange = (e) => { const f = e.target.files[0]; if (f) rectPhotos.value.push(URL.createObjectURL(f)) }
  input.click()
}
function removePhoto(i) { rectPhotos.value.splice(i, 1) }

function submitRectify() {
  if (!rectDate.value) { ElMessage.warning('请选择整改日期'); return }
  if (rectPhotos.value.length === 0) { ElMessage.warning('请至少上传一张整改照片'); return }
  if (!rectNote.value.trim()) { ElMessage.warning('请填写整改说明'); return }
  ElMessage.success('整改结果已提交')
  const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify')
}

function goBack() { const tab = route.query.tab; router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify') }
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">整改执行</h1>
    </header>

    <div class="task-bar">
      <div class="tbn">⚠ {{ info.rn }}</div>
      <div class="tbi">巡检单号：{{ info.tn }}</div>
      <div class="tbi">
        <span>{{ info.pj }}</span>
        <span>整改人：{{ info.rf }}</span>
        <span>复查人：{{ info.rv }}</span>
        <span>截止：{{ info.dl }}</span>
      </div>
    </div>

    <!-- 流程记录 -->
    <div class="section">
      <div class="section-title collapsible" @click="flowCollapsed=!flowCollapsed">
        <span>流程记录</span>
        <span class="ca">{{ flowCollapsed?'展开 ▸':'收起 ▾' }}</span>
      </div>
      <div v-show="!flowCollapsed" class="fl">
        <div v-for="(f,i) in flowRecords" :key="i" class="fi" :class="{cur:f.cur}">
          <div class="fd" :class="{cur:f.cur}"></div>
          <div class="fc">
            <div class="fc-row">
              <span class="fa">{{ f.a }}</span>
              <span class="fd2">{{ f.d||'进行中' }}</span>
            </div>
            <span v-if="f.dt" class="fdl">{{ f.dt }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐患信息 -->
    <div class="sc">
      <div class="sct">隐患信息</div>
      <div class="ir"><span class="il">隐患说明</span><span>{{ info.item.desc }}</span></div>
      <div class="ir" v-if="info.item.p"><span class="il">隐患照片</span><span>{{ info.item.p.join('、') }}</span></div>
    </div>

    <!-- 继续整改：上次整改情况 -->
    <div v-if="isRejected" class="sc">
      <div class="sct">📋 上次整改情况</div>
      <div class="ir"><span class="il">整改日期</span><span>{{ info.prev.rd }}</span></div>
      <div class="ir"><span class="il">整改照片</span><span>{{ info.prev.rp.join('、') }}</span></div>
      <div class="ir"><span class="il">整改说明</span><span>{{ info.prev.rn }}</span></div>
      <div class="dv"></div>
      <div class="sct" style="color:#e53935;border-left-color:#e53935">复查结果</div>
      <div class="ir"><span class="il">复查日期</span><span>{{ info.prv.d }}</span></div>
      <div class="ir"><span class="il">复查意见</span><span>{{ info.prv.c }}</span></div>
      <div class="ir"><span class="il">结果</span><span style="color:#e53935;font-weight:600">{{ info.prv.r }}</span></div>
    </div>

    <!-- 本次整改 -->
    <div class="sc">
      <div class="sct">📝 本次整改</div>
      <div class="fr"><span class="fl-label">整改日期 <i class="req">*</i></span><input type="date" v-model="rectDate" class="fi-input" /></div>
      <div class="fr">
        <span class="fl-label">整改照片 <i class="req">*</i></span>
        <div class="pg">
          <div v-for="(u,i) in rectPhotos" :key="i" class="pb"><span>📷 已拍</span><button class="pd" @click="removePhoto(i)">✕</button></div>
          <button class="pa" @click="triggerPhoto">+ 拍照</button>
        </div>
      </div>
      <div class="fr"><span class="fl-label">整改说明 <i class="req">*</i></span><textarea v-model="rectNote" class="fta" placeholder="请描述整改情况..." rows="3"></textarea></div>
    </div>

    <div class="bb">
      <button class="sb" @click="submitRectify">✓ 提交整改结果</button>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; margin:0 auto; min-height:100vh; background:#f5f5f5; padding-bottom:env(safe-area-inset-bottom,0); }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { background:none; border:none; color:#fff; font-size:28px; padding:0 4px 0 0; line-height:1; cursor:pointer; }
.mt { flex:1; font-size:18px; font-weight:600; margin:0; }

.task-bar { background:#fff; padding:14px 16px; border-bottom:1px solid #eee; }
.tbn { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:6px; }
.tbi { display:flex; gap:10px; font-size:12px; color:#999; flex-wrap:wrap; }

.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.dv { height:1px; background:#eee; margin:10px 0; }

.fr { display:flex; gap:8px; margin-bottom:12px; align-items:flex-start; }
.fl-label { color:#666; flex-shrink:0; width:72px; font-size:13px; padding-top:4px; }
.req { color:#e53935; font-style:normal; margin-left:2px; }
.fi-input { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.fta { flex:1; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; resize:none; background:#fff; }
.pg { flex:1; display:flex; gap:6px; flex-wrap:wrap; }
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
.fdl { font-size:11px; color:#e53935; background:#ffebee; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; font-weight:600; }

.bb { position:sticky; bottom:0; background:#fff; border-top:1px solid #eee; padding:10px 16px; padding-bottom:calc(10px+env(safe-area-inset-bottom,0)); }
.sb { width:100%; padding:14px; border:none; border-radius:10px; background:#8f0045; color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
</style>
