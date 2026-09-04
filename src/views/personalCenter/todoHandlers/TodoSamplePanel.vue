<script setup>
import { computed } from 'vue'
import {
  getMaterialDetail,
  getProcessDetail,
  statusLabel,
  statusTagType,
  NODE_LABEL,
  BIZ_TYPE_LABEL,
  materialTypeLabel,
} from '../../../mock/sample.js'
import FileAttachmentPreview from '../../../components/basicData/FileAttachmentPreview.vue'
import '../styles/todoHandleBlocks.css'

const props = defineProps({
  todo: { type: Object, required: true },
})

function normalizeAttachUrl(url) {
  const raw = String(url || '').trim()
  if (!raw || raw === '#' || raw === 'about:blank') return ''
  return raw
}

function toAttachList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((f) => {
      if (typeof f === 'string') return { name: f, url: '' }
      const name = f?.name || ''
      if (!name) return null
      return { name, url: normalizeAttachUrl(f.url) }
    })
    .filter(Boolean)
}

const liveDetail = computed(() => {
  const id = props.todo?.sampleApplicationId
  if (!id) return null
  if (props.todo.sampleBizType === 'material') return getMaterialDetail(id)
  if (props.todo.sampleBizType === 'process') return getProcessDetail(id)
  return null
})

const isMaterial = computed(() => props.todo?.sampleBizType === 'material')

const appStatus = computed(() => liveDetail.value?.status || 'in_approval')

const currentNodeText = computed(() => {
  const app = liveDetail.value
  if (!app) {
    return (
      props.todo?.detail?.currentNode ||
      (props.todo?.sampleNode === 'pm' ? '待项目经理审' : '待监理审')
    )
  }
  if (app.current_node === 'none' || !app.current_node) {
    if (app.status === 'approved') return '已办结'
    if (app.status === 'rejected') return '已驳回'
    return '—'
  }
  return NODE_LABEL[app.current_node] || app.current_node
})

const bizTypeText = computed(() => {
  if (props.todo?.sampleBizType && BIZ_TYPE_LABEL[props.todo.sampleBizType]) {
    return BIZ_TYPE_LABEL[props.todo.sampleBizType]
  }
  return props.todo?.detail?.bizType || '—'
})

const samplePhotos = computed(() => {
  const d = liveDetail.value
  if (d) {
    const list = d.sample_photos?.length ? d.sample_photos : d.effect_images
    return toAttachList(list)
  }
  return toAttachList(props.todo?.detail?.effectImages)
})

const signFiles = computed(() => {
  const d = liveDetail.value
  if (d) {
    const list = d.sign_files?.length ? d.sign_files : d.approval_files
    return toAttachList(list)
  }
  return toAttachList(props.todo?.detail?.approvalFiles)
})

const certificateFiles = computed(() => {
  const d = liveDetail.value
  if (d) return toAttachList(d.certificate_files)
  return toAttachList(props.todo?.detail?.certificateFiles)
})

const processMediaFiles = computed(() => {
  const d = liveDetail.value
  if (!d || isMaterial.value) return []
  if (Array.isArray(d.media_files) && d.media_files.length) {
    return toAttachList(d.media_files)
  }
  return [
    ...toAttachList(d.photo_files),
    ...toAttachList((d.video_files || []).map((n) => (typeof n === 'string' ? n : n?.name))),
  ]
})

