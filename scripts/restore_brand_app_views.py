# -*- coding: utf-8 -*-
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "views" / "quality" / "brand"


def w(name: str, content: str) -> None:
    (BASE / name).write_text(content.replace("\r\n", "\n"), encoding="utf-8", newline="\n")
    assert "品牌报审" in (BASE / name).read_text(encoding="utf-8")
    print("OK", name)


w(
    "BrandApplicationListView.vue",
    """\
<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listApplications,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
  withdrawApplication,
  resubmitApplication,
  getApplicationDetail,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApplications(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  }).map((a) => {
    const detail = getApplicationDetail(a.application_id)
    return {
      ...a,
      candidate_count: detail?.candidates?.length || 0,
      brand_preview: (detail?.candidates || [])
        .slice(0, 3)
        .map((c) => c.brand_name)
        .join(' / '),
    }
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

async function onWithdraw(row) {
  try {
    await ElMessageBox.confirm(`确认撤回报审单 ${row.application_id}？仅待监理审时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawApplication(row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

async function onResubmit(row) {
  try {
    await ElMessageBox.confirm(`确认重提报审单 ${row.application_id}？将清空全部入选标记。`, '重提', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = resubmitApplication(row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已重提，进入待监理审')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请</div>
      <h1 class="page-title">报审申请</h1>
      <p class="page-tip">
        施工直接提交 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="报审申请为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="报审编号 / 材料 / 品牌"
          style="width: 240px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/qm/brand/applications/edit')">
          新增品牌报审
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无报审单">
        <el-table-column prop="application_id" label="报审编号" width="130" />
        <el-table-column prop="material_name" label="材料/设备" min-width="130" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
        </el-table-column>
        <el-table-column prop="brand_preview" label="备选品牌" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/brand/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'in_approval' && row.current_node === 'supervisor'"
              link
              type="warning"
              @click="onWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="row.status === 'rejected' || row.status === 'withdrawn'"
              link
              type="primary"
              @click="onResubmit(row)"
            >
              重提
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
""",
)

w(
    "BrandApproveListView.vue",
    """\
<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  getApplicationDetail,
  listApplications,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const tab = ref('processing')
const keyword = ref('')

const processing = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApplications(scopeProjectId.value, { status: 'in_approval' }).map(enrich)
})

const completed = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  const rows = listApplications(scopeProjectId.value, { keyword: keyword.value }).filter((a) =>
    ['approved', 'rejected', 'withdrawn'].includes(a.status),
  )
  return rows.map(enrich)
})

function enrich(a) {
  const detail = getApplicationDetail(a.application_id)
  return {
    ...a,
    brand_preview: (detail?.candidates || []).map((c) => c.brand_name).join(' / '),
  }
}

function reset() {
  keyword.value = ''
}

function openApprove(row) {
  router.push(`/qm/brand/approve/detail?id=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审审批</div>
      <h1 class="page-title">报审审批</h1>
      <p class="page-tip">
        监理 → 项目经理终审 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="报审审批为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <el-tabs v-model="tab">
        <el-tab-pane :label="`审批中（${processing.length}）`" name="processing" />
        <el-tab-pane label="已完成" name="completed" />
      </el-tabs>

      <template v-if="tab === 'processing'">
        <el-table :data="processing" stripe border empty-text="暂无待审单据">
          <el-table-column prop="application_id" label="报审编号" width="130" />
          <el-table-column prop="material_name" label="材料/设备" min-width="130" />
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
          </el-table-column>
          <el-table-column prop="brand_preview" label="备选品牌" min-width="180" show-overflow-tooltip />
          <el-table-column prop="applicant_name" label="申请人" width="90" />
          <el-table-column prop="submit_time" label="提交时间" width="170" />
          <el-table-column label="当前节点" width="120">
            <template #default="{ row }">
              <el-tag size="small" type="warning">{{ NODE_LABEL[row.current_node] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openApprove(row)">审批</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <div class="filter-bar">
          <el-input
            v-model="keyword"
            clearable
            placeholder="搜索已完成记录"
            style="width: 240px"
            :prefix-icon="Search"
          />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="reset">重置</el-button>
        </div>
        <el-table :data="completed" stripe border empty-text="暂无已完成记录">
          <el-table-column prop="application_id" label="报审编号" width="130" />
          <el-table-column prop="material_name" label="材料/设备" min-width="130" />
          <el-table-column prop="brand_preview" label="备选品牌" min-width="160" show-overflow-tooltip />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="finish_time" label="办结时间" width="170" />
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="router.push(`/qm/brand/applications/detail?id=${row.application_id}`)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
""",
)

w(
    "BrandApplicationDetailView.vue",
    """\
<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ATTACH_TYPE,
  getApplicationDetail,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
} from '../../../mock/brand.js'

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
        <el-descriptions-item label="备注" :span="2">{{ detail.app.remark || '—' }}</el-descriptions-item>
      </el-descriptions>

      <h3 class="sec">本单规格</h3>
      <el-table :data="detail.specs" border stripe size="small">
        <el-table-column prop="seq_no" label="序号" width="70" />
        <el-table-column prop="spec_model" label="规格型号" />
        <el-table-column prop="material_spec_id" label="企业规格ID" />
      </el-table>

      <h3 class="sec">备选品牌</h3>
      <el-table :data="detail.candidates" border stripe size="small">
        <el-table-column prop="seq_no" label="序号" width="70" />
        <el-table-column prop="brand_name" label="品牌名称" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="180" />
        <el-table-column label="来源" width="100">
          <template #default="{ row }">{{ row.brand_lib_id ? '库选入' : '手填' }}</template>
        </el-table-column>
        <el-table-column label="是否入选" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.is_selected" type="success" size="small">入选</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>

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

      <h3 v-if="detail.attachments.length" class="sec">附件</h3>
      <el-table v-if="detail.attachments.length" :data="detail.attachments" border size="small">
        <el-table-column prop="candidate_id" label="备选ID" width="120" />
        <el-table-column label="类型">
          <template #default="{ row }">{{ ATTACH_TYPE[row.attach_type] || row.attach_type }}</template>
        </el-table-column>
        <el-table-column prop="file_name" label="文件名" />
      </el-table>

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
</style>
""",
)

print("done part1")
