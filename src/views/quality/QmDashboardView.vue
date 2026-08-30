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
      <p class="page-tip">范围：{{ isHqSelected ? '全部项目（指挥部）' : scopeProjectLabel }}</p>
    </div>

    <!-- 指挥部：保留项目统计；实体/专项字段对齐项目级（不含计划延期） -->
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
              <div class="label">验收任务数量</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.taskPassed }}</div>
              <div class="label">已验收通过任务数量</div>
            </div>
            <div class="kpi tone-task">
              <div class="num">{{ physical.nodeTotal }}</div>
              <div class="label">节点总数</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-pass">
              <div class="num">{{ physical.nodeCompleted }}</div>
              <div class="label">验收完成节点</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.nodeCompleteRate }}%</div>
              <div class="label">节点验收完成率</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.passRate }}%</div>
              <div class="label">通过率</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-pass">
              <div class="num">{{ physical.firstPassRate }}%</div>
              <div class="label">一次性通过率</div>
            </div>
            <div class="kpi tone-task">
              <div class="num">{{ physical.rectifyTotal }}</div>
              <div class="label">整改总数</div>
            </div>
            <div class="kpi tone-mute">
              <div class="num">{{ physical.rectifying }}</div>
              <div class="label">整改中</div>
            </div>
          </div>
          <div class="kpi-row cols-2">
            <div class="kpi tone-pass">
              <div class="num">{{ physical.rectifyCompleteRate }}%</div>
              <div class="label">整改完成率</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ physical.rectifyOverdueCount }}</div>
              <div class="label">整改延期数量</div>
            </div>
          </div>
        </div>
      </section>

      <section class="kpi-panel">
        <div class="panel-title">专项验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-2">
            <div class="kpi tone-task">
              <div class="num">{{ special.taskTotal }}</div>
              <div class="label">验收任务数量</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.taskPassed }}</div>
              <div class="label">已验收通过任务数量</div>
            </div>
          </div>
          <div class="kpi-row cols-2">
            <div class="kpi tone-pass">
              <div class="num">{{ special.passRate }}%</div>
              <div class="label">通过率</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.firstPassRate }}%</div>
              <div class="label">一次性通过率</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-task">
              <div class="num">{{ special.rectifyTotal }}</div>
              <div class="label">整改总数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.rectifyCompleteRate }}%</div>
              <div class="label">整改完成率</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ special.rectifyOverdueCount }}</div>
              <div class="label">整改延期数量</div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 项目级：实体 / 专项，两行横向铺开 -->
    <div v-else class="kpi-panels project-panels">
      <section class="kpi-panel">
        <div class="panel-title">实体验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-6">
            <div class="kpi tone-task">
              <div class="num">{{ physical.taskTotal }}</div>
              <div class="label">验收任务数量</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.taskPassed }}</div>
              <div class="label">已验收通过任务数量</div>
            </div>
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
              <div class="label">节点验收完成率</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.passRate }}%</div>
              <div class="label">通过率</div>
            </div>
          </div>
          <div class="kpi-row cols-6">
            <div class="kpi tone-pass">
              <div class="num">{{ physical.firstPassRate }}%</div>
              <div class="label">一次性通过率</div>
            </div>
            <div class="kpi tone-task">
              <div class="num">{{ physical.rectifyTotal }}</div>
              <div class="label">整改总数</div>
            </div>
            <div class="kpi tone-mute">
              <div class="num">{{ physical.rectifying }}</div>
              <div class="label">整改中</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ physical.rectifyCompleteRate }}%</div>
              <div class="label">整改完成率</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ physical.planOverdueCount }}</div>
              <div class="label">计划延期数量</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ physical.rectifyOverdueCount }}</div>
              <div class="label">整改延期数量</div>
            </div>
          </div>
        </div>
      </section>

      <section class="kpi-panel">
        <div class="panel-title">专项验收</div>
        <div class="kpi-rows">
          <div class="kpi-row cols-4">
            <div class="kpi tone-task">
              <div class="num">{{ special.taskTotal }}</div>
              <div class="label">验收任务数量</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.taskPassed }}</div>
              <div class="label">已验收通过任务数量</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.passRate }}%</div>
              <div class="label">通过率</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.firstPassRate }}%</div>
              <div class="label">一次性通过率</div>
            </div>
          </div>
          <div class="kpi-row cols-3">
            <div class="kpi tone-task">
              <div class="num">{{ special.rectifyTotal }}</div>
              <div class="label">整改总数</div>
            </div>
            <div class="kpi tone-pass">
              <div class="num">{{ special.rectifyCompleteRate }}%</div>
              <div class="label">整改完成率</div>
            </div>
            <div class="kpi tone-warn">
              <div class="num">{{ special.rectifyOverdueCount }}</div>
              <div class="label">整改延期数量</div>
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
  gap: 14px;
  align-items: stretch;
}
.hq-panels {
  grid-template-columns: 0.75fr 1.2fr 0.95fr;
}
.project-panels {
  grid-template-columns: 1.65fr 1fr;
}
.kpi-panel {
  border: 1px solid #f0e0e4;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.panel-title {
  font-size: 14px;
  font-weight: 650;
  color: #91003d;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #91003d;
}
.kpi-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.kpi-row {
  display: grid;
  gap: 8px;
  flex: 1;
  min-height: 0;
}
.kpi-row.cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.kpi-row.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.kpi-row.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.kpi-row.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.kpi {
  min-width: 0;
  padding: 10px 6px;
  text-align: center;
  border-radius: 8px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.kpi .num {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.kpi .label {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.3;
  color: #606266;
  word-break: break-word;
}

/* 任务量 · 蓝 */
.kpi.tone-task {
  background: #f0f6ff;
  border-color: #c8dbf5;
}
.kpi.tone-task .num { color: #1e5bb8; }

/* 通过 / 完成 · 完成色 */
.kpi.tone-pass {
  background: #f1faf3;
  border-color: #c5e6ce;
}
.kpi.tone-pass .num { color: #1f7a3f; }

/* 进行中 · 品牌酒红 */
.kpi.tone-rate {
  background: #fbf5f6;
  border-color: #f0e0e4;
}
.kpi.tone-rate .num { color: #91003d; }

/* 延期 · 提醒色（计划延期 / 整改延期统一） */
.kpi.tone-warn {
  background: #fff8ef;
  border-color: #f0d6b0;
}
.kpi.tone-warn .num { color: #d48806; }

/* 中性 · 灰 */
.kpi.tone-mute {
  background: #f7f8fa;
  border-color: #e8eaed;
}
.kpi.tone-mute .num { color: #606266; }

.section-title { font-weight: 600; }

@media (max-width: 1400px) {
  .project-panels .kpi-row.cols-6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 1100px) {
  .hq-panels,
  .project-panels {
    grid-template-columns: 1fr;
  }
  .project-panels .kpi-row.cols-6,
  .project-panels .kpi-row.cols-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
