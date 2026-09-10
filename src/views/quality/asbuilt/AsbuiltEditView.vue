<script setup>
import '../mat/mat-page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildAsbuiltWbsTree,
  buildCopyPayloadFromRejected,
  submitAsbuilt,
  copyAsbuiltFromRejected,
  ASBUILT_REPORT_ACCEPT,
  ASBUILT_REPORT_MAX_COUNT,
  ASBUILT_REPORT_MAX_SIZE,
  asbuiltReportFileTypeLabel,
} from '../../../mock/asbuilt.js'
import {
  listBrandProjectUsers,
  resolveDefaultApprovers,
  findBrandProjectUser,
  formatBrandProjectUserLabel,
} from '../../../mock/brand.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const copyFromLabel = ref('')

const form = reactive({
  title: '',
  remark: '',
  /** 已添加节点（有序；同一 wbs_node_id 允许重复） */
  selectedNodeIds: [],
  files: [],
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
  pm_approver_user_id: '',
  pm_approver_name: '',
})

/** 当前单选待添加的节点 */
const pickingNodeId = ref('')

const wbsTree = computed(() => buildAsbuiltWbsTree())
const projectUsers = computed(() => listBrandProjectUsers(scopeProjectId.value))
const pageTitle = computed(() =>
  copyFromLabel.value ? '重新申报实模一致验收' : '新建实模一致验收',
)
const canUploadMore = computed(() => form.files.length < ASBUILT_REPORT_MAX_COUNT)

function findWbsLabel(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n.label || id
    const hit = findWbsLabel(n.children, id)
    if (hit) return hit
  }
  return ''
}

const selectedNodeRows = computed(() =>
  (form.selectedNodeIds || []).map((id, index) => ({
    key: `${id}-${index}`,
    wbs_node_id: id,
    path: findWbsLabel(wbsTree.value, id) || id,
  })),
)

function addPickedNode() {
  if (!pickingNodeId.value) {
    ElMessage.warning('请先单选一个实体工程节点')
    return
  }
  form.selectedNodeIds.push(pickingNodeId.value)
  pickingNodeId.value = ''
}

function removeNode(index) {
  form.selectedNodeIds.splice(index, 1)
}

function applyApproverFields(src = {}) {
  form.supervisor_approver_user_id = src.supervisor_approver_user_id || ''
  form.supervisor_approver_name = src.supervisor_approver_name || ''
  form.pm_approver_user_id = src.pm_approver_user_id || ''
  form.pm_approver_name = src.pm_approver_name || ''
}

function applyDefaultApprovers() {
  if (isHqSelected.value || !scopeProjectId.value) {
    applyApproverFields({})
    return
  }
  applyApproverFields(resolveDefaultApprovers(scopeProjectId.value))
}

function onApproverChange(role) {
  if (role === 'supervisor') {
    const u = findBrandProjectUser(form.supervisor_approver_user_id)
    form.supervisor_approver_name = u?.name || ''
  } else if (role === 'pm') {
    const u = findBrandProjectUser(form.pm_approver_user_id)
    form.pm_approver_name = u?.name || ''
  }
}

