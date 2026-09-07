<script setup>
import './sample-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildCopyPayloadFromRejectedProcess,
  submitProcessApp,
  listBrandProjectUsers,
  resolveDefaultApprovers,
  findBrandProjectUser,
  formatBrandProjectUserLabel,
} from '../../../mock/sample.js'
import {
  listEntityPartSelectTree,
  getEntityNodePathLabel,
} from '../../../mock/constructionLocation.js'
import SampleMediaAttachments from './SampleMediaAttachments.vue'

const router = useRouter()
const route = useRoute()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const syncingPrefill = ref(false)

const form = reactive({
  process_name: '',
  use_part: '',
  location_id: '',
  location_ids: [],
  briefing_content: '',
  remark: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
})

const projectUsers = computed(() =>
  scopeProjectId.value ? listBrandProjectUsers(scopeProjectId.value) : [],
)

const partTree = computed(() =>
  scopeProjectId.value ? listEntityPartSelectTree(scopeProjectId.value) : [],
)

function applyApproverFields(src = {}) {
  form.supervisor_approver_user_id = src.supervisor_approver_user_id || ''
  form.supervisor_approver_name = src.supervisor_approver_name || ''
}

function applyDefaultApprovers() {
  if (!scopeProjectId.value) {
    applyApproverFields({})
    return
  }
  const defaults = resolveDefaultApprovers(scopeProjectId.value)
  applyApproverFields({
    supervisor_approver_user_id: defaults.supervisor_approver_user_id,
    supervisor_approver_name: defaults.supervisor_approver_name,
  })
}

function onApproverChange() {
  const u = findBrandProjectUser(form.supervisor_approver_user_id)
  form.supervisor_approver_name = u?.name || ''
}

/** 施工部位：实体分解树各层级单选 */
function onPartChange(wbsId) {
  if (syncingPrefill.value) return
  form.location_id = wbsId || ''
  form.location_ids = wbsId ? [wbsId] : []
  form.use_part = wbsId ? getEntityNodePathLabel(wbsId) : ''
}

function applyProcessPayload(data) {
  syncingPrefill.value = true
  form.process_name = data.process_name || ''
  form.location_id = data.location_id || (Array.isArray(data.location_ids) ? data.location_ids[0] : '') || ''
  form.location_ids = form.location_id ? [form.location_id] : []
  form.use_part =
    data.use_part ||
    (form.location_id ? getEntityNodePathLabel(form.location_id) : '') ||
    ''
  form.briefing_content = data.briefing_content || ''
  form.remark = data.remark || ''
  applyApproverFields(data)
  mediaList.value = (data.media_files || []).map((m) => ({
    name: m.name,
    url: '#',
    kind: m.kind === 'video' ? 'video' : 'image',
  }))
  docList.value = (data.doc_files || []).map((name) => ({ name, url: '#' }))
  queueMicrotask(() => {
    syncingPrefill.value = false
  })
}

/** 现场影像资料：{ name, url, kind }[] — 必填，最多 9 个，单个 ≤30MB */
const MEDIA_MAX_COUNT = 9
const MEDIA_MAX_SIZE_MB = 30
/** 文件资料：最多 9 个，单个 ≤30MB */
const DOC_MAX_COUNT = 9
const DOC_MAX_SIZE_MB = 30

const mediaList = ref([])
const docList = ref([])

function onPickDoc(uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  if (file.size > DOC_MAX_SIZE_MB * 1024 * 1024) {
    ElMessage.warning(`单个文件不超过 ${DOC_MAX_SIZE_MB}MB`)
    return false
  }
  if (docList.value.length >= DOC_MAX_COUNT) {
    ElMessage.warning(`文件资料最多 ${DOC_MAX_COUNT} 个`)
    return false
  }
  const name = file.name || `文件资料-${docList.value.length + 1}`
  if (docList.value.some((d) => d.name === name)) {
    ElMessage.warning('同名文件已存在')
    return false
  }
  docList.value = [...docList.value, { name, url: '#' }]
  ElMessage.success(`已添加：${name}`)
  return false
}

function removeDoc(index) {
  docList.value = docList.value.filter((_, i) => i !== index)
}

onMounted(() => {
  if (!copyFromId.value) {
    applyDefaultApprovers()
    return
  }
  const r = buildCopyPayloadFromRejectedProcess(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace('/qm/sample/process/applications/edit')
    return
  }
  applyProcessPayload(r.data)
})

