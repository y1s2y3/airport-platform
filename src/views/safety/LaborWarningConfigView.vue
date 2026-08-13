<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { projectTree, getProjectLabel, getDefaultProjectId } from '../../mock/laborRealName'
import {
  getProjectWarningConfig,
  saveProjectWarningConfig,
  getProjectTrackJump,
  saveProjectTrackJump,
  tierPositionCatalog,
  tierPersonnelCatalog,
  getTierPersonnelByPosition,
  createEmptyTierLevel,
  TIER_LEVEL_MAX,
  warningRuleDefinitions,
} from '../../mock/laborWarningConfig'

const { isHqSelected, projectLabel, laborProjectId } = useCurrentProject()
const form = ref(null)
const saving = ref(false)
const selectedProjectId = ref('')
const projectTrackJump = ref({ enabled: false, systemName: '', url: '' })

const activeProjectId = computed(() => {
  if (isHqSelected.value) return selectedProjectId.value
  return laborProjectId.value
})

const selectedScopeLabel = computed(() => {
  const id = activeProjectId.value
  return id ? getProjectLabel(id) || '项目配置' : '请选择项目'
})

const treeData = computed(() =>
  projectTree.flatMap((group) =>
    (group.children || []).map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  ),
)

const flatProjectIds = computed(() =>
  projectTree.flatMap((g) => (g.children || []).map((c) => c.id)),
)

function loadProject(projectId) {
  if (!projectId) {
    form.value = null
    return
  }
  form.value = getProjectWarningConfig(projectId)
  projectTrackJump.value = { ...getProjectTrackJump(projectId) }
}

watch(
  [isHqSelected, laborProjectId],
  () => {
    if (isHqSelected.value) {
      if (!selectedProjectId.value || !flatProjectIds.value.includes(selectedProjectId.value)) {
        selectedProjectId.value = getDefaultProjectId() || flatProjectIds.value[0] || ''
      }
      loadProject(selectedProjectId.value)
    } else {
      loadProject(laborProjectId.value)
    }
  },
  { immediate: true },
)

function handleNodeClick(data) {
  if (!data?.id) return
  selectedProjectId.value = data.id
  loadProject(data.id)
}

function validateForm() {
  if (!form.value || !activeProjectId.value) return false
  if (projectTrackJump.value.enabled && !projectTrackJump.value.url.trim()) {
    ElMessage.warning('启用跳转时请填写外部轨迹系统 URL')
    return false
  }
  const defaultRecipient = form.value.defaultRecipient || {}
  if (!defaultRecipient.recipientId) {
    ElMessage.warning('请选择默认接收人责任人')
    return false
  }
  if (!defaultRecipient.positionId) {
    ElMessage.warning('请选择默认接收人岗位')
    return false
  }
  const levels = form.value.tieredControl.levels || []
  if (!levels.length) {
    ElMessage.warning('请至少配置一级分级管控')
    return false
  }
  for (let i = 0; i < levels.length; i += 1) {
    const item = levels[i]
    const label = `第${i + 1}级`
    if (!item.recipientId) {
      ElMessage.warning(`请选择${label}责任人`)
      return false
    }
    if (!item.positionId) {
      ElMessage.warning(`请选择${label}岗位`)
      return false
    }
    if (!item.reportDays || item.reportDays < 1) {
      ElMessage.warning(`请填写${label}的有效上报天数`)
      return false
    }
  }
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i].reportDays < levels[i - 1].reportDays) {
      ElMessage.warning('各层级上报天数应按顺序递增设置（后一级 ≥ 前一级）')
      return false
    }
  }
  const absentRule = form.value.warningRules.absentDays
  if (absentRule.enabled && (!absentRule.days || absentRule.days < 1)) {
    ElMessage.warning('请填写连续未出勤天数')
    return false
  }
  const managerAttendanceRule = form.value.warningRules.managerAttendance
  if (managerAttendanceRule.enabled && (!managerAttendanceRule.days || managerAttendanceRule.days < 1)) {
    ElMessage.warning('请填写管理人员每月出勤天数阈值')
    return false
  }
  const workRule = form.value.warningRules.workOver12h
  if (workRule.enabled && (!workRule.hours || workRule.hours < 1)) {
    ElMessage.warning('请填写连续工作时长阈值')
    return false
  }
  const ageRule = form.value.warningRules.ageLimit
  if (ageRule.enabled && (!ageRule.minAge || ageRule.minAge < 1)) {
    ElMessage.warning('请填写实名制年龄下限')
    return false
  }
  const elderlyRule = form.value.warningRules.elderlyReminder
  if (elderlyRule.enabled) {
    if (!elderlyRule.maleAge || elderlyRule.maleAge < 1 || !elderlyRule.femaleAge || elderlyRule.femaleAge < 1) {
      ElMessage.warning('请填写高龄提醒年龄阈值')
      return false
    }
  }
  return true
}

