<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { selectedProjectId, useQmProjectScope, useCurrentProject } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS, HQ_PROJECT_OPTION } from '../../config/projectOptions.js'
import { buildHqQmDashboardPanels, buildQmDashboardPanels } from '../../mock/qm.js'
import QmLedgerTable from './components/QmLedgerTable.vue'
import './qm-hq-stats.css'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const { headerProjectLabel } = useCurrentProject()
const fromHq = computed(() => route.query.from === 'hq')

const panels = computed(() =>
  isHqSelected.value
    ? buildHqQmDashboardPanels(COC_PROJECT_OPTIONS)
    : buildQmDashboardPanels(scopeProjectId.value),
)
const projects = computed(() => panels.value.projects || null)
const physical = computed(() => panels.value.physical)
const special = computed(() => panels.value.special)

function passRateText(rate, approved, rejected) {
  if (!(approved + rejected)) return '—'
  return `${rate}%`
}

function goBackToHQ() {
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  router.push('/qm/inspect/dashboard')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '质量看板' : '质量验评' }} / 质量验评看板
      </div>
      <div class="hq-title-row">
        <el-button
          v-if="!isHqSelected && fromHq"
          link
          type="primary"
          :icon="ArrowLeft"
          @click="goBackToHQ"
        >
          返回
        </el-button>
        <h1 class="page-title">质量验评看板</h1>
        <span v-if="!isHqSelected && fromHq" class="hq-title-project">
          {{ headerProjectLabel || scopeProjectLabel }}
        </span>
      </div>
      <p class="page-tip">
        范围：{{ isHqSelected ? '全部项目（指挥部）' : scopeProjectLabel }}
        · 口径：待提交 / 审批中 / 已通过 / 已驳回；通过率=已通过÷(已通过+已驳回)
      </p>
    </div>

    <div v-if="isHqSelected" class="kpi-panels hq-panels">
      <section class="kpi-panel">
        <div class="panel-title">项目统计</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-2">
            <div class="kpi tone-task">
              <div class="num">{{ projects.projectTotal }}</div>
              <div class="label">项目总数</div>
            </div>
            <div class="kpi tone-rate">
              <div class="num">{{ projects.projectInProgress }}</div>
              <div class="label">验收中</div>
            </div>
          </div>
          <div class="kpi-row cols-2">
            <div class="kpi tone-pass">
              <div class="num">{{ projects.projectCompleted }}</div>
              <div class="label">已完成</div>
            </div>
            <div class="kpi tone-mute">
              <div class="num">{{ projects.projectNotStarted }}</div>
              <div class="label">未开始</div>
            </div>
          </div>
        </div>
      </section>

      <section class="kpi-panel">
        <div class="panel-title">实体验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-3">
            <div class="kpi tone-task">
              <div class="num">{{ physical.taskTotal }}</div>
              <div class="label">验收任务数</div>
            </div>
            <div class="kpi tone-mute">
              <div class="num">{{ physical.pendingCount }}</div>
              <div class="label">待提交</div>
            </div>
            <div class="kpi tone-rate">
              <div class="num">{{ physical.approvingCount }}</div>
              <div class="label">审批中</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-pass">
              <div class="num">{{ physical.approvedCount }}</div>
              <div class="label">已通过</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ physical.rejectedCount }}</div>
              <div class="label">已驳回</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{
                passRateText(physical.passRate, physical.approvedCount, physical.rejectedCount)
              }}</div>
              <div class="label">通过率</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-task">
              <div class="num">{{ physical.nodeTotal }}</div>
              <div class="label">节点总数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.nodeCompleted }}</div>
              <div class="label">验收完成节点</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.nodeCompleteRate }}%</div>
              <div class="label">节点完成率</div>
            </div>
          </div>
        </div>
      </section>

      <section class="kpi-panel">
        <div class="panel-title">专项验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-3">
            <div class="kpi tone-task">
              <div class="num">{{ special.taskTotal }}</div>
              <div class="label">验收任务数</div>
            </div>
            <div class="kpi tone-mute">
              <div class="num">{{ special.pendingCount }}</div>
              <div class="label">待提交</div>
            </div>
            <div class="kpi tone-rate">
              <div class="num">{{ special.approvingCount }}</div>
              <div class="label">审批中</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-pass">
              <div class="num">{{ special.approvedCount }}</div>
              <div class="label">已通过</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ special.rejectedCount }}</div>
              <div class="label">已驳回</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{
                passRateText(special.passRate, special.approvedCount, special.rejectedCount)
              }}</div>
              <div class="label">通过率</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="kpi-panels project-panels">
      <section class="kpi-panel">
        <div class="panel-title">实体验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-4">
            <div class="kpi tone-mute">
              <div class="num">{{ physical.pendingCount }}</div>
              <div class="label">待提交</div>
            </div>
            <div class="kpi tone-rate">
              <div class="num">{{ physical.approvingCount }}</div>
              <div class="label">审批中</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.approvedCount }}</div>
              <div class="label">已通过</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ physical.rejectedCount }}</div>
              <div class="label">已驳回</div>
            </div>
          </div>
          <div class="kpi-row cols-4">
            <div class="kpi tone-task">
              <div class="num">{{ physical.taskTotal }}</div>
              <div class="label">验收任务数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{
                passRateText(physical.passRate, physical.approvedCount, physical.rejectedCount)
              }}</div>
              <div class="label">通过率</div>
            </div>
            <div class="kpi tone-task">
              <div class="num">{{ physical.nodeTotal }}</div>
              <div class="label">节点总数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.nodeCompleteRate }}%</div>
              <div class="label">节点完成率</div>
            </div>
          </div>
        </div>
      </section>

      <section class="kpi-panel">
        <div class="panel-title">专项验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-4">
            <div class="kpi tone-mute">
              <div class="num">{{ special.pendingCount }}</div>
              <div class="label">待提交</div>
            </div>
            <div class="kpi tone-rate">
              <div class="num">{{ special.approvingCount }}</div>
              <div class="label">审批中</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.approvedCount }}</div>
              <div class="label">已通过</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ special.rejectedCount }}</div>
              <div class="label">已驳回</div>
            </div>
          </div>
          <div class="kpi-row cols-2">
            <div class="kpi tone-task">
              <div class="num">{{ special.taskTotal }}</div>
              <div class="label">验收任务数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{
                passRateText(special.passRate, special.approvedCount, special.rejectedCount)
              }}</div>
              <div class="label">通过率</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="section-title">实体验收台账</div>
    <QmLedgerTable :project-id="isHqSelected ? '' : scopeProjectId" />
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }

.kpi-panels {
  display: grid;
  gap: 12px;
}
.hq-panels {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.project-panels {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.kpi-panel {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fff;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #303133;
}
.kpi-rows { display: flex; flex-direction: column; gap: 10px; }
.kpi-row { display: grid; gap: 8px; }
.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kpi {
  border-radius: 6px;
  padding: 10px 12px;
  background: #f5f7fa;
}
.kpi .num { font-size: 22px; font-weight: 700; line-height: 1.2; color: #303133; }
.kpi .label { margin-top: 4px; font-size: 12px; color: #606266; }
.tone-pass { background: #f0f9eb; }
.tone-rate { background: #ecf5ff; }
.tone-warn { background: #fef0f0; }
.tone-mute { background: #f4f4f5; }
.tone-task { background: #f5f7fa; }
.section-title { font-size: 15px; font-weight: 600; margin-top: 4px; }

@media (max-width: 1200px) {
  .hq-panels,
  .project-panels { grid-template-columns: 1fr; }
  .cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
