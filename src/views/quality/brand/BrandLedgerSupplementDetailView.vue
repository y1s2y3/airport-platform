<script setup>
/**
 * 品牌报审台账 · 补录详情（只读）
 * 补录数据直接写入台账、不走审批，故此处仅展示补录填报内容，无审批流程区块
 */
import './brand-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, Box } from '@element-plus/icons-vue'
import { getSupplementDetail, MATERIAL_TYPE, LEDGER_SOURCE } from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'

const route = useRoute()
const router = useRouter()
const detail = computed(() => getSupplementDetail(String(route.query.id || '')))

function goBack() {
  router.push('/qm/brand/ledger')
}
</script>

<template>
  <div class="qm-page page-card brand-detail">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 品牌报审台账 / 补录详情</div>
      <div class="title-row">
        <h1 class="page-title">补录详情 {{ detail?.supplement?.supplement_id || '' }}</h1>
        <el-button @click="goBack">返回</el-button>
      </div>
      <p class="page-tip">补录数据直接写入品牌报审台账，未走审批流程。</p>
    </div>

    <el-empty v-if="!detail" description="未找到补录单" />
    <template v-else>
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Box /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">材料/设备信息</h2>
          </div>
        </header>
        <div class="section-body">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="补录单号">
              {{ detail.supplement.supplement_id }}
            </el-descriptions-item>
            <el-descriptions-item label="数据来源">
              <el-tag size="small" type="warning" effect="plain">
                {{ LEDGER_SOURCE[detail.supplement.source_type] || '补录' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="材料/设备名称">
              {{ detail.supplement.material_name || '--' }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ MATERIAL_TYPE[detail.supplement.material_type] || detail.supplement.material_type || '--' }}
            </el-descriptions-item>
            <el-descriptions-item label="施工部位">
              {{ detail.supplement.use_part || '--' }}
            </el-descriptions-item>
            <el-descriptions-item label="补录人">
              {{ detail.supplement.filled_by_name || '--' }}
            </el-descriptions-item>
            <el-descriptions-item label="补录时间" :span="2">
              {{ detail.supplement.filled_at || '--' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.supplement.remark" label="备注" :span="2">
              {{ detail.supplement.remark }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <h2 class="section-title">报审品牌</h2>
          </div>
        </header>
        <div class="section-body cand-list">
          <div
            v-for="(row, idx) in detail.candidates"
            :key="row.candidate_id || idx"
            class="cand-card"
          >
            <div class="cand-card-head">
              <div class="cand-card-title">
                <span class="cand-badge">{{ idx + 1 }}</span>
                <el-tag v-if="row.is_primary || idx === 0" size="small" type="success" effect="plain">
                  主选品牌
                </el-tag>
                <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
              </div>
            </div>
            <el-descriptions :column="2" border class="cand-desc">
              <el-descriptions-item label="品牌名称">{{ row.brand_name || '--' }}</el-descriptions-item>
              <el-descriptions-item label="生产厂家">{{ row.manufacturer || '--' }}</el-descriptions-item>
            </el-descriptions>
            <BrandCandidateAttachBlock :candidate="row" :editable="false" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.brand-detail {
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.title-row .page-title {
  margin: 0;
}

.form-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.section-head-main {
  flex: 1;
  min-width: 0;
}

.section-icon {
  margin-top: 2px;
  font-size: 18px;
  color: var(--el-color-primary);
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.section-body {
  padding: 16px 18px 18px;
}

.cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cand-card {
  padding: 14px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}

.cand-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.cand-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
}

.cand-desc {
  margin-bottom: 12px;
}
</style>