async function handleSave() {
  if (!validateForm()) return
  saving.value = true
  try {
    saveProjectWarningConfig(activeProjectId.value, form.value)
    saveProjectTrackJump(activeProjectId.value, projectTrackJump.value)
    ElMessage.success(`已保存「${selectedScopeLabel.value}」实名制配置`)
  } finally {
    saving.value = false
  }
}

const tierLevels = computed({
  get: () => form.value?.tieredControl?.levels || [],
  set: (list) => {
    if (!form.value) return
    form.value.tieredControl.levels = list
  },
})

function personnelOptionsFor(row) {
  const matched = getTierPersonnelByPosition(row.positionId)
  const matchedIds = new Set(matched.map((u) => u.id))
  const others = tierPersonnelCatalog.filter((u) => !matchedIds.has(u.id))
  return { matched, others }
}

function onTierPositionChange(row) {
  const matched = getTierPersonnelByPosition(row.positionId)
  if (!matched.some((u) => u.id === row.recipientId)) {
    row.recipientId = ''
  }
}

function onDefaultPositionChange() {
  if (!form.value?.defaultRecipient) return
  const matched = getTierPersonnelByPosition(form.value.defaultRecipient.positionId)
  if (!matched.some((u) => u.id === form.value.defaultRecipient.recipientId)) {
    form.value.defaultRecipient.recipientId = ''
  }
}

const defaultPersonnelOptions = computed(() => {
  const positionId = form.value?.defaultRecipient?.positionId || ''
  return personnelOptionsFor({ positionId })
})

function addTierLevel() {
  if (!form.value) return
  const list = form.value.tieredControl.levels
  if (list.length >= TIER_LEVEL_MAX) {
    ElMessage.warning(`最多配置 ${TIER_LEVEL_MAX} 级`)
    return
  }
  list.push(createEmptyTierLevel(list.length + 1))
}

function removeTierLevel(index) {
  if (!form.value) return
  const list = form.value.tieredControl.levels
  if (list.length <= 1) {
    ElMessage.warning('至少保留一级')
    return
  }
  list.splice(index, 1)
}
</script>

