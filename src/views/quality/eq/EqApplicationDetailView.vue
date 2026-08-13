<script setup>
import '../mat/mat-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getEntryDetail, STATUS_LABEL, statusTagType } from '../../../mock/eq.js'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getEntryDetail(id) : null
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">设备进场管理 / 进场详情</div>
      <div class="title-row">
        <h1 class="page-title">设备进场详情</h1>
        <el-button @click="router.back()">返回</el-button>
      </div>
    </div>

    <el-empty v-if="!detail" description="未找到进场单" />

    <template v-else>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="进场单号">{{ detail.entry_id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ STATUS_LABEL[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detail.related_reject_id" label="关联驳回原单">
          <el-button
            link
            type="primary"
            @click="router.push(`/qm/eq/applications/detail?id=${detail.related_reject_id}`)"
          >
            {{ detail.related_reject_id }}
          </el-button>
        </el-descriptions-item>
        <el-descriptions-item label="项目">{{ detail.project_label }}</el-descriptions-item>
        <el-descriptions-item label="定样单号">{{ detail.sample_id || '—' }}</el-descriptions-item>
        <el-descriptions-item label="设备名称">{{ detail.equipment_name }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ detail.model || '—' }}</el-descriptions-item>
        <el-descriptions-item label="施工部位">{{ detail.use_part || '—' }}</el-descriptions-item>
        <el-descriptions-item label="出厂编号">{{ detail.serial_no || '—' }}</el-descriptions-item>
        <el-descriptions-item label="品牌">{{ detail.brand_name }}</el-descriptions-item>
        <el-descriptions-item label="品牌一致">
          <el-tag size="small" :type="detail.brand_match ? 'success' : 'danger'">
            {{ detail.brand_match ? '一致' : '不一致' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="生产厂家" :span="2">
          {{ detail.manufacturer || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="数量">{{ detail.quantity }}{{ detail.unit }}</el-descriptions-item>
        <el-descriptions-item label="供应商">{{ detail.supplier }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ detail.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submit_time }}</el-descriptions-item>
        <el-descriptions-item label="办结时间" :span="2">
          {{ detail.finish_time || '—' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="mb">
        <template #header>开箱清单</template>
        <el-table :data="detail.unpack_items || []" stripe border empty-text="无开箱项">
          <el-table-column prop="label" label="检查项" min-width="140" />
          <el-table-column label="齐全" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.ok ? 'success' : 'warning'">
                {{ row.ok ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160">
            <template #default="{ row }">{{ row.remark || '—' }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never" class="mb">
        <template #header>附件</template>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="合格证">{{ detail.cert_file }}</el-descriptions-item>
          <el-descriptions-item label="质检报告">{{ detail.inspect_file }}</el-descriptions-item>
          <el-descriptions-item label="现场照片">{{ detail.photo_file }}</el-descriptions-item>
          <el-descriptions-item label="送检结果">
            {{
              detail.inspect_result_checked
                ? detail.inspect_result_file || '已勾选未上传'
                : '未勾选'
            }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never">
        <template #header>审批记录</template>
        <el-table :data="detail.approvals" stripe border empty-text="暂无审批记录">
          <el-table-column prop="time" label="时间" width="170" />
          <el-table-column prop="operator" label="处理人" width="120" />
          <el-table-column label="动作" width="100">
            <template #default="{ row }">
              {{ row.action === 'agree' ? '同意' : '退回' }}
            </template>
          </el-table-column>
          <el-table-column prop="opinion" label="意见" min-width="200" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>
