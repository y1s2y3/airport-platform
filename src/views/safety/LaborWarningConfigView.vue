<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { projectTree, getProjectLabel } from '../../mock/laborRealName'
import {
  getWarningConfig,
  saveWarningConfig,
  resetWarningConfig,
  getProjectSiteIntegration,
  saveProjectSiteIntegration,
  tierRecipientOptions,
  tierLevelDefinitions,
  warningRuleDefinitions,
  integratedFieldPaths,
} from '../../mock/laborWarningConfig'

const HQ_NODE_ID = 'hq'
const { isHqSelected, projectLabel, laborProjectId } = useCurrentProject()
const form = ref(null)
const saving = ref(false)
const savingIntegration = ref(false)
const selectedNodeId = ref(HQ_NODE_ID)
const projectIntegration = ref({ enabled: true })

const isHqConfig = computed(() => selectedNodeId.value === HQ_NODE_ID)
const selectedScopeLabel = computed(() => {
  if (isHqConfig.value) return '工程指挥部（全局配置）'
  return getProjectLabel(selectedNodeId.value) || '项目配置'
})

const projectIntegrationPreview = computed(() =>
  getProjectSiteIntegration(laborProjectId.value),
)

function loadProjectIntegration(projectId) {
  projectIntegration.value = { ...getProjectSiteIntegration(projectId) }
}

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  })),
)

onMounted(() => {
  form.value = getWarningConfig()
})

watch(selectedNodeId, (id) => {
  if (id !== HQ_NODE_ID) loadProjectIntegration(id)
}, { immediate: true })

function handleNodeClick(data) {
  selectedNodeId.value = data.id
  if (data.id !== HQ_NODE_ID) loadProjectIntegration(data.id)
}

async function handleSaveIntegration() {
  if (isHqConfig.value) return
  savingIntegration.value = true
  try {
    saveProjectSiteIntegration(selectedNodeId.value, projectIntegration.value.enabled)
    ElMessage.success(`已保存「${getProjectLabel(selectedNodeId.value)}」现场实名制对接配置`)
  } finally {
    savingIntegration.value = false
  }
}

async function handleSave() {
  if (!form.value || !isHqConfig.value) return
  const levels = form.value.tieredControl.levels
  for (const tier of tierLevelDefinitions) {
    const item = levels[tier.key]
    if (!item?.reportDays || item.reportDays < 1) {
      ElMessage.warning(`请填写${tier.label}的有效上报天数`)
      return
    }
    if (!item.recipientId) {
      ElMessage.warning(`请选择${tier.label}责任人`)
      return
    }
  }
  for (let i = 1; i < tierLevelDefinitions.length; i += 1) {
    const prev = levels[tierLevelDefinitions[i - 1].key].reportDays
    const curr = levels[tierLevelDefinitions[i].key].reportDays
    if (curr < prev) {
      ElMessage.warning('各层级上报天数应按顺序递增设置（后一级 ≥ 前一级）')
      return
    }
  }
  const absentRule = form.value.warningRules.absentDays
  if (absentRule.enabled && (!absentRule.days || absentRule.days < 1)) {
    ElMessage.warning('请填写连续未出勤天数')
    return
  }
  const workRule = form.value.warningRules.workOver12h
  if (workRule.enabled && (!workRule.hours || workRule.hours < 1)) {
    ElMessage.warning('请填写连续工作时长阈值')
    return
  }
  const ageRule = form.value.warningRules.ageLimit
  if (ageRule.enabled && (!ageRule.minAge || ageRule.minAge < 1)) {
    ElMessage.warning('请填写实名制年龄下限')
    return
  }
  const elderlyRule = form.value.warningRules.elderlyReminder
  if (elderlyRule.enabled) {
    if (!elderlyRule.maleAge || elderlyRule.maleAge < 1 || !elderlyRule.femaleAge || elderlyRule.femaleAge < 1) {
      ElMessage.warning('请填写高龄提醒年龄阈值')
      return
    }
  }
  saving.value = true
  try {
    saveWarningConfig(form.value)
    ElMessage.success('实名制配置已保存，对所有项目生效')
  } finally {
    saving.value = false
  }
}

function handleReset() {
  if (!isHqConfig.value) return
  form.value = resetWarningConfig()
  ElMessage.info('已恢复默认配置')
}
</script>