<template>
  <div v-if="form" class="warning-config-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 实名制配置</div>
      <div class="page-heading">
        <h1 class="page-title">实名制配置</h1>
        <div class="header-actions">
          <el-button class="ap-btn-primary" type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
      <p class="page-tip">
        默认接收人、分级管控、预警规则与人员轨迹外链均按项目单独配置；平台不做人员填报，工资明细本期不采集。
      </p>
    </div>

    <div class="config-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="handleNodeClick"
        />
      </aside>

      <div class="config-panel">
        <div class="panel-head">
          <div class="panel-title">{{ selectedScopeLabel }}</div>
          <el-tag size="small" type="success" effect="plain">按项目可编辑</el-tag>
        </div>

        <section class="config-section">
          <div class="section-head">
            <div>
              <div class="section-title">人员轨迹跳转配置</div>
              <p class="section-desc">不统一轨迹硬件与数据标准；按项目配置独立跳转到自有系统。</p>
            </div>
          </div>
          <el-form label-width="160px" class="track-form">
            <el-form-item label="启用外链跳转">
              <el-switch v-model="projectTrackJump.enabled" />
            </el-form-item>
            <el-form-item label="系统名称">
              <el-input v-model="projectTrackJump.systemName" placeholder="如：现场安全帽定位平台" />
            </el-form-item>
            <el-form-item label="跳转 URL">
              <el-input v-model="projectTrackJump.url" placeholder="https://" />
            </el-form-item>
          </el-form>
        </section>

        <section class="config-section">
          <div class="section-head">
            <div>
              <div class="section-title">默认接收人</div>
              <p class="section-desc">预警触发后先通知默认接收人；超期未关闭再按下方分级管控逐级上报。</p>
            </div>
          </div>
          <el-form v-if="form?.defaultRecipient" label-width="88px" class="default-recipient-form">
            <el-row :gutter="24">
              <el-col :xs="24" :sm="12">
                <el-form-item label="责任人" required>
                  <el-select
                    v-model="form.defaultRecipient.recipientId"
                    placeholder="请选择人员"
                    filterable
                    style="width: 100%"
                  >
                    <el-option-group
                      v-if="defaultPersonnelOptions.matched.length"
                      label="本岗位候选人"
                    >
                      <el-option
                        v-for="user in defaultPersonnelOptions.matched"
                        :key="user.id"
                        :label="user.name"
                        :value="user.id"
                      />
                    </el-option-group>
                    <el-option-group
                      v-if="defaultPersonnelOptions.others.length"
                      label="其他人员"
                    >
                      <el-option
                        v-for="user in defaultPersonnelOptions.others"
                        :key="user.id"
                        :label="user.name"
                        :value="user.id"
                      />
                    </el-option-group>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12">
                <el-form-item label="岗位" required>
                  <el-select
                    v-model="form.defaultRecipient.positionId"
                    placeholder="请选择岗位"
                    filterable
                    style="width: 100%"
                    @change="onDefaultPositionChange"
                  >
                    <el-option
                      v-for="pos in tierPositionCatalog"
                      :key="pos.id"
                      :label="pos.name"
                      :value="pos.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </section>

        <section class="config-section">
          <div class="section-head">
            <div>
              <div class="section-title">分级管控</div>
              <p class="section-desc">
                预警超期未处置时按层级逐级上报。责任人、岗位可灵活选择；可增删层级（最多 {{ TIER_LEVEL_MAX }} 级），上报天数须逐级递增。
              </p>
            </div>
            <el-button type="primary" class="ap-btn-primary" @click="addTierLevel">添加层级</el-button>
          </div>
          <div class="tier-table-wrap">
            <el-table :data="tierLevels" border stripe class="ap-table tier-table">
              <el-table-column label="层级" width="72" align="center">
                <template #default="{ $index }">{{ $index + 1 }}级</template>
              </el-table-column>
              <el-table-column label="责任人" min-width="240">
                <template #default="{ row }">
                  <el-select
                    v-model="row.recipientId"
                    placeholder="请选择人员"
                    filterable
                    style="width: 100%"
                  >
                    <el-option-group
                      v-if="personnelOptionsFor(row).matched.length"
                      label="本岗位候选人"
                    >
                      <el-option
                        v-for="user in personnelOptionsFor(row).matched"
                        :key="user.id"
                        :label="user.name"
                        :value="user.id"
                      />
                    </el-option-group>
                    <el-option-group
                      v-if="personnelOptionsFor(row).others.length"
                      label="其他人员"
                    >
                      <el-option
                        v-for="user in personnelOptionsFor(row).others"
                        :key="user.id"
                        :label="user.name"
                        :value="user.id"
                      />
                    </el-option-group>
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="岗位" min-width="180">
                <template #default="{ row }">
                  <el-select
                    v-model="row.positionId"
                    placeholder="请选择岗位"
                    filterable
                    style="width: 100%"
                    @change="onTierPositionChange(row)"
                  >
                    <el-option
                      v-for="pos in tierPositionCatalog"
                      :key="pos.id"
                      :label="pos.name"
                      :value="pos.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="上报天数" width="200">
                <template #default="{ row }">
                  <div class="inline-field">
                    <span class="field-prefix">超</span>
                    <el-input-number
                      v-model="row.reportDays"
                      :min="1"
                      :max="30"
                      controls-position="right"
                      size="small"
                    />
                    <span class="field-suffix">天</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="90" align="center" fixed="right">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removeTierLevel($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section class="config-section">
          <div class="section-title">预警配置</div>
          <p class="section-desc">开启后系统将按规则自动检测并生成对应预警。</p>
          <div class="rule-list">
            <div v-for="rule in warningRuleDefinitions" :key="rule.key" class="rule-item">
              <div class="rule-main">
                <el-switch
                  v-model="form.warningRules[rule.key].enabled"
                  inline-prompt
                  active-text="开"
                  inactive-text="关"
                />
                <div class="rule-info">
                  <div class="rule-label-row">
                    <template v-if="rule.extra === 'hours'">
                      <span class="rule-label">连续工作超</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].hours"
                        :min="1"
                        :max="24"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">小时预警</span>
                    </template>
                    <template v-else-if="rule.extra === 'minAge'">
                      <span class="rule-label">实名制年龄低于</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].minAge"
                        :min="1"
                        :max="100"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">周岁预警</span>
                    </template>
                    <template v-else-if="rule.extra === 'elderlyAge'">
                      <span class="rule-label">高龄提醒（男</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].maleAge"
                        :min="1"
                        :max="100"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">岁/女</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].femaleAge"
                        :min="1"
                        :max="100"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">岁）</span>
                    </template>
                    <template v-else-if="rule.extra === 'days'">
                      <span class="rule-label">连续</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].days"
                        :min="1"
                        :max="90"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">天未出勤预警</span>
                    </template>
                    <template v-else-if="rule.extra === 'managerDays'">
                      <span class="rule-label">管理人员考勤不达标，每月出勤少于</span>
                      <el-input-number
                        v-model="form.warningRules[rule.key].days"
                        :min="1"
                        :max="31"
                        controls-position="right"
                        size="small"
                        class="rule-inline-input"
                      />
                      <span class="rule-label">天预警</span>
                    </template>
                    <span v-else class="rule-label">{{ rule.label }}</span>
                  </div>
                  <div class="rule-desc">{{ rule.description }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warning-config-page { padding: 20px 24px 32px; }
.page-header { margin-bottom: 20px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope { margin: 8px 0; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { margin: 8px 0 0; font-size: 12px; color: var(--ap-text-muted); }
.header-actions { display: flex; gap: 8px; }
.config-layout {
  display: grid;
  gap: 16px;
  min-height: 560px;
}
.config-layout.with-tree {
  grid-template-columns: 280px minmax(0, 1fr);
}
.project-tree-panel,
.config-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}
.panel-title { font-size: 15px; font-weight: 600; color: var(--ap-text); margin-bottom: 12px; }
.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.panel-head .panel-title { margin-bottom: 0; }
.project-tree :deep(.el-tree-node__content) { height: 34px; border-radius: 4px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}
.config-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fafafa;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.section-head .section-title { margin-bottom: 4px; }
.section-head .section-desc { margin: 0; }
.section-desc { font-size: 13px; color: var(--ap-text-muted); margin: 0 0 16px; }
.default-recipient-form {
  max-width: 920px;
}
.default-recipient-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
.default-recipient-form :deep(.el-form-item__content) {
  flex: 1;
}
.track-form { max-width: 640px; }
.tier-table-wrap { margin-top: 4px; }
.tier-table :deep(.el-input-number) { width: 100px; }
.inline-field { display: flex; align-items: center; gap: 8px; }
.field-prefix, .field-suffix { font-size: 14px; color: var(--ap-text-secondary); white-space: nowrap; }
.rule-list { display: flex; flex-direction: column; }
.rule-item {
  display: flex;
  padding: 16px 0;
  border-bottom: 1px solid var(--ap-border-light, #f0f0f0);
}
.rule-item:last-child { border-bottom: none; padding-bottom: 0; }
.rule-item:first-child { padding-top: 0; }
.rule-main { display: flex; align-items: flex-start; gap: 16px; flex: 1; min-width: 0; }
.rule-info { min-width: 0; }
.rule-label-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.rule-inline-input { width: 88px; }
.rule-label { font-size: 14px; font-weight: 500; }
.rule-desc { font-size: 12px; color: var(--ap-text-muted); line-height: 1.5; }
</style>
