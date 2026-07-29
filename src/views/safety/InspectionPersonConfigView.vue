<script setup>
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getInspectionPersonConfig,
  getInspectorById,
  inspectorCandidates,
  saveInspectionPersonConfig,
} from '../../composables/useInspectionPersonConfig'

const { laborProjectId, projectLabel } = useCurrentProject()

const form = reactive({
  manager: '',
  inspectorId: '',
})

const currentConfig = computed(() => getInspectionPersonConfig(laborProjectId.value))
const currentInspector = computed(() => getInspectorById(form.inspectorId))

function loadForm() {
  const config = currentConfig.value
  form.manager = config?.manager || '项目经理'
  form.inspectorId = config?.inspectorId || ''
}

watch(laborProjectId, loadForm, { immediate: true })

function handleSave() {
  if (!form.inspectorId) {
    ElMessage.warning('请选择巡检人')
    return
  }
  saveInspectionPersonConfig(laborProjectId.value, {
    manager: form.manager || '项目经理',
    inspectorId: form.inspectorId,
  })
  ElMessage.success('巡检人配置已保存，后续计划生成的任务将默认推送给该巡检人')
}
</script>

<template>
  <div class="person-config-page">
    <div class="page-head">
      <div>
        <h3 class="page-title">巡检人配置</h3>
        <div class="page-desc">由项目经理配置本项目默认巡检人；工程指挥部制定巡检计划后，生成的巡检任务将直接推送给这里配置的巡检人。</div>
      </div>
    </div>

    <el-card class="config-card" shadow="never">
      <el-form label-width="110px" class="config-form">
        <el-form-item label="所属项目">
          <el-input :model-value="projectLabel" disabled />
        </el-form-item>
        <el-form-item label="配置人">
          <el-input v-model="form.manager" placeholder="项目经理" />
        </el-form-item>
        <el-form-item label="巡检人" required>
          <el-select v-model="form.inspectorId" placeholder="请选择巡检人" style="width: 100%">
            <el-option
              v-for="item in inspectorCandidates"
              :key="item.id"
              :label="`${item.name}（${item.role}）`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存配置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="config-card" shadow="never">
      <template #header>
        <span>当前配置</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="项目">{{ projectLabel }}</el-descriptions-item>
        <el-descriptions-item label="配置人">{{ form.manager || '-' }}</el-descriptions-item>
        <el-descriptions-item label="巡检人">
          <span v-if="currentInspector">{{ currentInspector.name }}（{{ currentInspector.role }}，{{ currentInspector.phone }}）</span>
          <span v-else>-</span>
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
.config-form { max-width:720px; }
</style>