const processDocFiles = computed(() => {
  const d = liveDetail.value
  if (!d || isMaterial.value) return []
  return toAttachList(d.doc_files)
})
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">样板报审信息</div>
    </div>
    <el-descriptions :column="2" border class="info-desc">
      <el-descriptions-item label="报审编号">
        {{ liveDetail?.application_id || todo.detail?.applicationId || todo.sampleApplicationId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag size="small" :type="statusTagType(appStatus)">{{ statusLabel(appStatus) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="类型">{{ bizTypeText }}</el-descriptions-item>
      <el-descriptions-item label="当前节点">{{ currentNodeText }}</el-descriptions-item>
      <el-descriptions-item label="名称">
        {{
          liveDetail?.sample_name ||
          liveDetail?.material_name ||
          liveDetail?.process_name ||
          todo.detail?.title ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item label="使用部位">
        {{ liveDetail?.use_part || todo.detail?.usePart || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-if="isMaterial && (liveDetail?.unit_name || todo.detail?.unitName)" label="单位工程">
        {{ liveDetail?.unit_name || todo.detail?.unitName }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ liveDetail?.project_label || todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ liveDetail?.applicant_name || todo.applicant || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-if="isMaterial" label="材料类型">
        {{
          liveDetail?.material_type
            ? materialTypeLabel(liveDetail.material_type)
            : todo.detail?.materialType || '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="isMaterial && (liveDetail?.sample_date || todo.detail?.sampleDate)"
        label="送样日期"
      >
        {{ liveDetail?.sample_date || todo.detail?.sampleDate }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="isMaterial && (liveDetail?.brand_name || todo.detail?.brandName)"
        label="品牌"
      >
        {{ liveDetail?.brand_name || todo.detail?.brandName }}
      </el-descriptions-item>
      <el-descriptions-item v-if="isMaterial" label="生产厂家">
        {{
          liveDetail?.manufacturer ||
          liveDetail?.supplier ||
          todo.detail?.manufacturer ||
          todo.detail?.supplier ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item v-if="isMaterial" label="规格（或技术参数）" :span="2">
        {{
          liveDetail?.spec ||
          liveDetail?.indicator_desc ||
          todo.detail?.spec ||
          todo.detail?.indicatorDesc ||
          todo.detail?.briefing ||
          '—'
        }}
      </el-descriptions-item>
      <el-descriptions-item v-else label="关键工序样板说明" :span="2">
        {{ liveDetail?.briefing_content || todo.detail?.briefing || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">
        {{ liveDetail?.remark || todo.detail?.remark || '—' }}
      </el-descriptions-item>
    </el-descriptions>

    <template v-if="isMaterial">
      <div v-if="samplePhotos.length" class="attach-group">
        <div class="attach-label">样品照片</div>
        <div class="attach-list">
          <FileAttachmentPreview
            v-for="(f, idx) in samplePhotos"
            :key="`photo-${idx}-${f.name}`"
            :name="f.name"
            :url="f.url"
            size="md"
          />
        </div>
      </div>
      <div v-if="signFiles.length" class="attach-group">
        <div class="attach-label">材料设备送样定板报审签字附件</div>
        <div class="attach-list">
          <FileAttachmentPreview
            v-for="(f, idx) in signFiles"
            :key="`sign-${idx}-${f.name}`"
            :name="f.name"
            :url="f.url"
            size="md"
          />
        </div>
      </div>
      <div v-if="certificateFiles.length" class="attach-group">
        <div class="attach-label">样品出厂质量证明文件</div>
        <div class="attach-list">
          <FileAttachmentPreview
            v-for="(f, idx) in certificateFiles"
            :key="`cert-${idx}-${f.name}`"
            :name="f.name"
            :url="f.url"
            size="md"
          />
        </div>
      </div>
    </template>
    <template v-else>
      <div v-if="processMediaFiles.length" class="attach-group">
        <div class="attach-label">现场影像资料</div>
        <div class="attach-list">
          <FileAttachmentPreview
            v-for="(f, idx) in processMediaFiles"
            :key="`media-${idx}-${f.name}`"
            :name="f.name"
            :url="f.url"
            size="md"
          />
        </div>
      </div>
      <div v-if="processDocFiles.length" class="attach-group">
        <div class="attach-label">文件资料</div>
        <div class="attach-list">
          <FileAttachmentPreview
            v-for="(f, idx) in processDocFiles"
            :key="`doc-${idx}-${f.name}`"
            :name="f.name"
            :url="f.url"
            size="md"
          />
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* 与品牌报审 / 进场待办处置详情字号对齐 */
.info-desc :deep(.el-descriptions__label) {
  width: 148px;
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
}

.info-desc :deep(.el-descriptions__content) {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ap-text, #303133);
}

.info-desc :deep(.el-descriptions__cell) {
  padding: 12px 14px;
}

.attach-group {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #ebeef5;
}

.attach-label {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.attach-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attach-list :deep(.attach-name) {
  font-size: 14px;
  color: var(--ap-text, #303133);
}

.attach-list :deep(.attach-actions .el-button) {
  font-size: 14px;
}
</style>
