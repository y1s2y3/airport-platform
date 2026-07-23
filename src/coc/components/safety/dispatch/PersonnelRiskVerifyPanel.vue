<script setup>
import { ref, computed, inject } from 'vue'
import { getProjectPersonnelRiskItems } from '../../../mock/data.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'

const dispatchHqUi = inject('dispatchHqUi', false)

const props = defineProps({
  projectId: { type: String, required: true },
})

const moreOpen = ref(false)

const riskList = computed(() => getProjectPersonnelRiskItems(props.projectId))
const previewList = computed(() => riskList.value.slice(0, 12))

function levelClass(level) {
  if (level === '高') return 'major'
  if (level === '中') return 'medium'
  return 'normal'
}

function riskTypeClass(type) {
  if (type === '安全教育') return 'train'
  if (type === '特种作业') return 'special'
  if (type === '实名制') return 'realname'
  return 'duty'
}
</script>

<template>
  <div class="panel-card detail-panel list-panel risk-panel" :class="{ 'dispatch-hq-list-panel': dispatchHqUi }">
    <DispatchHqPanelTitle v-if="dispatchHqUi" title="人员风险核验" show-v2-tag>
      <template #actions>
        <button type="button" class="title-more-btn" @click="moreOpen = true">更多</button>
      </template>
    </DispatchHqPanelTitle>
    <div v-else class="panel-title compact risk-title-row title-left">
      <span class="risk-title-text">人员风险核验</span>
      <span class="panel-v2-tip">V2版本上线</span>
      <button type="button" class="title-more-btn" @click="moreOpen = true">
        更多
      </button>
    </div>
    <div class="panel-body list-table-body list-wrap">
      <div class="table-scroll">
        <table class="mini-table">
          <thead>
            <tr>
              <th>人员</th>
              <th>风险类型</th>
              <th>风险说明</th>
              <th>等级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in previewList" :key="row.id">
              <td>
                <div class="person-name">{{ row.personName }}</div>
                <div class="person-meta">{{ row.workType }}</div>
              </td>
              <td>
                <span class="risk-type-tag" :class="riskTypeClass(row.riskType)">{{ row.riskType }}</span>
              </td>
              <td class="desc" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
            </tr>
            <tr v-if="!previewList.length">
              <td colspan="4" class="empty-row">暂无人员风险项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <DispatchDraggablePanel
      v-if="moreOpen"
      title="人员风险核验"
      :width="880"
      placement="right"
      @close="moreOpen = false"
    >
      <div class="more-dialog-toolbar">
        <span class="more-count">共 {{ riskList.length }} 条风险项</span>
      </div>
      <div class="more-table-wrap">
        <table class="mini-table more-table">
          <thead>
            <tr>
              <th>人员</th>
              <th>工种</th>
              <th>风险类型</th>
              <th>数据来源</th>
              <th>日期</th>
              <th>风险说明</th>
              <th>等级</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in riskList" :key="`more-${row.id}`">
              <td>{{ row.personName }}</td>
              <td>{{ row.workType }}</td>
              <td>
                <span class="risk-type-tag" :class="riskTypeClass(row.riskType)">{{ row.riskType }}</span>
              </td>
              <td>{{ row.source }}</td>
              <td>{{ row.date.slice(5) }}</td>
              <td class="desc col-desc" :title="row.desc">{{ row.desc }}</td>
              <td>
                <span class="level-tag" :class="levelClass(row.level)">{{ row.level }}</span>
              </td>
            </tr>
            <tr v-if="!riskList.length">
              <td colspan="7" class="empty-row">暂无人员风险项</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DispatchDraggablePanel>
  </div>
</template>

<style scoped>
@import './dispatch-lower.css';

.risk-panel .panel-title {
  border-left: 4px solid #e6a23c;
}

.risk-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.risk-title-text {
  flex-shrink: 0;
  text-align: left;
}

.risk-title-row .title-more-btn {
  margin-left: auto;
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

.person-name {
  font-weight: 600;
  color: var(--coc-text);
}

.person-meta {
  margin-top: 2px;
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.risk-type-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.risk-type-tag.special {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.risk-type-tag.train {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.risk-type-tag.realname {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.risk-type-tag.duty {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}

.level-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.level-tag.normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.level-tag.medium {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.level-tag.major {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}
</style>
