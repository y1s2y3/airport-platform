<script setup>
import InspectionVoidStamp from '../../components/InspectionVoidStamp.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getVisibleMobileRectification } from '../../composables/useMobileRectification'
import { useMobileRouteBase } from '../../composables/useMobileRouteBase'
import { rectifyDepartmentConfirmInfo, rectifyManagerConfirmInfo, rectifyRectificationRounds, rectifyReviewRounds } from '../../composables/useInspectionRectifySections'
import MobileRectifyBasicInfo from '../../components/MobileRectifyBasicInfo.vue'
import InspectionPhotoList from '../../components/InspectionPhotoList.vue'
import { getInspectionTaskForRectification } from '../../mock/mobileInspectionTasks'
import { getInspectionTaskPhotos } from '../../utils/inspectionTaskPhotos'

import { workflowFlowRecords, currentWorkflowStep, isInspectionVoidPending } from '../../utils/inspectionRectificationWorkflow'
import { canDeleteInspectionRectification } from '../../utils/inspectionWorkflowIdentity'
import { confirmInspectionVoidDelete } from '../../composables/useInspectionVoidDelete'

const route = useRoute()
const router = useRouter()
const { rectifyBase, tasksBase } = useMobileRouteBase()
const record = computed(() => getVisibleMobileRectification(route.params.id))
const inspectionPhotos = computed(() => getInspectionTaskPhotos(getInspectionTaskForRectification(record.value)))
const missing = computed(() => !record.value)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top: 0 }))

const statusText = computed(() => record.value?.status || '--')
const managerConfirm = computed(() => rectifyManagerConfirmInfo(record.value))
const departmentConfirm = computed(() => rectifyDepartmentConfirmInfo(record.value, currentWorkflowStep(record.value)?.key))

const flowRecords = computed(() => workflowFlowRecords(record.value).map(item => ({ ...item, action: item.a, date: item.d, detail: item.dt, current: item.cur })))

const flowCollapsed = ref(false)

const reviewRecords = computed(() => rectifyReviewRounds(record.value))

const currentRectifications = computed(() => rectifyRectificationRounds(record.value))

/** 已作废单在详情页也提供删除入口（权限与列表一致：发起人 / 作废审批人 / 演示单）。 */
const canDelete = computed(() => canDeleteInspectionRectification(record.value))

async function handleDelete() {
  const target = record.value
  await confirmInspectionVoidDelete(target)
  if (target?.deletion) goBack()
}

function displayPhotos(list) {
  if (!list?.length) return '--'
  return list.join('、')
}

