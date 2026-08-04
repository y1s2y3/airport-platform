<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, Promotion } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectLabel,
  getDefaultProjectId,
  getProjectTrackJump,
  listProjectTrackJumpConfigs,
} from '../../mock/laborPersonnelTrack'

const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()
const filterProjectId = ref(getDefaultProjectId())

const projectOptions = computed(() =>
  projectTree.flatMap(
    (group) =>
      group.children?.map((item) => ({
        id: item.id,
        label: item.label.replace(/\(\d+\)$/, ''),
      })) || [],
  ),
)

const activeProjectId = computed(() =>
  isHqSelected.value ? filterProjectId.value : laborProjectId.value,
)

const activeProjectLabel = computed(() => getProjectLabel(activeProjectId.value))
const jumpConfig = computed(() => getProjectTrackJump(activeProjectId.value))
const hqRows = computed(() => listProjectTrackJumpConfigs())

watch(activeProjectId, () => {}, { immediate: true })

function openExternalTrack(cfg = jumpConfig.value) {
  if (!cfg?.enabled || !cfg?.url) {
    ElMessage.warning('当前项目未配置轨迹系统跳转地址')
    return
  }
  window.open(cfg.url, '_blank', 'noopener,noreferrer')
  ElMessage.success(`正在打开「${cfg.systemName || '项目轨迹系统'}」`)
}
</script>

<template>
  <div class="track-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员轨迹</div>
      <h1 class="page-title">人员轨迹</h1>
      <p class="page-tip">
        不强制统一安全帽/轨迹硬件与数据标准。平台仅按项目配置独立跳转入口，访问各项目自有轨迹系统；COC 暂不做人员轨迹展示。
      </p>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ projectLabel }}</p>
    </div>

    <template v-if="isHqSelected">
      <div class="filter-bar">
        <el-select v-model="filterProjectId" placeholder="选择项目" style="width: 260px">
          <el-option v-for="opt in projectOptions" :key="opt.id" :label="opt.label" :value="opt.id" />
        </el-select>
      </div>
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
      <div class="jump-title">{{ activeProjectLabel }} · 项目自有轨迹系统</div>
      <template v-if="jumpConfig.enabled">
        <p class="jump-desc">系统名称：{{ jumpConfig.systemName || '未命名轨迹系统' }}</p>
        <p class="jump-url">{{ jumpConfig.url }}</p>
        <el-button type="primary" class="ap-btn-primary" :icon="Promotion" @click="openExternalTrack">
          跳转至项目轨迹系统
        </el-button>
      </template>
      <el-empty v-else description="本项目未配置轨迹系统跳转，暂不强制接入">
        <template #image>
          <el-icon :size="40" color="#909399"><Link /></el-icon>
        </template>
        <p class="empty-hint">请在「实名制配置」中为项目维护外部轨迹系统名称与 URL。</p>
      </el-empty>
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
.filter-bar { margin-bottom: 12px; }
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
.empty-hint { margin-top: 8px; font-size: 12px; color: var(--ap-text-muted); }
</style>
