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
  listAsbuilt,
} from '../../../mock/asbuilt.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const editId = ref(String(route.query.id || ''))
const relatedRejectId = ref(String(route.query.relatedRejectId || ''))

const form = reactive({
  title: '',
  compare_url: '',
  selectedNodeIds: [],
  files: [],
})

const wbsTree = computed(() => buildAsbuiltWbsTree())

const rejectedOptions = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listAsbuilt(scopeProjectId.value, { status: 'rejected' })
})

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
    form.compare_url = row.compare_url
    form.selectedNodeIds = (row.nodes || []).map((n) => n.wbs_node_id)
    form.files = (row.files || []).map((f) => ({ ...f }))
    relatedRejectId.value = row.related_reject_id || ''
  } else if (relatedRejectId.value) {
    const rejected = getAsbuilt(relatedRejectId.value)
    if (rejected) {
      form.title = `${rejected.title}（重新申报）`
      form.compare_url = rejected.compare_url || ''
      form.selectedNodeIds = (rejected.nodes || []).map((n) => n.wbs_node_id)
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
    compare_url: form.compare_url,
    related_reject_id: relatedRejectId.value || '',
    nodes: (form.selectedNodeIds || []).map((id) => ({ wbs_node_id: id })),
    files: form.files,
    data_source: 'manual',
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
        · 须同时具备：实体工程节点（≥1）+ PDF 报告 + 对比可访问地址
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
      <section class="form-section">
        <h2 class="section-title">基本信息</h2>
        <el-form-item label="验收任务名称" required>
          <el-input v-model="form.title" maxlength="80" show-word-limit placeholder="如：T2 混凝土分项实模一致验收" aria-label="如：T2 混凝土分项实模一致验收"/>
        </el-form-item>
        <el-form-item label="关联被驳回单">
          <el-select
            v-model="relatedRejectId"
            clearable
            filterable
            placeholder="重新申报时可关联（选填）"
            style="width: 100%" aria-label="重新申报时可关联（选填）">
            <el-option
              v-for="r in rejectedOptions"
              :key="r.id"
              :label="`${r.biz_no} · ${r.title}`"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="对比可访问地址" required>
          <el-input
            v-model="form.compare_url"
            placeholder="https:// 第三方实模对比页面地址" aria-label="https:// 第三方实模对比页面地址"/>
        </el-form-item>
      </section>

      <section class="form-section">
        <h2 class="section-title">所选实体工程节点</h2>
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
      </section>

      <section class="form-section">
        <h2 class="section-title">实模一致性报告（PDF）</h2>
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
      </section>

      <div class="form-actions">
        <el-button type="primary" @click="onSubmit">提交</el-button>
        <el-button @click="router.push('/qm/asbuilt/list')">取消</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.form-actions {
  margin-top: 8px;
  padding-left: 150px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
