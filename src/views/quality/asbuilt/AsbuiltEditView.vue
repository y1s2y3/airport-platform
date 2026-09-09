<script setup>
import '../mat/mat-page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildAsbuiltWbsTree,
  getAsbuilt,
  saveAsbuiltDraft,
  submitAsbuilt,
} from '../../../mock/asbuilt.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const editId = ref(String(route.query.id || ''))
const prefillRejectId = String(route.query.relatedRejectId || '')

const form = reactive({
  title: '',
  remark: '',
  selectedNodeIds: [],
  files: [],
})

const wbsTree = computed(() => buildAsbuiltWbsTree())

const pageTitle = computed(() => (editId.value ? '编辑实模一致验收' : '新建实模一致验收'))

onMounted(() => {
  if (editId.value) {
    const row = getAsbuilt(editId.value)
    if (!row) {
      ElMessage.error('单据不存在')
      router.replace('/qm/asbuilt/list')
      return
    }
    if (row.status !== 'draft') {
      ElMessage.warning('仅待提交可编辑')
      router.replace(`/qm/asbuilt/detail?id=${row.id}`)
      return
    }
    form.title = row.title
    form.remark = row.remark || ''
    form.selectedNodeIds = (row.nodes || []).map((n) => n.wbs_node_id)
    form.files = (row.files || []).map((f) => ({ ...f }))
  } else if (prefillRejectId) {
    const rejected = getAsbuilt(prefillRejectId)
    if (rejected) {
      form.title = `${rejected.title}（重新申报）`
      form.remark = rejected.remark || ''
      form.selectedNodeIds = (rejected.nodes || []).map((n) => n.wbs_node_id)
      form.files = (rejected.files || []).map((f) => ({
        ...f,
        id: `abf-local-${Date.now()}-${f.id || Math.random().toString(36).slice(2, 6)}`,
        source: 'upload',
        uploader_id: 'u-constructor',
        uploaded_at: new Date().toLocaleString('zh-CN', { hour12: false }),
      }))
    }
  }
})

function mockUploadPdf() {
  const name = `实模一致性报告-${Date.now()}.pdf`
  form.files.push({
    id: `abf-local-${Date.now()}`,
    file_name: name,
    file_url: '#',
    file_size: 1024 * (400 + Math.floor(Math.random() * 400)),
    mime_type: 'application/pdf',
    source: 'upload',
    uploader_id: 'u-constructor',
    uploaded_at: new Date().toLocaleString('zh-CN', { hour12: false }),
  })
  ElMessage.success(`已模拟上传：${name}`)
}

function removeFile(idx) {
  form.files.splice(idx, 1)
}

function buildPayload() {
  return {
    id: editId.value || undefined,
    project_id: scopeProjectId.value,
    title: form.title,
    remark: form.remark,
    nodes: (form.selectedNodeIds || []).map((id) => ({ wbs_node_id: id })),
    files: form.files,
  }
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const saved = saveAsbuiltDraft(buildPayload())
  if (!saved.ok) return ElMessage.error(saved.msg)
  const r = submitAsbuilt(saved.data.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已提交审批，监理待办已生成（个人中心）')
  router.push(`/qm/asbuilt/detail?id=${saved.data.id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工质量管控 / 实模一致验收 / {{ editId ? '编辑' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-button @click="router.push('/qm/asbuilt/list')">返回列表</el-button>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 须同时具备：实体工程节点（≥1）+ PDF 报告
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
          aria-label="如：T2 混凝土分项实模一致验收"
        />
      </el-form-item>
      <el-form-item label="工程分解树" required>
        <el-tree-select
          v-model="form.selectedNodeIds"
          :data="wbsTree"
          multiple
          show-checkbox
          check-strictly
          filterable
          node-key="id"
          :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
          placeholder="多选至分项（不含检验批）"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="报告附件" required>
        <div>
          <el-button type="primary" @click="mockUploadPdf">模拟上传 PDF</el-button>
          <p class="muted" style="margin: 8px 0 0">仅支持 PDF；大小与数量遵循平台通用附件规范。</p>
          <el-table
            v-if="form.files.length"
            :data="form.files"
            stripe
            border
            size="small"
            class="mb"
            style="margin-top: 12px; width: 560px"
          >
            <el-table-column prop="file_name" label="文件名" min-width="220" />
            <el-table-column label="大小" width="90">
              <template #default="{ row }">
                {{ Math.max(1, Math.round((row.file_size || 0) / 1024)) }} KB
              </template>
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

      <div class="form-actions">
        <el-button type="primary" @click="onSubmit">提交</el-button>
        <el-button @click="router.push('/qm/asbuilt/list')">取消</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
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

.form-actions {
  margin-top: 8px;
  padding-left: 150px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
