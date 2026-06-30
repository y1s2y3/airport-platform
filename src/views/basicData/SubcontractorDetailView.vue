<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getSubcontractorDetail, entryStatusTagClass, creditLevelTagClass } from '../../mock/subcontractorManagement'

const route = useRoute()
const router = useRouter()
const activeTab = ref('basic')
const detail = ref(null)

onMounted(() => {
  detail.value = getSubcontractorDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到分包单位信息')
    router.replace({ name: 'SubcontractorList' })
  }
})

const exitProgress = computed(() => {
  if (!detail.value?.exitChecklist?.length) return 0
  const checked = detail.value.exitChecklist.filter((item) => item.checked).length
  return Math.round((checked / detail.value.exitChecklist.length) * 100)
})

function goBack() {
  router.push({ name: 'SubcontractorList' })
}

function handleGenerateReport() {
  ElMessage.success('最终履约评估报告已生成，将作为集团客商考评依据')
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目管理 / 分包单位管理 / 详情</div>
      <div class="page-heading">
        <div class="title-block">
          <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
          <div>
            <h1 class="page-title">{{ detail.name }}</h1>
            <div class="sub-meta">
              <span>{{ detail.projectName }}</span>
              <span class="ap-status-tag" :class="entryStatusTagClass(detail.entryStatus)">{{ detail.entryStatus }}</span>
              <span>信用 {{ detail.creditScore }} 分</span>
              <span class="ap-status-tag" :class="creditLevelTagClass(detail.creditLevel)">{{ detail.creditLevel }}级</span>
              <span class="sync-tip">数据来源：{{ detail.syncSource }} · {{ detail.syncTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane label="基础信息" name="basic">
        <section class="info-section">
          <div class="section-title">供应商库基础信息</div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="供应商编码">{{ detail.basicInfo.supplierCode }}</el-descriptions-item>
            <el-descriptions-item label="统一社会信用代码">{{ detail.basicInfo.unifiedCreditCode }}</el-descriptions-item>
            <el-descriptions-item label="法定代表人">{{ detail.basicInfo.legalPerson }}</el-descriptions-item>
            <el-descriptions-item label="注册资本">{{ detail.basicInfo.registeredCapital }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.basicInfo.contact }}</el-descriptions-item>
            <el-descriptions-item label="联系方式">{{ detail.basicInfo.phone }}</el-descriptions-item>
            <el-descriptions-item label="注册地址" :span="2">{{ detail.basicInfo.address }}</el-descriptions-item>
            <el-descriptions-item label="合同编号">{{ detail.basicInfo.contractNo }}</el-descriptions-item>
            <el-descriptions-item label="合同金额">{{ detail.basicInfo.contractAmount }}</el-descriptions-item>
            <el-descriptions-item label="进场日期">{{ detail.basicInfo.entryDate }}</el-descriptions-item>
            <el-descriptions-item label="计划退场日期">{{ detail.basicInfo.plannedExitDate }}</el-descriptions-item>
            <el-descriptions-item label="合同范围" :span="2">{{ detail.basicInfo.contractScope }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section class="info-section">
          <div class="section-title">管理架构</div>
          <el-table :data="detail.managementStructure" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="role" label="岗位" width="120" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="phone" label="联系方式" width="130" />
            <el-table-column prop="cert" label="执业资格" min-width="140" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">关键人员资质</div>
          <el-table :data="detail.keyPersonnel" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="position" label="岗位" width="120" />
            <el-table-column prop="certType" label="证书类型" min-width="140" />
            <el-table-column prop="certNo" label="证书编号" min-width="160" />
            <el-table-column prop="expiry" label="有效期至" width="120" />
            <el-table-column prop="status" label="状态" width="80" align="center" />
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="进场履约台账" name="ledger">
        <section class="info-section">
          <div class="section-title">进场教育记录</div>
          <el-table :data="detail.entryEducation" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="date" label="教育日期" width="120" />
            <el-table-column prop="topic" label="教育主题" min-width="160" />
            <el-table-column prop="trainer" label="培训组织" min-width="140" />
            <el-table-column prop="attendees" label="参训人数" width="90" align="center" />
            <el-table-column prop="passRate" label="合格率" width="90" align="center" />
            <el-table-column prop="recorder" label="记录人" width="100" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">安全协议签署记录</div>
          <el-table :data="detail.safetyAgreements" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="name" label="协议名称" min-width="160" />
            <el-table-column prop="signDate" label="签署日期" width="120" />
            <el-table-column prop="partyA" label="甲方" min-width="120" />
            <el-table-column prop="partyB" label="乙方" min-width="140" />
            <el-table-column prop="status" label="状态" width="90" align="center" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">现场履约电子台账</div>
          <el-table :data="detail.performanceLedger" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="date" label="记录日期" width="120" />
            <el-table-column prop="type" label="台账类型" width="130" />
            <el-table-column prop="content" label="记录内容" min-width="220" />
            <el-table-column prop="result" label="结论" width="90" align="center" />
            <el-table-column prop="inspector" label="检查部门" min-width="120" />
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="履约统计" name="stats">
        <div class="stats-grid">
          <div class="mini-stat">
            <span class="mini-label">违规单</span>
            <span class="mini-value danger">{{ detail.violations.length }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">安全整改单</span>
            <span class="mini-value warning">{{ detail.rectifications.length }}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">进度完成率</span>
            <span class="mini-value">{{ detail.progressStats.overallRate }}%</span>
          </div>
          <div class="mini-stat">
            <span class="mini-label">当前信用分</span>
            <span class="mini-value">{{ detail.creditScore }}</span>
          </div>
        </div>

        <section class="info-section">
          <div class="section-title">违规单汇总</div>
          <el-table :data="detail.violations" border stripe class="ap-table" empty-text="暂无违规记录">
            <el-table-column prop="no" label="单据编号" width="130" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="issue" label="违规事项" min-width="180" />
            <el-table-column prop="status" label="状态" width="90" align="center" />
            <el-table-column prop="handler" label="处理人" width="100" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">安全整改单汇总</div>
          <el-table :data="detail.rectifications" border stripe class="ap-table" empty-text="暂无整改记录">
            <el-table-column prop="no" label="单据编号" width="130" />
            <el-table-column prop="date" label="下发日期" width="120" />
            <el-table-column prop="issue" label="整改事项" min-width="180" />
            <el-table-column prop="deadline" label="整改期限" width="120" />
            <el-table-column prop="status" label="状态" width="90" align="center" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">进度完成率（节点维度）</div>
          <el-table :data="detail.progressStats.milestones" border stripe class="ap-table">
            <el-table-column prop="name" label="节点名称" min-width="160" />
            <el-table-column prop="plan" label="计划完成" width="120" />
            <el-table-column prop="actual" label="实际完成" width="120" />
            <el-table-column label="完成率" width="100" align="center">
              <template #default="{ row }">{{ row.rate }}%</template>
            </el-table-column>
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">信用评分（月度/节点）</div>
          <el-table :data="detail.creditScores" border stripe class="ap-table">
            <el-table-column prop="period" label="评分周期" width="120" />
            <el-table-column prop="score" label="综合得分" width="90" align="center" />
            <el-table-column prop="level" label="等级" width="70" align="center" />
            <el-table-column prop="quality" label="质量" width="70" align="center" />
            <el-table-column prop="safety" label="安全" width="70" align="center" />
            <el-table-column prop="progress" label="进度" width="70" align="center" />
            <el-table-column prop="cooperation" label="配合度" width="80" align="center" />
          </el-table>
        </section>
      </el-tab-pane>

      <el-tab-pane label="退场管理" name="exit">
        <section class="info-section">
          <div class="section-head">
            <div>
              <div class="section-title">退场条件核对清单</div>
              <div class="section-tip">核对进度 {{ exitProgress }}%</div>
            </div>
          </div>
          <el-table :data="detail.exitChecklist" border stripe class="ap-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="item" label="核对事项" min-width="200" />
            <el-table-column prop="dept" label="责任部门" width="120" />
            <el-table-column label="是否必核" width="90" align="center">
              <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
            </el-table-column>
            <el-table-column label="核对状态" width="90" align="center">
              <template #default="{ row }">
                <span class="ap-status-tag" :class="row.checked ? 'ap-tag-enabled' : 'ap-tag-draft'">
                  {{ row.checked ? '已核对' : '待核对' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="reviewer" label="核对人" width="100" />
            <el-table-column prop="date" label="核对日期" width="120" />
          </el-table>
        </section>

        <section class="info-section">
          <div class="section-title">多部门联审确认</div>
          <el-table :data="detail.exitReviews" border stripe class="ap-table" empty-text="暂无联审记录">
            <el-table-column prop="dept" label="审核部门" width="130" />
            <el-table-column prop="reviewer" label="审核人" width="100" />
            <el-table-column prop="opinion" label="审核意见" min-width="160" />
            <el-table-column prop="status" label="状态" width="90" align="center" />
            <el-table-column prop="date" label="审核日期" width="120" />
          </el-table>
        </section>

        <section v-if="detail.finalReport" class="info-section report-section">
          <div class="section-head">
            <div class="section-title">最终履约评估报告</div>
            <el-tag type="success">已生成</el-tag>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="报告编号">{{ detail.finalReport.reportNo }}</el-descriptions-item>
            <el-descriptions-item label="生成日期">{{ detail.finalReport.generateDate }}</el-descriptions-item>
            <el-descriptions-item label="综合得分">{{ detail.finalReport.overallScore }}</el-descriptions-item>
            <el-descriptions-item label="信用等级">{{ detail.finalReport.level }}</el-descriptions-item>
            <el-descriptions-item label="人员权限解除">
              {{ detail.finalReport.permissionRevoked ? '已解除' : '未解除' }}
            </el-descriptions-item>
            <el-descriptions-item label="解除时间">{{ detail.finalReport.revokeDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="解除人数">{{ detail.finalReport.revokeCount || 0 }} 人</el-descriptions-item>
            <el-descriptions-item label="集团客商考评">纳入考评依据</el-descriptions-item>
            <el-descriptions-item label="评估摘要" :span="2">{{ detail.finalReport.summary }}</el-descriptions-item>
          </el-descriptions>
        </section>

        <section v-else class="info-section">
          <div class="section-head">
            <div class="section-title">最终履约评估报告</div>
            <el-button
              class="ap-btn-primary"
              type="primary"
              :disabled="exitProgress < 100"
              @click="handleGenerateReport"
            >
              生成履约评估报告
            </el-button>
          </div>
          <div class="empty-report">
            {{ exitProgress >= 100 ? '退场条件已全部核对，可生成最终履约评估报告' : '请先完成全部退场条件核对及多部门联审' }}
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.title-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 6px;
}

.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.sync-tip {
  color: var(--ap-text-muted);
  font-size: 12px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.info-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}

.section-head .section-title {
  margin-bottom: 0;
}

.section-tip {
  font-size: 12px;
  color: var(--ap-text-muted);
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.mini-stat {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-label {
  font-size: 13px;
  color: var(--ap-text-muted);
}

.mini-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--ap-primary);
}

.mini-value.danger {
  color: var(--ap-danger);
}

.mini-value.warning {
  color: var(--ap-warning);
}

.empty-report {
  padding: 24px;
  text-align: center;
  color: var(--ap-text-muted);
  font-size: 14px;
  background: #fafafa;
  border-radius: 6px;
}

.report-section :deep(.el-descriptions) {
  margin-top: 12px;
}
</style>