function goBack() {
  const taskId = route.query.inspectionTaskId
  if (taskId) {
    router.push(tasksBase.value + '/' + encodeURIComponent(taskId))
    return
  }
  const tab = route.query.tab
  router.push(tab ? `${rectifyBase.value}?tab=${tab}` : rectifyBase.value)
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" aria-label="返回" @click="goBack">‹</button>
      <h1 class="mt">整改详情</h1>
      <span v-if="!missing" class="header-status">
        {{ statusText }} <InspectionVoidStamp v-if="isInspectionVoidPending(record)" />
      </span>
    </header>

    <div v-if="missing" class="empty-tip">未找到该整改单，请返回列表重试。</div>

    <template v-else>
      <MobileRectifyBasicInfo :record="record" show-copy-recipients />

      <div class="sc">
        <div class="sct">巡检照片</div>
        <InspectionPhotoList v-if="inspectionPhotos.length" :photos="inspectionPhotos" />
        <div v-else class="ir">未上传</div>
      </div>

      <div class="sc">
        <div class="sct">隐患信息</div>
        <div class="ic">
        <div class="ir"><span class="il">隐患类别</span><span>{{ record.hazardCategory || '安全管理' }}</span></div>
        <div class="ir"><span class="il">隐患等级</span><span>{{ record.hazardLevel || '未设置' }}</span></div>
        <div class="ir"><span class="il">整改要求</span><span style="white-space:pre-wrap">{{ record.rectifyRequirement || '未填写' }}</span></div>
        <div class="ir"><span class="il">隐患说明</span><span>{{ record.hazard || '--' }}</span></div>
        <div class="ir"><span class="il">隐患照片</span><span>{{ displayPhotos(record.hazardPhotos) }}</span></div>
        </div>
      </div>

      <div v-if="currentRectifications.length" class="sc">
        <div class="sct">整改信息</div>
        <div v-for="(r, i) in currentRectifications" :key="i" class="ic">
          <div class="ir"><span class="il">整改日期</span><span>{{ r.date }}</span></div>
          <div class="ir"><span class="il">整改照片</span><span>{{ displayPhotos(r.photos) }}</span></div>
          <div class="ir"><span class="il">整改说明</span><span>{{ r.note }}</span></div>
        </div>
      </div>


      <div v-if="reviewRecords.length" class="sc">
        <div class="sct">监理复核记录</div>
        <div v-for="(r, i) in reviewRecords" :key="i" class="ic">
          <div class="ir"><span class="il">复核人</span><span>{{ r.reviewer }}</span></div>
          <div class="ir"><span class="il">复核日期</span><span>{{ r.date }}</span></div>
          <div class="ir"><span class="il">复核结果</span><span :class="r.result === '通过' ? 'pass' : 'fail'">{{ r.result }}</span></div>
          <div class="ir"><span class="il">复核意见</span><span>{{ r.comment }}</span></div>
        </div>
      </div>

      <div v-if="managerConfirm" class="sc">
        <div class="sct">{{ managerConfirm.label }}</div>
        <div class="ic">
        <div class="ir"><span class="il">确认人</span><span>{{ managerConfirm.person }}</span></div>
        <div class="ir"><span class="il">确认结果</span><span :class="managerConfirm.passed ? 'pass' : 'pending'">{{ managerConfirm.result }}</span></div>
        <div class="ir"><span class="il">确认日期</span><span>{{ managerConfirm.date || '--' }}</span></div>
        <div class="ir"><span class="il">确认意见</span><span>{{ managerConfirm.comment }}</span></div>
        </div>
      </div>

      <div v-if="departmentConfirm" class="sc">
        <div class="sct">项目部长确认</div>
        <div class="ic">
        <div class="ir"><span class="il">确认人</span><span>{{ departmentConfirm.person }}</span></div>
        <div class="ir"><span class="il">确认结果</span><span :class="departmentConfirm.result === '通过' ? 'pass' : 'pending'">{{ departmentConfirm.result }}</span></div>
        <div class="ir"><span class="il">确认日期</span><span>{{ departmentConfirm.date || '--' }}</span></div>
        <div class="ir"><span class="il">确认意见</span><span>{{ departmentConfirm.comment || '--' }}</span></div>
        </div>
      </div>

      <div class="sc">
        <button type="button" class="sct colps" :aria-expanded="!flowCollapsed" @click="flowCollapsed = !flowCollapsed">
          <span>流程记录</span>
          <span class="ca">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
        </button>
        <div v-show="!flowCollapsed" class="fl">
          <div v-for="(f, i) in flowRecords" :key="i" class="fi" :class="{ cur: f.current }">
            <div class="fd" :class="{ cur: f.current }"></div>
            <div class="fc">
              <div class="fc-row">
                <span class="fa">{{ f.action }}</span>
                <span class="fd2">{{ f.date || '进行中' }}</span>
              </div>
              <span class="fd2">处理人：{{ f.by || '--' }}</span>
              <span v-if="f.detail" class="fdl">{{ f.detail }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="canDelete" class="sc">
        <button type="button" class="delete-btn" @click="handleDelete">删除已作废整改单</button>
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
.header-status { color:#ffd875; font-size:12px; font-weight:600; }
.sc { background:#fff; border-radius:10px; padding:14px 16px; margin:12px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.04); }
.sct { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.sct.colps { width:100%; cursor:pointer; display:flex; align-items:center; justify-content:space-between; border:0; border-left:3px solid #8f0045; background:transparent; padding-right:0; }
.ca { font-size:12px; color:#999; font-weight:400; }
.ic { background:#fafafa; border-radius:8px; padding:12px; }
.ir { display:flex; gap:6px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.il { color:#999; flex-shrink:0; width:68px; }
.ir > span:last-child { flex:1; min-width:0; overflow-wrap:anywhere; }
.pass { color:#34a853; font-weight:600; }
.fail { color:#e53935; font-weight:600; }
.pending { color:#a75c00; font-weight:600; }
.delete-btn { width:100%; padding:13px; border:1px solid #e53935; border-radius:10px; background:#fff2f2; color:#e53935; font-size:15px; font-weight:600; cursor:pointer; }
.fl { padding-left:6px; }
.fi { display:flex; gap:10px; padding-bottom:14px; position:relative; }
.fi::before { content:''; position:absolute; left:7px; top:15px; bottom:0; width:1px; background:#e0e0e0; }
.fi:last-child::before { display:none; }
.fd { width:14px; height:14px; border-radius:50%; background:#34a853; flex-shrink:0; margin-top:2px; }
.fd.cur { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.fc { display:flex; flex-direction:column; gap:4px; flex:1; }
.fc-row { display:flex; justify-content:space-between; align-items:baseline; width:100%; }
.fa { font-size:13px; color:#1f2329; font-weight:500; }
.fd2 { font-size:12px; color:#999; flex-shrink:0; }
.fdl { font-size:11px; color:#606266; background:#f5f7fa; padding:2px 8px; border-radius:4px; display:inline-block; }
.fi.cur .fa { color:#8f0045; font-weight:600; }
</style>
