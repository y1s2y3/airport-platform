<script setup>
/**
 * 指挥部 · 车辆轨迹配置
 * 按项目维护车辆定位系统外链（启用 / 系统名称 / URL）；项目侧「车辆轨迹监管」菜单点击直接外跳。
 */
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { projectTree, getProjectLabel, getDefaultProjectId } from '../../mock/laborRealName'
import {
  getProjectVehicleTrackCapability,
  saveProjectVehicleTrackCapability,
} from '../../mock/vehicleManagement'

const saving = ref(false)
const selectedProjectId = ref('')
const form = ref({ enabled: false, system_name: '', url: '' })

const treeData = computed(() =>
  projectTree.flatMap((group) =>
    (group.children || []).map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  ),
)

const flatProjectIds = computed(() => treeData.value.map((item) => item.id))

const selectedScopeLabel = computed(() => {
  const id = selectedProjectId.value
  return id ? getProjectLabel(id) || '项目配置' : '请选择项目'
})

function loadProject(project_id) {
  if (!project_id) {
    form.value = { enabled: false, system_name: '', url: '' }
    return
  }
  form.value = { ...getProjectVehicleTrackCapability(project_id) }
}

watch(
  flatProjectIds,
  (ids) => {
    if (!selectedProjectId.value || !ids.includes(selectedProjectId.value)) {
      selectedProjectId.value = getDefaultProjectId() || ids[0] || ''
    }
    loadProject(selectedProjectId.value)
  },
  { immediate: true },
)

function handleNodeClick(data) {
  if (!data?.id) return
  selectedProjectId.value = data.id
  loadProject(data.id)
}

function handleSave() {
  if (!selectedProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (form.value.enabled && !String(form.value.url || '').trim()) {
    ElMessage.warning('启用跳转时请填写外部车辆定位系统 URL')
    return
  }
  saving.value = true
  try {
    saveProjectVehicleTrackCapability(selectedProjectId.value, form.value)
    ElMessage.success(`已保存「${selectedScopeLabel.value}」车辆轨迹跳转配置`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="track-config-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 车辆轨迹配置</div>
      <h1 class="page-title">车辆轨迹配置</h1>
      <p class="page-tip">
        指挥部按项目维护车辆定位系统外链；项目侧点击「车辆轨迹监管」将直接打开外链，平台不做统一轨迹回放与电子围栏。
      </p>
    </div>

    <div class="config-layout">
      <aside class="project-aside">
        <div class="aside-title">选择项目</div>
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
              <div class="section-title">车辆轨迹跳转配置</div>
              <p class="section-desc">不统一轨迹硬件与数据标准；按项目配置独立跳转到自有车辆定位系统。</p>
            </div>
            <el-button class="ap-btn-primary" type="primary" :loading="saving" @click="handleSave">
              保存跳转配置
            </el-button>
          </div>
          <el-form label-width="160px" class="track-form">
            <el-form-item label="启用外链跳转">
              <el-switch v-model="form.enabled" />
            </el-form-item>
            <el-form-item label="系统名称">
              <el-input v-model="form.system_name" placeholder="如：车辆 GPS 定位平台" />
            </el-form-item>
            <el-form-item label="跳转 URL">
              <el-input v-model="form.url" placeholder="https://" />
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-config-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.page-tip { margin: 0; font-size: 12px; color: var(--ap-text-muted); line-height: 1.6; }
.config-layout { display: flex; gap: 16px; min-height: 420px; }
.project-aside {
  width: 240px;
  flex-shrink: 0;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}
.aside-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.project-tree { background: transparent; }
.config-panel {
  flex: 1;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 24px;
}
.panel-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.panel-title { font-size: 16px; font-weight: 600; }
.config-section { margin-top: 8px; }
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.section-title { font-size: 15px; font-weight: 600; }
.section-desc { margin: 4px 0 0; font-size: 12px; color: var(--ap-text-muted); line-height: 1.5; }
.track-form { max-width: 560px; }
</style>
