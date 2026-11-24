<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getConfiguredPersonLabel,
  getInspectionPersonConfig,
  inspectionPersonIds,
  inspectorCandidates,
  saveInspectionCopyConfig,
} from '../../composables/useInspectionPersonConfig'

const router = useRouter()
const { isHqSelected } = useCurrentProject()
const editingProjectId = ref('')
const drafts = reactive({})
const columns = [
  { category: '安全', key: 'issueCcIds', label: '安全下发整改单抄送人' },
  { category: '质量', key: 'issueCcIds', label: '质量下发整改单抄送人' },
  { category: '安全', key: 'completionCcIds', label: '安全整改完成抄送人' },
  { category: '质量', key: 'completionCcIds', label: '质量整改完成抄送人' },
]
const categories = ['安全', '质量']

function edit(projectId) {
  if (!isHqSelected.value || editingProjectId.value) return
  for (const category of categories) {
    const config = getInspectionPersonConfig(projectId, category)
    drafts[category] = Object.fromEntries(columns.filter(column => column.category === category)
      .map(({ key }) => [key, inspectionPersonIds(config?.[key])]))
  }
  editingProjectId.value = projectId
}

function cancel() {
  editingProjectId.value = ''
}

function save(projectId) {
  if (!isHqSelected.value || editingProjectId.value !== projectId) return
  for (const category of categories) saveInspectionCopyConfig(projectId, category, drafts[category])
  cancel()
  ElMessage.success('抄送人配置已保存')
}

function goBack() {
  router.push(isHqSelected.value ? { name: 'InspectionPlan' } : { name: 'Workbench' })
}
watch(isHqSelected, selected => { if (!selected) cancel() })
</script>

<template>
  <div class="copy-config-page">
    <header class="copy-config-header">
      <el-button @click="goBack">‹ 返回</el-button>
      <h3>抄送人配置</h3>
    </header>
    <el-empty v-if="!isHqSelected" description="仅工程指挥部可维护抄送人配置" />
    <section v-else class="copy-config-card" aria-label="项目抄送人配置">
      <p class="copy-config-tip">安全配置也适用于其他类隐患。抄送人可多选或留空，保存后自动带入新整改单。</p>
      <el-table :data="COC_PROJECT_OPTIONS" row-key="id" border stripe>
        <el-table-column prop="label" label="项目名称" min-width="155">
          <template #default="{ row }"><span :title="row.fullName || row.label">{{ row.label }}</span></template>
        </el-table-column>
        <el-table-column
          v-for="column in columns"
          :key="column.label"
          :label="column.label"
          min-width="185"
        >
          <template #default="{ row }">
            <el-select
              v-if="row.id === editingProjectId"
              v-model="drafts[column.category][column.key]"
              :aria-label="column.label"
              placeholder="请选择人员"
              multiple
              filterable
              clearable
            >
              <el-option v-for="person in inspectorCandidates" :key="person.id" :label="`${person.name}（${person.role}）`" :value="person.id" />
            </el-select>
            <span v-else class="copy-recipient-text">{{ getConfiguredPersonLabel(row.id, column.category, column.key) || '未配置' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.id === editingProjectId">
              <el-button link type="primary" @click="save(row.id)">保存</el-button>
              <el-button link @click="cancel">取消</el-button>
            </template>
            <el-button v-else link type="primary" :disabled="!!editingProjectId" @click="edit(row.id)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.copy-config-page { display: grid; gap: 16px; }
.copy-config-header { display: flex; align-items: center; gap: 12px; }
.copy-config-header h3 { margin: 0; font-size: 18px; }
.copy-config-card { min-width: 0; padding: 16px; background: var(--ap-card, #fff); border: 1px solid var(--ap-border, #e4e7ee); border-radius: 8px; }
.copy-config-tip { margin: 0 0 12px; color: var(--ap-text-muted, #606266); line-height: 1.6; }
.copy-recipient-text { overflow-wrap: anywhere; }
.el-select { width: 100%; }
</style>