watch(scopeProjectId, () => {
  if (!copyFromId.value) applyDefaultApprovers()
})

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.location_id) return ElMessage.warning('请选择施工部位')
  if (!mediaList.value.length) return ElMessage.warning('请上传现场影像资料')
  if (mediaList.value.length > MEDIA_MAX_COUNT) {
    return ElMessage.warning(`现场影像资料最多 ${MEDIA_MAX_COUNT} 个`)
  }
  if (docList.value.length > DOC_MAX_COUNT) {
    return ElMessage.warning(`文件资料最多 ${DOC_MAX_COUNT} 个`)
  }
  const photo_files = mediaList.value
    .filter((m) => m.kind !== 'video')
    .map((m) => m.name)
    .filter(Boolean)
  const video_files = mediaList.value
    .filter((m) => m.kind === 'video')
    .map((m) => m.name)
    .filter(Boolean)
  const doc_files = docList.value.map((d) => d.name).filter(Boolean)

  const payload = {
    project_id: scopeProjectId.value,
    process_name: form.process_name,
    use_part: form.use_part || getEntityNodePathLabel(form.location_id),
    location_id: form.location_id,
    location_ids: form.location_id ? [form.location_id] : [],
    briefing_content: form.briefing_content,
    photo_files,
    video_files,
    media_files: mediaList.value.map((m) => ({
      name: m.name,
      kind: m.kind === 'video' ? 'video' : 'image',
    })),
    doc_files,
    copy_from_application_id: copyFromId.value,
    remark: form.remark,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
  }
  const r = submitProcessApp(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/sample/process/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板报审 / 新建</div>
      <div class="title-row">
        <h1 class="page-title">新建关键工序样板</h1>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 重新申报
        </el-tag>
      </div>
    </div>

    <el-form label-width="140px" class="create-form">
      <el-form-item label="工序名称" required>
        <el-input v-model="form.process_name" placeholder="如：清水混凝土柱样板" maxlength="80" aria-label="如：清水混凝土柱样板"/>
      </el-form-item>
      <el-form-item label="施工部位" required>
        <el-tree-select
          v-model="form.location_id"
          :data="partTree"
          filterable
          clearable
          check-strictly
          node-key="id"
          :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
          :render-after-expand="false"
          default-expand-all
          placeholder="从实体工程分解树单选（各层级可选）"
          style="width: 100%"
          :disabled="!partTree.length"
          aria-label="施工部位"
          @change="onPartChange"
        />
        <p v-if="!partTree.length" class="field-hint">本项目暂无实体工程分解节点</p>
      </el-form-item>
      <el-form-item label="关键工序样板说明" required>
        <el-input
          v-model="form.briefing_content"
          type="textarea"
          :rows="4"
          placeholder="样板说明要点（通过后可在详情与台账查看）" aria-label="样板说明要点（通过后可在详情与台账查看）"/>
      </el-form-item>
      <el-form-item label="现场影像资料" required>
        <SampleMediaAttachments
          v-model="mediaList"
          name-prefix="现场影像"
          :max="MEDIA_MAX_COUNT"
          :max-size-mb="MEDIA_MAX_SIZE_MB"
        />
      </el-form-item>
      <el-form-item label="文件资料">
        <div class="doc-upload">
          <el-upload
            :show-file-list="false"
            :before-upload="onPickDoc"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.dwg"
            :disabled="docList.length >= DOC_MAX_COUNT"
          >
            <el-button
              type="primary"
              plain
              :icon="UploadFilled"
              :disabled="docList.length >= DOC_MAX_COUNT"
            >
              上传本地文件
            </el-button>
          </el-upload>
          <p class="doc-hint">
            支持 PDF / Office / 压缩包等，最多 {{ DOC_MAX_COUNT }} 个，单个不超过 {{ DOC_MAX_SIZE_MB }}MB
          </p>
          <ul v-if="docList.length" class="doc-list">
            <li v-for="(d, idx) in docList" :key="`${d.name}-${idx}`">
              <span class="doc-name" :title="d.name">{{ d.name }}</span>
              <el-button link type="danger" @click="removeDoc(idx)">删除</el-button>
            </li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
          placeholder="选填"
          aria-label="备注"
        />
      </el-form-item>

      <section class="form-section">
        <h2 class="section-title">审批人配置</h2>
        <el-form-item label="监理审批" required>
          <el-select
            v-model="form.supervisor_approver_user_id"
            placeholder="请选择监理审批人"
            filterable
            clearable
            style="width: 100%"
            aria-label="请选择监理审批人"
            @change="onApproverChange"
          >
            <el-option
              v-for="u in projectUsers"
              :key="u.user_id"
              :label="formatBrandProjectUserLabel(u)"
              :value="u.user_id"
            />
          </el-select>
        </el-form-item>
      </section>

      <div class="form-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交报审</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.create-form {
  max-width: 760px;
}
.create-form :deep(.el-form-item) {
  margin-bottom: 20px;
}
.doc-upload {
  width: 100%;
}
.doc-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}
.doc-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.doc-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f2f5;
}
.doc-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #606266;
}
.form-section {
  margin: 8px 0 20px;
  padding: 14px 16px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}
.form-section :deep(.el-form-item) {
  margin-bottom: 16px;
}
.form-section :deep(.el-form-item__label) {
  white-space: nowrap;
}
.form-actions {
  padding-left: 140px;
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}
</style>
