<script setup>
import './brand-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getApplicationDetail,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'

const route = useRoute()
const router = useRouter()
const detail = computed(() => getApplicationDetail(String(route.query.id || '')))

const actionLabel = { agree: '同意', reject: '退回', withdraw: '撤回' }
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审详情</div>
      <h1 class="page-title">报审详情</h1>
    </div>

    <el-empty v-if="!detail" description="未找到报审单" />
    <template v-else>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="报审编号">{{ detail.app.application_id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.app.status)">
            {{ STATUS_LABEL[detail.app.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="材料/设备">{{ detail.app.material_name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ MATERIAL_TYPE[detail.app.material_type] }}</el-descriptions-item>
        <el-descriptions-item label="企业材料ID">{{ detail.app.material_id || '—' }}</el-descriptions-item>
        <el-descriptions-item label="使用部位">{{ detail.app.use_part || '—' }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ NODE_LABEL[detail.app.current_node] }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.app.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.app.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="办结时间">{{ detail.app.finish_time || '—' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="sec">本单规格</h3>
      <el-table :data="detail.specs" border stripe size="small">
        <el-table-column prop="seq_no" label="序号" width="70" />
        <el-table-column prop="spec_model" label="规格型号" />
        <el-table-column prop="material_spec_id" label="企业规格ID" />
      </el-table>

      <h3 class="sec">备选品牌</h3>
      <div
        v-for="(row, idx) in detail.candidates"
        :key="row.candidate_id"
        class="cand-card"
      >
        <div class="cand-card-head">
          <span class="cand-idx">备选 {{ idx + 1 }}</span>
          <el-tag v-if="row.brand_lib_id" size="small" type="success">库选入</el-tag>
          <el-tag v-else size="small" type="info">手填</el-tag>
          <el-tag v-if="row.is_selected" size="small" type="success">入选</el-tag>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="品牌名称">{{ row.brand_name }}</el-descriptions-item>
          <el-descriptions-item label="生产厂家">{{ row.manufacturer }}</el-descriptions-item>
        </el-descriptions>
        <BrandCandidateAttachBlock :candidate="row" :editable="false" />
      </div>

      <h3 class="sec">审批记录</h3>
      <el-timeline v-if="detail.approvals.length">
        <el-timeline-item
          v-for="r in detail.approvals"
          :key="r.record_id"
          :timestamp="r.operate_time"
          placement="top"
        >
          {{ r.operator_name }} · {{ actionLabel[r.action] || r.action }}
          <span v-if="r.opinion">：{{ r.opinion }}</span>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无审批记录" :image-size="60" />

      <div class="actions">
        <el-button @click="router.back()">返回</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sec {
  margin: 20px 0 10px;
  font-size: 15px;
}
.actions {
  margin-top: 20px;
}
.cand-card {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
.cand-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.cand-idx {
  font-size: 13px;
  font-weight: 600;
}
</style>
