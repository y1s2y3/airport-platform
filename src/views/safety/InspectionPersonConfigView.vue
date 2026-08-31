<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getInspectionPersonConfig,
  getInspectorById,
  inspectorCandidates,
  saveInspectionPersonConfig,
} from '../../composables/useInspectionPersonConfig'

const { laborProjectId, projectLabel } = useCurrentProject()
const isEditing = ref(false)

const form = reactive({
  manager: '',
  inspectorId: 'insp-supervisor',
  rectifierId: '',
  reviewerId: '',
})

const currentConfig = computed(() => getInspectionPersonConfig(laborProjectId.value))
const currentInspector = computed(() => getInspectorById(form.inspectorId))
const currentRectifier = computed(() => getInspectorById(form.rectifierId))
const currentReviewer = computed(() => getInspectorById(form.reviewerId))

function loadForm() {
  const config = currentConfig.value
  form.manager = config?.manager || '项目经理'
  form.inspectorId = config?.inspectorId || 'insp-supervisor'
  form.rectifierId = config?.rectifierId || ''
  form.reviewerId = config?.reviewerId || 'insp-supervisor'
}

watch(laborProjectId, () => {
  loadForm()
  isEditing.value = false
}, { immediate: true })

function startEdit() {
  loadForm()
  isEditing.value = true
}

function cancelEdit() {
  loadForm()
  isEditing.value = false
}

function handleSave() {
  if (!form.inspectorId) {
    ElMessage.warning('请选择巡检人')
    return
  }
  if (!form.rectifierId) {
    ElMessage.warning('请选择默认整改人')
    return
  }
  if (!form.reviewerId) {
    ElMessage.warning('请选择默认复查人')
    return
  }
  saveInspectionPersonConfig(laborProjectId.value, {
    manager: form.manager || '项目经理',
    inspectorId: form.inspectorId,
    rectifierId: form.rectifierId,
    reviewerId: form.reviewerId,
  })
  isEditing.value = false
  ElMessage.success('人员配置已保存，任务和隐患将默认带入巡检人、整改人及复查人')
}
</script>

<template>
  <div class="person-config-page">
    <div class="page-head">
      <div>
        <h3 class="page-title">人员配置详情</h3>
        <div class="page-desc">查看本项目巡检人、复查人和整改人配置。</div>
      </div>
      <el-button v-if="!isEditing" type="primary" @click="startEdit">编辑</el-button>
      <div v-else class="head-actions">
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-tag v-if="isEditing" type="warning" effect="light">编辑中</el-tag>
        </div>
      </template>
      <el-descriptions :column="2" border class="config-detail">
        <el-descriptions-item label="项目">{{ projectLabel }}</el-descriptions-item>
        <el-descriptions-item label="配置人">{{ form.manager || '-' }}</el-descriptions-item>
        <el-descriptions-item label="巡检人">
          <el-select v-if="isEditing" v-model="form.inspectorId" placeholder="请选择巡检人" class="person-select">
            <el-option v-for="item in inspectorCandidates" :key="item.id" :label="`${item.name}（${item.role}）`" :value="item.id" />
          </el-select>
          <template v-else>
            <span v-if="currentInspector">{{ currentInspector.name }}（{{ currentInspector.role }}，{{ currentInspector.phone }}）</span>
            <span v-else>-</span>
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="复查人">
          <el-select v-if="isEditing" v-model="form.reviewerId" placeholder="请选择复查人" class="person-select">
            <el-option v-for="item in inspectorCandidates" :key="item.id" :label="`${item.name}（${item.role}）`" :value="item.id" />
          </el-select>
          <template v-else>
            <span v-if="currentReviewer">{{ currentReviewer.name }}（{{ currentReviewer.role }}，{{ currentReviewer.phone }}）</span>
            <span v-else>-</span>
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="整改人">
          <el-select v-if="isEditing" v-model="form.rectifierId" placeholder="请选择整改人" class="person-select">
            <el-option v-for="item in inspectorCandidates" :key="item.id" :label="`${item.name}（${item.role}）`" :value="item.id" />
          </el-select>
          <template v-else>
            <span v-if="currentRectifier">{{ currentRectifier.name }}（{{ currentRectifier.role }}，{{ currentRectifier.phone }}）</span>
            <span v-else>-</span>
          </template>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.person-config-page { display:flex; flex-direction:column; gap:16px; }
.page-head { display:flex; justify-content:space-between; align-items:flex-start; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0 0 6px; }
.page-desc { font-size:13px; color:#666; line-height:1.6; }
.config-card { border-radius:8px; }
.head-actions { display:flex; gap:8px; }
.card-header { display:flex; align-items:center; justify-content:space-between; }
.person-select { width:100%; max-width:420px; }
.config-detail :deep(.el-descriptions__cell) { height:56px; }
</style>
