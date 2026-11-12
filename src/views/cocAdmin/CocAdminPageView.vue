<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Download } from '@element-plus/icons-vue'
import { getCocAdminItem } from '../../config/menu.js'
import { ensureDailyWorkSeed } from '../../coc/utils/dailyWorkStorage.js'
import { ensureDispatchMeetingSeed } from '../../coc/utils/dispatchMeetingStorage.js'
import { ensureMonitorGroupSeed } from '../../coc/utils/monitorAdminStorage.js'
import { ensureRedBlackBoardSeed } from '../../coc/utils/redBlackBoardStorage.js'
import { ensureDutyRosterSeed } from '../../mock/dutyRoster.js'
import { PENALTY_TEMPLATE_URLS } from '../../coc/config/penaltyDocuments.js'
import DailyCheckDialog from './dailyDispatch/DailyCheckDialog.vue'
import requirementChangesPrdUrl from '../../../docs/features/requirement-changes/requirements/Requirement_Changes_PRD_1112.docx?url'
import '../../coc/admin/admin.css'
import '../../coc/admin/admin-video.css'

onMounted(() => {
  ensureDailyWorkSeed()
  ensureDispatchMeetingSeed()
  ensureMonitorGroupSeed()
  ensureRedBlackBoardSeed()
  ensureDutyRosterSeed()
})

const route = useRoute()

const item = computed(() => getCocAdminItem(route.meta.cocAdminKey))
const templateNoteVisible = ref(false)
const penaltyTemplates = [
  { key: 'processing', title: '处理中', fileName: '违约处罚通知单（有监理的项目）_处理中.docx' },
  { key: 'pendingAcceptance', title: '待验收', fileName: '违约处罚通知单（有监理的项目）_待验收.docx' },
  { key: 'closed', title: '已关闭（非手动关闭）', fileName: '违约处罚通知单（有监理的项目）_已关闭_非手动关闭.docx' },
]
watch(() => item.value?.key, () => { templateNoteVisible.value = false })

/** viewLoaders 为 () => import(...)，须包一层 defineAsyncComponent 才能作为 :is 渲染 */
const contentComponents = new WeakMap()
const contentComponent = computed(() => {
  const loader = item.value?.component
  if (!loader) return null
  if (item.value.key !== 'coc-admin-daily-dispatch-check') return defineAsyncComponent(loader)
  // Daily inspection retains its form when only the query changes.
  if (!contentComponents.has(loader)) contentComponents.set(loader, defineAsyncComponent(loader))
  return contentComponents.get(loader)
})
</script>

<template>
  <div v-if="item" class="coc-admin-page">
    <div v-if="item.roles?.length" class="role-bar">
      <span class="role-label">适用角色</span>
      <el-tag v-for="role in item.roles" :key="role" size="small" type="info">{{ role }}</el-tag>
      <el-button v-if="item.key === 'coc-admin-penalty'" link type="primary" size="small" @click="templateNoteVisible = true">原型说明（模板下载）</el-button>
    </div>
    <component
      :is="contentComponent"
      v-if="contentComponent"
      :title="item.label"
      :description="item.description"
    />
    <DailyCheckDialog v-if="item.key === 'coc-admin-penalty'" v-model="templateNoteVisible" title="处罚单 · 原型说明" width="760px">
      <ul class="penalty-prototype-templates" aria-label="需求文档及处罚单导出模板">
        <li class="penalty-prototype-template">
          <div class="penalty-template-info">
            <strong>需求变更 PRD（1112版）</strong>
            <p>需求变更PRD_待评审_1112.docx</p>
          </div>
          <el-button tag="a" :href="requirementChangesPrdUrl" download="需求变更PRD_待评审_1112.docx" type="primary" plain :icon="Download" aria-label="下载需求变更PRD（1112版）">下载</el-button>
        </li>
        <li v-for="entry in penaltyTemplates" :key="entry.key" class="penalty-prototype-template">
          <div class="penalty-template-info">
            <strong>{{ entry.title }}</strong>
            <p>{{ entry.fileName }}</p>
          </div>
          <el-button tag="a" :href="PENALTY_TEMPLATE_URLS[entry.key]" :download="entry.fileName" type="primary" plain :icon="Download" :aria-label="`下载${entry.title}处罚单模板`">下载</el-button>
        </li>
      </ul>
      <template #footer><el-button type="primary" @click="templateNoteVisible = false">知道了</el-button></template>
    </DailyCheckDialog>
  </div>
</template>

<style scoped>
.coc-admin-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  background: #fafafa;
}

.role-label {
  font-size: 13px;
  color: var(--ap-text-secondary, #909399);
}

.penalty-prototype-templates { display: flex; flex-direction: column; gap: 10px; padding: 0; margin: 0; list-style: none; }
.penalty-prototype-template { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid var(--ap-border); border-radius: 6px; background: var(--ap-bg-soft); }
.penalty-template-info { min-width: 0; overflow-wrap: anywhere; }
.penalty-template-info strong { color: var(--ap-text); font-size: 14px; font-weight: 600; }
.penalty-template-info p { margin: 4px 0 0; color: var(--ap-text-secondary); font-size: 13px; line-height: 1.6; }
.penalty-prototype-template > .el-button { flex-shrink: 0; }
@media (max-width: 600px) {
  .penalty-prototype-template { flex-direction: column; align-items: stretch; }
  .penalty-prototype-template > .el-button { align-self: flex-start; }
}
</style>
