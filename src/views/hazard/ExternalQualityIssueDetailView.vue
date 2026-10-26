<script setup>
import HazardSamplingPanel from '../../components/HazardSamplingPanel.vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { externalQualityIssues } from '../../mock/externalQualityIssues.js'

const route = useRoute()
const router = useRouter()
const issue = computed(() => externalQualityIssues.find((item) => item.id === route.params.id))

function goBack() {
  router.push('/hazard-issues/summary')
}
</script>

<template>
  <div class="quality-issue-detail">
    <div class="detail-heading">
      <el-button @click="goBack">返回汇总</el-button>
      <div class="detail-title">
        <h2>施工质量问题管理</h2>
        <p>问题记录详情 <el-tag size="small" type="info">原型示例</el-tag></p>
      </div>
    </div>

    <el-empty v-if="!issue" description="未找到该问题记录">
      <el-button type="primary" @click="goBack">返回汇总</el-button>
    </el-empty>
    <template v-else>
      <section class="detail-card">
        <div class="section-title">基础信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="问题编号">{{ issue.id }}</el-descriptions-item>
          <el-descriptions-item label="问题状态"><el-tag :type="issue.status === '已完成' ? 'success' : 'warning'">{{ issue.status }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="问题名称" :span="2">{{ issue.title }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ issue.projectName }}</el-descriptions-item>
          <el-descriptions-item label="标段">{{ issue.sectionName }}</el-descriptions-item>
          <el-descriptions-item label="问题类型">{{ issue.issueType }}</el-descriptions-item>
          <el-descriptions-item label="问题来源">{{ issue.source }}</el-descriptions-item>
          <el-descriptions-item label="发现人">{{ issue.finder }}</el-descriptions-item>
          <el-descriptions-item label="发起人">{{ issue.initiator }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ issue.rectifier }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ issue.reviewer }}</el-descriptions-item>
          <el-descriptions-item label="填写日期">{{ issue.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="要求完成日期">{{ issue.dueAt }}</el-descriptions-item>
        </el-descriptions>
      </section>

      <section class="detail-card">
        <div class="section-title">问题描述与要求</div>
        <el-table :data="issue.items" border>
          <el-table-column type="index" label="序号" width="70" align="center" />
          <el-table-column prop="description" label="问题描述" min-width="260" />
          <el-table-column prop="advice" label="要求建议" min-width="260" />
          <el-table-column label="附件" min-width="180">
            <template #default="{ row }">
              <template v-if="row.attachments?.length"><span v-for="file in row.attachments" :key="file" class="file-chip">{{ file }}</span></template>
              <span v-else>--</span>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="detail-card">
        <div class="section-title">审批记录</div>
        <el-timeline>
          <el-timeline-item v-for="(log, index) in issue.approvalLogs" :key="index" :timestamp="log.time" placement="top">
            <strong>{{ log.stage }} · {{ log.person }}</strong>
            <p>{{ log.opinion }}</p>
          </el-timeline-item>
        </el-timeline>
      </section>

      <HazardSamplingPanel source="externalQuality" :record-id="String(route.params.id)" />
    </template>
  </div>
</template>

<style scoped>
.quality-issue-detail { padding: 4px 0 24px; color: #303133; }
.detail-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
.detail-title { display: flex; flex-direction: column; gap: 6px; }
.detail-heading h2 { margin: 0; font-size: 20px; }
.detail-heading p { display: flex; align-items: center; gap: 8px; margin: 0; color: #7b8390; font-size: 13px; }
.detail-card { margin-bottom: 16px; padding: 18px; border: 1px solid #e5e9ef; border-radius: 8px; background: #fff; }
.section-title { margin-bottom: 14px; padding-left: 9px; border-left: 3px solid #8f0045; font-size: 16px; font-weight: 600; }
.file-chip { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #f4f5f7; color: #57616e; }
.detail-card :deep(.el-timeline) { margin: 20px 0 0; }
.detail-card :deep(.el-timeline-item p) { margin: 6px 0 0; color: #6d7580; font-size: 13px; }
@media (max-width: 700px) { .detail-heading { flex-direction: column; } .detail-card { padding: 12px; } }
</style>
