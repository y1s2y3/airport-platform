<script setup>
import './sample-page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildCopyPayloadFromRejectedProcess,
  buildReEditPayloadFromWithdrawnProcess,
  submitProcessApp,
  resubmitWithdrawnSample,
} from '../../../mock/sample.js'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'
import SampleMediaAttachments from './SampleMediaAttachments.vue'

const router = useRouter()
const route = useRoute()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const reEditId = ref(String(route.query.id || ''))
const isReEdit = ref(route.query.reEdit === '1' || route.query.mode === 'resubmit')

const form = reactive({
  process_name: '',
  use_part: '',
  location_id: '',
  location_ids: [],
  briefing_content: '',
  remark: '',
})

/** 现场影像资料：{ name, url, kind }[] */
const mediaList = ref([])
/** 文件资料：{ name, url }[] */
const docList = ref([])

function onPickDoc(uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('单个文件不超过 30MB')
    return false
  }
  if (docList.value.length >= 20) {
    ElMessage.warning('文件资料最多 20 个')
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
  if (isReEdit.value && reEditId.value) {
    const r = buildReEditPayloadFromWithdrawnProcess(reEditId.value)
    if (!r.ok) {
      ElMessage.error(r.msg)
      isReEdit.value = false
      reEditId.value = ''
      return
    }
    const data = r.data
    form.process_name = data.process_name || ''
    form.use_part = data.use_part || ''
    form.location_id = data.location_id || ''
    form.location_ids = Array.isArray(data.location_ids) ? [...data.location_ids] : []
    form.briefing_content = data.briefing_content || ''
    form.remark = data.remark || ''
    mediaList.value = (data.media_files || []).map((m) => ({
      name: m.name,
      url: '#',
      kind: m.kind === 'video' ? 'video' : 'image',
    }))
    docList.value = (data.doc_files || []).map((name) => ({ name, url: '#' }))
    ElMessage.success(`已载入撤回单 ${reEditId.value}，修改后提交将回到待审批`)
    return
  }
  if (!copyFromId.value) return
  const r = buildCopyPayloadFromRejectedProcess(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace('/qm/sample/process/applications/edit')
    return
  }
  const data = r.data
  form.process_name = data.process_name || ''
  form.use_part = data.use_part || ''
  form.location_id = data.location_id || ''
  form.location_ids = Array.isArray(data.location_ids) ? [...data.location_ids] : []
  form.briefing_content = data.briefing_content || ''
  form.remark = data.remark || ''
  mediaList.value = (data.media_files || []).map((m) => ({
    name: m.name,
    url: '#',
    kind: m.kind === 'video' ? 'video' : 'image',
  }))
  docList.value = (data.doc_files || []).map((name) => ({ name, url: '#' }))
})

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
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
    use_part: form.use_part,
    location_id: form.location_id,
    location_ids: [...(form.location_ids || [])],
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
  }
  const r =
    isReEdit.value && reEditId.value
      ? resubmitWithdrawnSample('process', reEditId.value, payload)
      : submitProcessApp(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    isReEdit.value
      ? `已重新提交 ${r.data.application_id}，状态已回到待审批`
      : `已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`,
  )
  router.push('/qm/sample/process/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板报审 / {{ isReEdit ? '重新编辑' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ isReEdit ? '重新编辑关键工序样板' : '新建关键工序样板' }}</h1>
        <el-tag v-if="isReEdit && reEditId" size="small" type="success" effect="plain">
          原单 {{ reEditId }}
        </el-tag>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 复制
        </el-tag>
      </div>
    </div>

    <el-form label-width="140px" class="create-form">
      <el-form-item label="工序名称" required>
        <el-input v-model="form.process_name" placeholder="如：清水混凝土柱样板" maxlength="80" />
      </el-form-item>
      <el-form-item label="施工部位" required>
        <ConstructionLocationSelect
          v-model:location-id="form.location_id"
          v-model:location-ids="form.location_ids"
          v-model:location-name="form.use_part"
          :project-id="scopeProjectId"
          multiple
          placeholder="可多选施工部位"
        />
      </el-form-item>
      <el-form-item label="关键工序样板说明" required>
        <el-input
          v-model="form.briefing_content"
          type="textarea"
          :rows="4"
          placeholder="样板说明要点（通过后可在详情与台账查看）"
        />
      </el-form-item>
      <el-form-item label="现场影像资料">
        <SampleMediaAttachments v-model="mediaList" name-prefix="现场影像" />
      </el-form-item>
      <el-form-item label="文件资料">
        <div class="doc-upload">
          <el-upload
            :show-file-list="false"
            :before-upload="onPickDoc"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.dwg"
          >
            <el-button type="primary" plain :icon="UploadFilled">上传本地文件</el-button>
          </el-upload>
          <p class="doc-hint">支持 PDF / Office / 压缩包等，单个不超过 30MB</p>
          <ul v-if="docList.length" class="doc-list">
            <li v-for="(d, idx) in docList" :key="`${d.name}-${idx}`">
              <span class="doc-name" :title="d.name">{{ d.name }}</span>
              <el-button link type="danger" @click="removeDoc(idx)">删除</el-button>
            </li>
          </ul>
        </div>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="选填" />
      </el-form-item>
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
.form-actions {
  padding-left: 140px;
  display: flex;
  gap: 8px;
}
</style>
