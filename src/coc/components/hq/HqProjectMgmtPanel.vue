<script setup>
import { computed } from 'vue'
import { getProjectManagementPersonnel } from '../../mock/data.js'
import CocPanelHeading from './CocPanelHeading.vue'

/**
 * 项目级大屏 ·「管理人员清单」（深色主题）
 * 原位于「项目调度」页左下，2026-10-16 与「项目值班」对调后落在项目级首页左下。
 * 标题行渲染在卡片内（卡片底色覆盖标题栏），与首页其余面板口径一致。
 */
const props = defineProps({
  projectId: { type: String, required: true },
})

const managementList = computed(() => getProjectManagementPersonnel(props.projectId))
</script>

<template>
  <div class="panel-card mgmt-panel">
    <CocPanelHeading title="管理人员清单">
      <template #actions>
        <span class="mgmt-count">共 {{ managementList.length }} 人</span>
      </template>
    </CocPanelHeading>

    <div class="panel-body mgmt-body">
      <div class="table-scroll">
        <table class="mgmt-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>岗位</th>
              <th>单位</th>
              <th>在场状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in managementList" :key="row.id">
              <td>{{ row.name }}</td>
              <td>{{ row.role }}</td>
              <td class="desc" :title="row.unit">{{ row.unit }}</td>
              <td>
                <span class="status-tag" :class="row.onSite ? 'is-onsite' : 'is-offsite'">
                  {{ row.onSiteStatus }}
                </span>
              </td>
            </tr>
            <tr v-if="!managementList.length">
              <td colspan="4" class="empty-row">暂无管理人员记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mgmt-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mgmt-panel > :deep(.hq-panel-heading-wrap) {
  padding: 10px 14px 0;
}

.mgmt-count {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 500;
  color: var(--coc-text-secondary);
  white-space: nowrap;
}

.mgmt-body {
  flex: 1;
  min-height: 0;
  padding: 0 !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.mgmt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(13px + var(--coc-font-boost));
}

.mgmt-table th,
.mgmt-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
}

.mgmt-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--coc-table-head-bg);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.mgmt-table .desc {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.status-tag.is-onsite {
  color: #5eeeff;
  background: rgba(94, 238, 255, 0.14);
}

.status-tag.is-offsite {
  color: #a8abb2;
  background: rgba(255, 255, 255, 0.08);
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}
</style>
