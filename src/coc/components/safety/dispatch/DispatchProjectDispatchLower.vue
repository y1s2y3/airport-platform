<script setup>
import { ref, computed, inject } from 'vue'
import { DANGER_WORK_LIST, getProjectManagementPersonnel } from '../../../mock/data.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchRecordDetailBody from './DispatchRecordDetailBody.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'
import PersonnelRiskVerifyPanel from './PersonnelRiskVerifyPanel.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const props = defineProps({
  projectId: { type: String, required: true },
})

const dangerListPreview = DANGER_WORK_LIST.slice(0, 12)
const dangerListFull = DANGER_WORK_LIST

const dangerMoreOpen = ref(false)
const detailView = ref(null)

const managementList = computed(() => getProjectManagementPersonnel(props.projectId))

const workStatusMap = { 待开工: 'pending', 作业中: 'doing', 已完工: 'closed', 已取消: 'cancelled' }

const detailTitle = computed(() => {
  if (!detailView.value) return ''
  return '危险作业详情'
})

function openDangerDetail(row) {
  detailView.value = { kind: 'danger', data: { ...row } }
}

function closeDetail() {
  detailView.value = null
}
</script>

<template>
  <section class="detail-lower project-dispatch-lower">
    <div class="panel-card detail-panel list-panel danger-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
      <DispatchHqPanelTitle v-if="dispatchHqUi" title="危险作业清单">
        <template #actions>
          <button type="button" class="title-more-btn" @click="dangerMoreOpen = true">更多</button>
        </template>
      </DispatchHqPanelTitle>
      <div v-else class="panel-title compact danger-title-row title-left">
        <span class="danger-title-text">危险作业清单</span>
        <button type="button" class="title-more-btn" @click="dangerMoreOpen = true">
          更多
        </button>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
            <thead><tr><th>类型</th><th>地点</th><th>状态</th></tr></thead>
            <tbody>
              <tr
                v-for="row in dangerListPreview"
                :key="row.id"
                class="clickable-row"
                @click="openDangerDetail(row)"
              >
                <td>{{ row.type }}</td>
                <td class="desc" :title="row.location">{{ row.location }}</td>
                <td><span class="status-tag" :class="workStatusMap[row.status]">{{ row.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="panel-card detail-panel list-panel mgmt-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
      <DispatchHqPanelTitle v-if="dispatchHqUi" title="管理人员清单" show-v2-tag>
        <template #actions>
          <span class="mgmt-count">共 {{ managementList.length }} 人</span>
        </template>
      </DispatchHqPanelTitle>
      <div v-else class="panel-title compact mgmt-title-row title-left">
        <span class="mgmt-title-text">管理人员清单</span>
        <span class="panel-v2-tip">V2版本上线</span>
        <span class="mgmt-count">共 {{ managementList.length }} 人</span>
      </div>
      <div class="panel-body list-table-body list-wrap">
        <div class="table-scroll">
          <table class="mini-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>岗位</th>
                <th>单位</th>
                <th>在岗</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in managementList" :key="row.id">
                <td>{{ row.name }}</td>
                <td>{{ row.role }}</td>
                <td class="desc" :title="row.unit">{{ row.unit }}</td>
                <td>
                  <span class="status-tag" :class="row.onSite ? 'closed' : 'pending'">
                    {{ row.onSite ? '在岗' : '离岗' }}
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

    <PersonnelRiskVerifyPanel :project-id="projectId" />

    <DispatchDraggablePanel
      v-if="dangerMoreOpen"
      title="危险作业清单"
      :width="880"
      placement="right"
      @close="dangerMoreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ dangerListFull.length }} 条</span>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>子类</th>
              <th>日期</th>
              <th>时间</th>
              <th>地点</th>
              <th>许可</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dangerListFull"
              :key="`more-${row.id}`"
              class="clickable-row"
              @click="openDangerDetail(row)"
            >
              <td>{{ row.type }}</td>
              <td>{{ row.subType }}</td>
              <td>{{ row.date }}</td>
              <td>{{ row.time }}</td>
              <td class="desc col-desc" :title="row.location">{{ row.location }}</td>
              <td>{{ row.permitStatus }}</td>
              <td><span class="status-tag" :class="workStatusMap[row.status]">{{ row.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>

    <DispatchDraggablePanel
      v-if="detailView"
      :title="detailTitle"
      :width="560"
      :z-index="120010"
      placement="right"
      @close="closeDetail"
    >
      <DispatchRecordDetailBody :kind="detailView.kind" :record="detailView.data" />
    </DispatchDraggablePanel>
  </section>
</template>

<style scoped>
@import './dispatch-lower.css';

.danger-title-row,
.mgmt-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.danger-title-text,
.mgmt-title-text {
  flex-shrink: 0;
  text-align: left;
}

.danger-title-row .title-more-btn,
.mgmt-title-row .mgmt-count {
  margin-left: auto;
}

.mgmt-count {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  font-weight: 500;
}

.title-more-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 4px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
}

.title-more-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}

.danger-panel .panel-title { border-left: 4px solid #f56c6c; }
.mgmt-panel .panel-title { border-left: 4px solid #67c23a; }

.dispatch-hq-list-panel .panel-title {
  border-left: none;
}

.status-tag.cancelled { background: rgba(144, 147, 153, 0.12); color: #909399; }

.project-dispatch-lower :deep(.table-scroll .desc) {
  max-width: none;
}

.project-dispatch-lower :deep(.risk-panel) {
  min-height: 0;
}
</style>
