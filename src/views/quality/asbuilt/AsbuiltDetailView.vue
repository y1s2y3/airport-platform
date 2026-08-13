<script setup>
import '../mat/mat-page.css'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAsbuilt,
  listAsbuiltApprovals,
  STATUS_LABEL,
  DATA_SOURCE_LABEL,
  APPROVAL_NODE_LABEL,
  ACTION_LABEL,
  statusTagType,
} from '../../../mock/asbuilt.js'

const route = useRoute()
const router = useRouter()

const detail = computed(() => {
  const id = String(route.query.id || '')
  return id ? getAsbuilt(id) : null
})

const approvals = computed(() => {
  if (!detail.value) return []
  return listAsbuiltApprovals(detail.value.id)
})

const currentNodeLabel = computed(() => {
  const row = detail.value
  if (!row || row.status !== 'pending_approval') return '—'
  if (row.current_node === 'supervisor') return '待监理审批'
  if (row.current_node === 'hq_pm') return '待指挥部项目经理终审'
  return '—'
})
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工质量管控 / 实模一致验收 / 详情</div>
      <div class="title-row">
        <h1 class="page-title">实模一致验收详情</h1>
        <div style="display: flex; gap: 8px">
          <el-button
            v-if="detail?.status === 'draft'"
            type="primary"
            @click="router.push(`/qm/asbuilt/edit?id=${detail.id}`)"
          >
            编辑
          </el-button>
          <el-button
            v-if="detail?.status === 'rejected'"
            type="warning"
            @click="router.push(`/qm/asbuilt/edit?relatedRejectId=${detail.id}`)"
          >
            重新申报
          </el-button>
          <el-button @click="router.push('/qm/asbuilt/list')">返回列表</el-button>
        </div>
      </div>
      <p class="page-tip">审批请在个人中心待办办理；提交后资料只读。</p>
    </div>

    <el-empty v-if="!detail" description="未找到验收单" />

    <template v-else>
      <el-descriptions :column="2" border size="small" class="mb">
        <el-descriptions-item label="验收单号">{{ detail.biz_no }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.status)">
            {{ STATUS_LABEL[detail.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务名称" :span="2">{{ detail.title }}</el-descriptions-item>
        <el-descriptions-item label="数据来源">
          {{ DATA_SOURCE_LABEL[detail.data_source] || detail.data_source }}
        </el-descriptions-item>
        <el-descriptions-item label="当前审批环节">{{ currentNodeLabel }}</el-descriptions-item>
        <el-descriptions-item label="对比可访问地址" :span="2">
          <a
            v-if="detail.compare_url"
            :href="detail.compare_url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ detail.compare_url }}
          </a>
          <span v-else>—</span>
        </el-descriptions-item>
        <el-descriptions-item label="提交人">{{ detail.submitter_name || '—' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.submitted_at || '—' }}</el-descriptions-item>
        <el-descriptions-item label="外部同步单号">{{ detail.external_ref || '—' }}</el-descriptions-item>
        <el-descriptions-item label="关联被驳回单">{{ detail.related_reject_id || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ detail.updated_at }}</el-descriptions-item>
      </el-descriptions>

      <el-card shadow="never" class="mb">
        <template #header>所选实体工程节点</template>
        <el-table :data="detail.nodes || []" stripe border empty-text="未选择节点">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="wbs_node_path" label="节点路径" min-width="280" />
          <el-table-column prop="wbs_node_id" label="节点 ID" width="140" />
        </el-table>
      </el-card>

      <el-card shadow="never" class="mb">
        <template #header>实模一致性报告</template>
        <el-table :data="detail.files || []" stripe border empty-text="无报告附件">
          <el-table-column prop="file_name" label="文件名" min-width="220" />
          <el-table-column label="大小" width="100">
            <template #default="{ row }">
              {{ Math.max(1, Math.round((row.file_size || 0) / 1024)) }} KB
            </template>
          </el-table-column>
          <el-table-column label="来源" width="100">
            <template #default="{ row }">
              {{ row.source === 'sync' ? '第三方同步' : '人工上传' }}
            </template>
          </el-table-column>
          <el-table-column prop="uploaded_at" label="入库时间" width="160" />
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>审批记录</template>
        <el-table :data="approvals" stripe border empty-text="暂无审批记录">
          <el-table-column prop="acted_at" label="时间" width="170" />
          <el-table-column label="节点" width="160">
            <template #default="{ row }">
              {{ APPROVAL_NODE_LABEL[row.node_code] || row.node_code }}
            </template>
          </el-table-column>
          <el-table-column label="动作" width="90">
            <template #default="{ row }">{{ ACTION_LABEL[row.action] || row.action }}</template>
          </el-table-column>
          <el-table-column prop="actor_name" label="处理人" width="120" />
          <el-table-column prop="comment" label="意见" min-width="200" />
        </el-table>
      </el-card>
    </template>
  </div>
</template>