<template>
  <div v-if="form" class="warning-config-page page-card">
    <!-- 工程指挥部层级：原有可编辑 + 项目树 -->
    <template v-if="isHqSelected">
      <div class="page-header">
        <div class="page-breadcrumb">人员实名制管理 / 实名制配置</div>
        <div class="page-heading">
          <h1 class="page-title">实名制配置</h1>
          <div v-if="isHqConfig" class="header-actions">
            <el-button @click="handleReset">恢复默认</el-button>
            <el-button class="ap-btn-primary" type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          </div>
        </div>
        <p class="page-tip">分级管控与预警配置在「工程指挥部」维护；现场实名制对接按项目单独配置，请选择具体项目节点操作。</p>
      </div>

      <div class="config-layout">
        <aside class="project-tree-panel">
          <div class="panel-title">项目列表</div>
          <el-tree
            :data="treeData"
            node-key="id"
            highlight-current
            default-expand-all
            :current-node-key="selectedNodeId"
            :expand-on-click-node="false"
            class="project-tree"
            @node-click="handleNodeClick"
          />
        </aside>

        <div class="config-panel" :class="{ readonly: !isHqConfig }">
          <div class="panel-head">
            <div class="panel-title">{{ selectedScopeLabel }}</div>
            <el-tag v-if="isHqConfig" size="small" type="success" effect="plain">可编辑</el-tag>
            <el-tag v-else size="small" type="warning" effect="plain">对接可编辑</el-tag>
          </div>
          <el-alert
            v-if="!isHqConfig"
            type="info"
            :closable="false"
            show-icon
            class="scope-alert"
            title="项目配置模式"
            description="分级管控与预警配置为全局只读预览；现场实名制对接可在本项目节点单独配置并保存。"
          />

          <section v-if="!isHqConfig" class="config-section integration-section">
            <div class="section-head">
              <div>
                <div class="section-title">现场实名制对接</div>
                <p class="section-desc">配置本项目是否与现场实名制系统对接及人员档案编辑策略。</p>
              </div>
              <el-button
                class="ap-btn-primary"
                type="primary"
                :loading="savingIntegration"
                @click="handleSaveIntegration"
              >
                保存对接配置
              </el-button>
            </div>
            <el-form label-width="160px" class="integration-form">
              <el-form-item label="是否对接现场实名制">
                <el-radio-group v-model="projectIntegration.enabled">
                  <el-radio :value="true">是</el-radio>
                  <el-radio :value="false">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
            <div v-if="projectIntegration.enabled" class="integration-hint enabled">
              <p>已开启对接，规则如下：</p>
              <ul>
                <li>人员实名制列表<strong>不支持新增</strong>，人员数据由现场系统同步</li>
                <li>对接同步字段<strong>不可编辑</strong>：姓名、手机号、证件信息、参建单位等</li>
                <li>平台补充字段<strong>可编辑</strong>：安全教育、合同附件、薪酬、入退场等</li>
              </ul>
              <div class="field-tags">
                <span class="field-tags-label">同步字段：</span>
                <el-tag v-for="field in integratedFieldPaths" :key="field" size="small" effect="plain">{{ field }}</el-tag>
              </div>
            </div>
            <div v-else class="integration-hint disabled">
              <p>未对接现场系统，规则如下：</p>
              <ul>
                <li>人员实名制<strong>支持新增</strong>人员</li>
                <li>全部字段<strong>可编辑</strong></li>
              </ul>
            </div>
          </section>

          <fieldset class="config-fieldset" :disabled="!isHqConfig">
            <section class="config-section">
              <div class="section-title">分级管控</div>
              <p class="section-desc">预警超期未处置时，按各层级设定天数自动逐级上报至对应责任人。</p>
              <div class="tier-table-wrap">
                <el-table :data="tierLevelDefinitions" border stripe class="ap-table tier-table">
                  <el-table-column label="层级" width="80" align="center">
                    <template #default="{ row }">{{ row.level }}级</template>
                  </el-table-column>
                  <el-table-column prop="label" label="岗位" width="140" />
                  <el-table-column label="上报天数" width="200">
                    <template #default="{ row }">
                      <div class="inline-field">
                        <span class="field-prefix">超</span>
                        <el-input-number
                          v-model="form.tieredControl.levels[row.key].reportDays"
                          :min="1"
                          :max="30"
                          controls-position="right"
                          size="small"
                        />
                        <span class="field-suffix">天</span>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="责任人" min-width="280">
                    <template #default="{ row }">
                      <el-select
                        v-model="form.tieredControl.levels[row.key].recipientId"
                        placeholder="请选择人员"
                        style="width: 100%"
                        filterable
                      >
                        <el-option
                          v-for="user in tierRecipientOptions[row.key]"
                          :key="user.id"
                          :label="`${user.name} · ${user.dept}`"
                          :value="user.id"
                        />
                      </el-select>
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
                        <span v-else class="rule-label">{{ rule.label }}</span>
                        <el-tag v-if="rule.scopeTag" size="small" type="info" effect="plain">{{ rule.scopeTag }}</el-tag>
                      </div>
                      <div class="rule-desc">{{ rule.description }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </fieldset>
        </div>
      </div>
    </template>

    <!-- 项目层级：只读预览，无项目树 -->
    <template v-else>
      <div class="page-header">
        <div class="page-breadcrumb">人员实名制管理 / 实名制配置</div>
        <div class="page-heading">
          <h1 class="page-title">实名制配置</h1>
          <el-tag size="small" type="info" effect="plain">只读</el-tag>
        </div>
        <p class="page-scope">当前项目：{{ projectLabel }}</p>
        <p class="page-tip">以下为当前项目适用的实名制配置预览，如需调整请联系系统管理员。</p>
      </div>

      <div class="config-panel readonly">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="scope-alert"
          title="配置只读"
          description="实名制配置由工程指挥部统一维护，本页仅展示当前项目生效的配置内容，不支持在线编辑。"
        />

        <fieldset class="config-fieldset" disabled>
          <section class="config-section">
            <div class="section-title">现场实名制对接</div>
            <p class="section-desc">是否与现场实名制系统对接及人员档案编辑策略。</p>
            <el-form label-width="160px" class="integration-form">
              <el-form-item label="是否对接现场实名制">
                <el-radio-group :model-value="projectIntegrationPreview.enabled" disabled>
                  <el-radio :value="true">是</el-radio>
                  <el-radio :value="false">否</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
            <div v-if="projectIntegrationPreview.enabled" class="integration-hint enabled">
              <p>已开启对接，规则如下：</p>
              <ul>
                <li>人员实名制列表<strong>不支持新增</strong>，人员数据由现场系统同步</li>
                <li>对接同步字段<strong>不可编辑</strong>：姓名、手机号、证件信息、参建单位等</li>
                <li>平台补充字段<strong>可编辑</strong>：安全教育、合同附件、薪酬、入退场等</li>
              </ul>
              <div class="field-tags">
                <span class="field-tags-label">同步字段：</span>
                <el-tag v-for="field in integratedFieldPaths" :key="field" size="small" effect="plain">{{ field }}</el-tag>
              </div>
            </div>
            <div v-else class="integration-hint disabled">
              <p>未对接现场系统，规则如下：</p>
              <ul>
                <li>人员实名制<strong>支持新增</strong>人员</li>
                <li>全部字段<strong>可编辑</strong></li>
              </ul>
            </div>
          </section>

          <section class="config-section">
            <div class="section-title">分级管控</div>
            <p class="section-desc">预警超期未处置时，按各层级设定天数自动逐级上报至对应责任人。</p>
            <div class="tier-table-wrap">
              <el-table :data="tierLevelDefinitions" border stripe class="ap-table tier-table">
                <el-table-column label="层级" width="80" align="center">
                  <template #default="{ row }">{{ row.level }}级</template>
                </el-table-column>
                <el-table-column prop="label" label="岗位" width="140" />
                <el-table-column label="上报天数" width="200">
                  <template #default="{ row }">
                    <span>超 {{ form.tieredControl.levels[row.key].reportDays }} 天</span>
                  </template>
                </el-table-column>
                <el-table-column label="责任人" min-width="280">
                  <template #default="{ row }">
                    {{
                      tierRecipientOptions[row.key]?.find((u) => u.id === form.tieredControl.levels[row.key].recipientId)
                        ? `${tierRecipientOptions[row.key].find((u) => u.id === form.tieredControl.levels[row.key].recipientId).name} · ${tierRecipientOptions[row.key].find((u) => u.id === form.tieredControl.levels[row.key].recipientId).dept}`
                        : '-'
                    }}
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
                    disabled
                  />
                  <div class="rule-info">
                    <div class="rule-label-row">
                      <template v-if="rule.extra === 'hours'">
                        <span class="rule-label">连续工作超 {{ form.warningRules[rule.key].hours }} 小时预警</span>
                      </template>
                      <template v-else-if="rule.extra === 'minAge'">
                        <span class="rule-label">实名制年龄低于 {{ form.warningRules[rule.key].minAge }} 周岁预警</span>
                      </template>
                      <template v-else-if="rule.extra === 'elderlyAge'">
                        <span class="rule-label">
                          高龄提醒（男 {{ form.warningRules[rule.key].maleAge }} 岁 / 女 {{ form.warningRules[rule.key].femaleAge }} 岁）
                        </span>
                      </template>
                      <template v-else-if="rule.extra === 'days'">
                        <span class="rule-label">连续 {{ form.warningRules[rule.key].days }} 天未出勤预警</span>
                      </template>
                      <span v-else class="rule-label">{{ rule.label }}</span>
                      <el-tag v-if="rule.scopeTag" size="small" type="info" effect="plain">{{ rule.scopeTag }}</el-tag>
                    </div>
                    <div class="rule-desc">{{ rule.description }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </fieldset>
      </div>
    </template>
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
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
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
.scope-alert { margin-bottom: 16px; }
.config-fieldset { border: none; margin: 0; padding: 0; min-width: 0; }
.config-fieldset:disabled { opacity: 0.92; }
.config-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fafafa;
  padding: 20px 24px;
  margin-bottom: 16px;
}
.config-panel.readonly .config-section { background: #fff; }
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
.integration-section { background: #fff; }
.section-desc { font-size: 13px; color: var(--ap-text-muted); margin: 0 0 16px; }
.integration-form { max-width: 640px; }
.integration-hint {
  margin-top: 4px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}
.integration-hint.enabled { background: #f0f7ff; border: 1px solid #d6e8ff; }
.integration-hint.disabled { background: #f6ffed; border: 1px solid #d9f7be; }
.integration-hint p { margin: 0 0 8px; font-weight: 600; }
.integration-hint ul { margin: 0; padding-left: 20px; }
.field-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; align-items: center; }
.field-tags-label { font-size: 12px; color: var(--ap-text-muted); }
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