function fileSizeLabel(size) {
  const bytes = Number(size || 0)
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function isAllowedExt(name = '') {
  const lower = String(name).toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx')
}

function onReportChange(uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  if (form.files.length >= ASBUILT_REPORT_MAX_COUNT) {
    ElMessage.warning(`报告附件最多上传 ${ASBUILT_REPORT_MAX_COUNT} 个`)
    return
  }
  if (!isAllowedExt(raw.name)) {
    ElMessage.warning('报告仅支持 Word（.doc/.docx）与 PDF')
    return
  }
  if (raw.size > ASBUILT_REPORT_MAX_SIZE) {
    ElMessage.warning('单个报告附件不能超过 30MB')
    return
  }
  form.files.push({
    id: `abf-local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    file_name: raw.name,
    file_url: '#',
    file_size: raw.size,
    mime_type: raw.type || '',
    source: 'upload',
    uploader_id: 'u-constructor',
    uploaded_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  ElMessage.success(`已添加：${raw.name}`)
}

function removeFile(idx) {
  form.files.splice(idx, 1)
}

function openSource(id) {
  if (!id) return
  router.push(`/qm/asbuilt/detail?id=${id}`)
}

onMounted(() => {
  if (copyFromId.value) {
    const payload = buildCopyPayloadFromRejected(copyFromId.value)
    if (!payload) {
      ElMessage.warning('无法从该单复制，请确认其为已驳回验收单')
      copyFromId.value = ''
      applyDefaultApprovers()
      return
    }
    form.title = payload.title
    form.remark = payload.remark || ''
    form.selectedNodeIds = [...(payload.selectedNodeIds || [])]
    form.files = (payload.files || []).map((f) => ({ ...f }))
    applyApproverFields(payload)
    copyFromLabel.value = payload.copy_from_biz_no || copyFromId.value
    if (!form.supervisor_approver_user_id || !form.pm_approver_user_id) {
      applyDefaultApprovers()
    }
    ElMessage.success(
      `已从驳回单 ${copyFromLabel.value} 预填，请核对后提交（将生成新验收单号）`,
    )
  } else {
    applyDefaultApprovers()
  }
})

function buildPayload() {
  return {
    project_id: scopeProjectId.value,
    title: form.title,
    remark: form.remark,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
    pm_approver_user_id: form.pm_approver_user_id,
    pm_approver_name: form.pm_approver_name,
    nodes: (form.selectedNodeIds || []).map((id) => ({ wbs_node_id: id })),
    files: form.files,
  }
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.supervisor_approver_user_id) {
    return ElMessage.warning('请选择监理单位审批人')
  }
  if (!form.pm_approver_user_id) {
    return ElMessage.warning('请选择项目经理审批人')
  }
  const payload = buildPayload()
  const r = copyFromId.value
    ? copyAsbuiltFromRejected(copyFromId.value, payload)
    : submitAsbuilt(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    copyFromLabel.value
      ? `已重新申报 ${r.data.biz_no}（新单），状态为待审批，已进入个人中心待办（待监理审）`
      : `已提交 ${r.data.biz_no}，状态为待审批，已进入个人中心待办（待监理审）`,
  )
  router.push('/qm/asbuilt/list')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        施工质量管控 / 实模一致验收 / {{ copyFromLabel ? '重新申报' : '新建' }}
      </div>
      <div class="title-row">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-tag v-if="copyFromLabel" size="small" type="warning" effect="light">
          源单 {{ copyFromLabel }}
        </el-tag>
        <el-button @click="router.push('/qm/asbuilt/list')">返回列表</el-button>
      </div>
      <el-alert
        v-if="copyFromLabel"
        class="mb"
        type="info"
        :closable="false"
        show-icon
        title="重新申报（基于已驳回验收单）"
      >
        <template #default>
          <span>
            已带出源验收单
            <el-button link type="primary" @click="openSource(copyFromId)">
              {{ copyFromLabel }}
            </el-button>
            的任务、节点、报告与审批人信息，可修改后提交；新单将保留源单号追溯。
          </span>
        </template>
      </el-alert>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 提交后进入待审批
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先切换到具体项目后再填写"
      class="mb"
    />

    <el-form v-else label-width="150px">
      <el-form-item label="验收任务名称" required>
        <el-input
          v-model="form.title"
          maxlength="80"
          show-word-limit
          placeholder="如：T2 混凝土分项实模一致验收"
          aria-label="验收任务名称"
        />
      </el-form-item>
      <el-form-item label="所选实体工程节点" required>
        <div style="width: 100%">
          <div class="node-pick-row">
            <el-tree-select
              v-model="pickingNodeId"
              :data="wbsTree"
              check-strictly
              filterable
              clearable
              node-key="id"
              :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
              placeholder="单选至分项（不含检验批）"
              style="flex: 1"
            />
            <el-button type="primary" @click="addPickedNode">添加</el-button>
          </div>
          <p class="muted" style="margin: 8px 0 0">
            每次单选一个节点后点击添加；最少 1 个，不限制条数；同一节点可重复添加。
          </p>
          <el-table
            v-if="selectedNodeRows.length"
            :data="selectedNodeRows"
            stripe
            border
            size="small"
            style="margin-top: 12px; width: 100%"
          >
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="path" label="节点路径" min-width="280" show-overflow-tooltip />
            <el-table-column prop="wbs_node_id" label="节点 ID" width="140" show-overflow-tooltip />
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeNode($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>
      <el-form-item label="报告附件" required>
        <div>
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            :disabled="!canUploadMore"
            multiple
            :accept="ASBUILT_REPORT_ACCEPT"
            @change="onReportChange"
          >
            <el-button type="primary" :disabled="!canUploadMore">上传报告</el-button>
          </el-upload>
          <p class="muted" style="margin: 8px 0 0">
            支持 Word（.doc/.docx）与 PDF；最多 {{ ASBUILT_REPORT_MAX_COUNT }} 个，单个不超过 30MB。
            已上传 {{ form.files.length }}/{{ ASBUILT_REPORT_MAX_COUNT }}
          </p>
          <el-table
            v-if="form.files.length"
            :data="form.files"
            stripe
            border
            size="small"
            class="mb"
            style="margin-top: 12px; width: 640px"
          >
            <el-table-column prop="file_name" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">{{ asbuiltReportFileTypeLabel(row) }}</template>
            </el-table-column>
            <el-table-column label="大小" width="100">
              <template #default="{ row }">{{ fileSizeLabel(row.file_size) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ $index }">
                <el-button link type="danger" @click="removeFile($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          placeholder="选填"
          aria-label="备注"
        />
      </el-form-item>
      <el-form-item label="监理单位审批" required>
        <el-select
          v-model="form.supervisor_approver_user_id"
          placeholder="请选择监理单位审批人"
          filterable
          clearable
          style="width: 100%"
          aria-label="请选择监理单位审批人"
          @change="onApproverChange('supervisor')"
        >
          <el-option
            v-for="u in projectUsers"
            :key="u.user_id"
            :label="formatBrandProjectUserLabel(u)"
            :value="u.user_id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="项目经理审批" required>
        <el-select
          v-model="form.pm_approver_user_id"
          placeholder="请选择项目经理审批人"
          filterable
          clearable
          style="width: 100%"
          aria-label="请选择项目经理审批人"
          @change="onApproverChange('pm')"
        >
          <el-option
            v-for="u in projectUsers"
            :key="u.user_id"
            :label="formatBrandProjectUserLabel(u)"
            :value="u.user_id"
          />
        </el-select>
      </el-form-item>

      <div class="form-actions">
        <el-button type="primary" @click="onSubmit">提交审批</el-button>
        <el-button @click="router.push('/qm/asbuilt/list')">取消</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.title-row .page-title {
  margin: 0;
  margin-right: auto;
}

.form-actions {
  margin-top: 8px;
  padding-left: 150px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.mb {
  margin-bottom: 12px;
}

.node-pick-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.muted {
  color: #909399;
  font-size: 13px;
  line-height: 1.5;
}
</style>
