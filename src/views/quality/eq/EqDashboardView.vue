<script setup>
import '../mat/mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId, useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  getNoSampleAllowed,
  listNoSampleSwitchByProject,
  setNoSampleAllowed,
} from '../../../mock/mat.js'
import {
  buildHqDashboardByProject,
  getDashboard as getEqDashboard,
  STATUS_LABEL,
} from '../../../mock/eq.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tick = ref(0)
const keyword = ref('')
const switchKw = ref('')

const dash = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) {
    return {
      total_batches: 0,
      pending_count: 0,
      approved_count: 0,
      exited_count: 0,
      brand_match_rate: 0,
      mismatch_open: [],
      allow_no_sample: false,
    }
  }
  return getEqDashboard(scopeProjectId.value)
})

const hqRows = computed(() => {
  void tick.value
  return buildHqDashboardByProject()
})

const hqFiltered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return hqRows.value
  return hqRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

const switchRows = computed(() => {
  void tick.value
  return listNoSampleSwitchByProject()
})

const switchFiltered = computed(() => {
  const kw = switchKw.value.trim()
  if (!kw) return switchRows.value
  return switchRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

const projectAllowNoSample = computed(() => {
  void tick.value
  if (!scopeProjectId.value) return false
  return getNoSampleAllowed(scopeProjectId.value)
})

function onToggleNoSample(row, val) {
  const r = setNoSampleAllowed(row.project_id, val)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success(
    val
      ? `已开启：${row.project_name} 允许无定样进场（材料/设备共用）`
      : `已关闭：${row.project_name} 须关联定样`,
  )
}

function resetKw() {
  keyword.value = ''
}

function resetSwitchKw() {
  switchKw.value = ''
}

function goMismatch() {
  router.push({ path: '/qm/eq/ledger', query: { brandMatch: '0', status: 'approved' } })
}

function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '质量看板' : '设备进场管理' }} / 设备进场看板
      </div>
      <h1 class="page-title">设备进场看板</h1>
      <p class="page-tip">
        <template v-if="isHqSelected">
          指挥部：按项目汇总；无定样例外与材料进场共用同一套项目开关
        </template>
        <template v-else>
          当前：{{ scopeProjectLabel }} · 无定样开关由指挥部配置
        </template>
      </p>
    </div>

    <template v-if="isHqSelected">
      <el-card shadow="never" class="mb">
        <template #header>
          <div class="title-row">
            <strong>无定样例外开关</strong>
            <span class="muted">与材料进场共用；开启后该项目设备进场亦可无定样</span>
          </div>
        </template>
        <div class="filter-bar mb">
          <el-input
            v-model="switchKw"
            clearable
            placeholder="项目名称"
            style="width: 260px"
            :prefix-icon="Search"
          />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="resetSwitchKw">重置</el-button>
        </div>
        <el-table :data="switchFiltered" stripe border empty-text="暂无项目" max-height="360">
          <el-table-column
            prop="project_name"
            label="项目名称"
            min-width="240"
            show-overflow-tooltip
          />
          <el-table-column label="无定样例外" width="200" align="center">
            <template #default="{ row }">
              <el-switch
                :model-value="row.allow_no_sample"
                active-text="允许"
                inactive-text="关闭"
                @change="(val) => onToggleNoSample(row, val)"
              />
            </template>
          </el-table-column>
          <el-table-column label="状态说明" min-width="200">
            <template #default="{ row }">
              <el-tag size="small" :type="row.allow_no_sample ? 'warning' : 'info'" effect="plain">
                {{ row.allow_no_sample ? '可无定样进场' : '须关联定样' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="title-row">
            <strong>项目进场汇总</strong>
            <span class="muted">点击「查看项目详情」进入该项目看板</span>
          </div>
        </template>
        <div class="filter-bar mb">
          <el-input
            v-model="keyword"
            clearable
            placeholder="项目名称"
            style="width: 260px"
            :prefix-icon="Search"
          />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="resetKw">重置</el-button>
        </div>
        <el-table :data="hqFiltered" stripe border empty-text="暂无项目数据">
          <el-table-column
            prop="project_name"
            label="项目名称"
            min-width="220"
            fixed
            show-overflow-tooltip
          />
          <el-table-column prop="entry_count" label="进场登记次数" width="130" align="center" />
          <el-table-column prop="exit_count" label="退场登记次数" width="130" align="center" />
          <el-table-column label="品牌一致率" width="120" align="center">
            <template #default="{ row }">{{ row.brand_match_rate }}%</template>
          </el-table-column>
          <el-table-column
            prop="mismatch_not_exited"
            label="品牌不一致未退场"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              <span :class="{ 'is-warn': row.mismatch_not_exited > 0 }">{{
                row.mismatch_not_exited
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <template v-else>
      <div class="stat-grid mb">
        <div class="stat-card">
          <div class="label">进场批次</div>
          <div class="value">{{ dash.total_batches }}</div>
        </div>
        <div class="stat-card">
          <div class="label">待监理审</div>
          <div class="value">{{ dash.pending_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">已通过</div>
          <div class="value">{{ dash.approved_count }}</div>
        </div>
        <div class="stat-card">
          <div class="label">品牌一致率</div>
          <div class="value">
            {{ dash.brand_match_rate }}<span class="unit">%</span>
          </div>
        </div>
      </div>

      <el-alert
        v-if="scopeProjectId"
        class="mb"
        :closable="false"
        show-icon
        :type="projectAllowNoSample ? 'warning' : 'info'"
        :title="
          projectAllowNoSample
            ? '本项目已开启无定样例外（指挥部配置，材料/设备共用）'
            : '本项目须关联定样进场（无定样例外由指挥部在看板配置）'
        "
      />

      <el-card shadow="never">
        <template #header>
          <div class="title-row">
            <span>提醒：品牌不一致（已通过）</span>
            <el-button link type="primary" @click="goMismatch">查看台账</el-button>
          </div>
        </template>
        <el-table :data="dash.mismatch_open" stripe border empty-text="暂无此类提醒">
          <el-table-column prop="entry_id" label="进场单号" width="120" />
          <el-table-column prop="equipment_name" label="设备" min-width="120" />
          <el-table-column prop="brand_name" label="品牌" width="120" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">{{ STATUS_LABEL[row.status] }}</template>
          </el-table-column>
          <el-table-column prop="finish_time" label="通过时间" width="170" />
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="router.push(`/qm/eq/applications/detail?id=${row.entry_id}`)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.is-warn {
  color: #e6a23c;
  font-weight: 600;
}
</style>
