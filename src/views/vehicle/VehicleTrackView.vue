<script setup>
/**
 * 车辆轨迹监管（参考人员轨迹：平台不做统一轨迹回放）
 * - 指挥部：列出各项目车辆定位系统跳转配置总览，可逐项打开
 * - 项目：展示当前项目跳转卡片，未配置则提示；可在本页内维护跳转配置
 * - 电子围栏 / 禁行偏离由施工方子系统处理，平台不维护
 */
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, Promotion } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { getVehicleMenuItem } from '../../config/vehicleMenu.js'
import {
  projectTree,
  getProjectLabel,
  getDefaultProjectId,
  getProjectVehicleTrackCapability,
  saveProjectVehicleTrackCapability,
  listProjectVehicleTrackJumpConfigs,
} from '../../mock/vehicleManagement'

const menuItem = getVehicleMenuItem('vehicle-track')
const { isHqSelected, selectedProjectId, headerProjectLabel } = useCurrentProject()

const activeProjectId = computed(() => {
  if (isHqSelected.value) return ''
  if (!selectedProjectId.value || selectedProjectId.value === 'hq') return getDefaultProjectId()
  return selectedProjectId.value
})

const activeProjectLabel = computed(() => {
  if (isHqSelected.value) return headerProjectLabel.value
  return getProjectLabel(activeProjectId.value) || headerProjectLabel.value
})

const jumpConfig = computed(() => getProjectVehicleTrackCapability(activeProjectId.value))
const hqRows = computed(() => listProjectVehicleTrackJumpConfigs())

const editing = ref(false)
const form = ref({ enabled: false, systemName: '', url: '' })

function startEdit() {
  form.value = { ...jumpConfig.value }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

function saveConfig() {
  const result = saveProjectVehicleTrackCapability(activeProjectId.value, form.value)
  if (!result) {
    ElMessage.warning('当前层级不支持保存车辆轨迹跳转配置')
    return
  }
  ElMessage.success(`已保存「${activeProjectLabel.value}」车辆轨迹跳转配置`)
  editing.value = false
}

watch(activeProjectId, () => {
  editing.value = false
})

function openExternalTrack(cfg = jumpConfig.value) {
  if (!cfg?.enabled || !cfg?.url) {
    ElMessage.warning('当前项目未配置车辆定位系统跳转地址')
    return
  }
  window.open(cfg.url, '_blank', 'noopener,noreferrer')
  ElMessage.success(`正在打开「${cfg.systemName || '项目车辆定位系统'}」`)
}
</script>

<template>
  <div class="track-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">车辆管理 / 车辆轨迹监管</div>
      <h1 class="page-title">车辆轨迹监管</h1>
      <p class="page-tip">{{ menuItem?.description }}</p>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ activeProjectLabel }}</p>
    </div>

    <template v-if="isHqSelected">
      <el-table :data="hqRows" border stripe class="ap-table">
        <el-table-column prop="projectName" label="项目" min-width="200" />
        <el-table-column label="跳转状态" width="120" align="center">
          <template #default="{ row }">
            <span class="ap-status-tag" :class="row.enabled ? 'ap-tag-enabled' : 'ap-tag-draft'">
              {{ row.enabled ? '已配置' : '未配置' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="systemName" label="自有系统名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="url" label="跳转地址" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :disabled="!row.enabled || !row.url"
              @click="openExternalTrack(row)"
            >
              打开
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <section v-else class="jump-card">
      <div class="jump-title">{{ activeProjectLabel }} · 项目自有车辆定位系统</div>

      <template v-if="!editing">
        <template v-if="jumpConfig.enabled">
          <p class="jump-desc">系统名称：{{ jumpConfig.systemName || '未命名车辆定位系统' }}</p>
          <p class="jump-url">{{ jumpConfig.url }}</p>
          <div class="jump-actions">
            <el-button type="primary" class="ap-btn-primary" :icon="Promotion" @click="openExternalTrack">
              跳转至项目车辆定位系统
            </el-button>
            <el-button :icon="Link" @click="startEdit">编辑配置</el-button>
          </div>
        </template>
        <el-empty v-else description="本项目未配置车辆定位系统跳转，暂不强制接入">
          <template #image>
            <el-icon :size="40" color="#909399"><Link /></el-icon>
          </template>
          <p class="empty-hint">请在下方为项目维护外部车辆定位系统名称与 URL。</p>
          <el-button type="primary" class="ap-btn-primary" @click="startEdit">配置跳转</el-button>
        </el-empty>
      </template>

      <template v-else>
        <div class="config-title">车辆轨迹跳转配置</div>
        <el-form label-width="120px" class="track-form">
          <el-form-item label="启用外链跳转">
            <el-switch v-model="form.enabled" />
          </el-form-item>
          <el-form-item label="系统名称">
            <el-input v-model="form.systemName" placeholder="如：车辆 GPS 定位平台" />
          </el-form-item>
          <el-form-item label="跳转 URL">
            <el-input v-model="form.url" placeholder="https://" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="ap-btn-primary" @click="saveConfig">保存</el-button>
            <el-button @click="cancelEdit">取消</el-button>
          </el-form-item>
        </el-form>
      </template>
    </section>
  </div>
</template>

<style scoped>
.track-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.page-tip { margin: 0 0 8px; font-size: 12px; color: var(--ap-text-muted); line-height: 1.6; }
.page-scope { margin: 0; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.jump-card {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 28px 24px;
  max-width: 720px;
}
.jump-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.jump-desc { font-size: 14px; color: var(--ap-text-secondary); margin: 0 0 6px; }
.jump-url { font-size: 13px; color: var(--ap-text-muted); word-break: break-all; margin: 0 0 16px; }
.jump-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.empty-hint { margin-top: 8px; font-size: 12px; color: var(--ap-text-muted); }
.config-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
.track-form { max-width: 560px; }
</style>
