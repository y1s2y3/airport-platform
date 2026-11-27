<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getConfiguredPersonLabel,
  getInspectionPersonConfig,
  inspectionPersonIds,
  listInspectionPersonCandidates,
  saveInspectionCopyConfig,
} from '../../composables/useInspectionPersonConfig'
import { getInspectionVoidConfig, inspectionVoidApproverOptions, saveInspectionVoidConfig } from '../../composables/useInspectionVoidConfig'

const { isHqSelected } = useCurrentProject()
const editingProjectId = ref('')
const drafts = reactive({})
const columns = [
  { category: '安全', key: 'issueCcIds', label: '安全/其他下发整改单抄送人' },
  { category: '质量', key: 'issueCcIds', label: '质量下发整改单抄送人' },
  { category: '安全', key: 'completionCcIds', label: '安全/其他整改完成抄送人' },
  { category: '质量', key: 'completionCcIds', label: '质量整改完成抄送人' },
]
const categories = ['安全', '质量']
const projectKeyword = ref('')
const recipientKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const filteredProjects = computed(() => {
  const projectQuery = projectKeyword.value.trim().toLowerCase()
  const recipientQuery = recipientKeyword.value.trim().toLowerCase()
  return COC_PROJECT_OPTIONS.filter(project => {
    if (projectQuery && ![project.label, project.fullName].join(' ').toLowerCase().includes(projectQuery)) return false
    return !recipientQuery || columns.some(column =>
      getConfiguredPersonLabel(project.id, column.category, column.key).toLowerCase().includes(recipientQuery),
    )
  })
})
const pagedProjects = computed(() => {
  const offset = (currentPage.value - 1) * pageSize.value
  return filteredProjects.value.slice(offset, offset + pageSize.value)
})
watch([projectKeyword, recipientKeyword, pageSize], () => { currentPage.value = 1 })
watch(() => filteredProjects.value.length, total => {
  currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(total / pageSize.value)))
})

const voidApprovers = computed(inspectionVoidApproverOptions)
const voidDraft = reactive(getInspectionVoidConfig())

function saveVoidApprovers() {
  if (!isHqSelected.value) return
  try {
    if (!saveInspectionVoidConfig(voidDraft)) return ElMessage.warning('请分别选择安全/其他、质量的作废审批人')
    ElMessage.success('作废审批人配置已保存')
  } catch {
    ElMessage.error('保存失败，请重试')
  }
}

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
  ElMessage.success('人员配置已保存')
}

watch(isHqSelected, selected => {
  cancel()
  if (selected) Object.assign(voidDraft, getInspectionVoidConfig())
})
</script>

<template>
  <div class="copy-config-page">
    <header class="copy-config-header">
      <h3>人员配置</h3>
    </header>
    <el-empty v-if="!isHqSelected" description="仅工程指挥部可维护抄送人和作废审批人" />
    <template v-else>
    <section class="copy-config-card" aria-label="作废审批人配置">
      <h4>作废审批人</h4>
      <p class="copy-config-tip">两组各选一名工程指挥部人员，配置适用于所有项目。新申请按整改单分类送审。</p>
      <el-form class="config-filters" inline @submit.prevent="saveVoidApprovers">
        <el-form-item required label="安全/其他作废审批人">
          <el-select v-model="voidDraft['安全']" filterable placeholder="请选择审批人">
            <el-option v-for="person in voidApprovers" :key="person.id" :label="person.label" :value="person.id" />
          </el-select>
        </el-form-item>
        <el-form-item required label="质量作废审批人">
          <el-select v-model="voidDraft['质量']" filterable placeholder="请选择审批人">
            <el-option v-for="person in voidApprovers" :key="person.id" :label="person.label" :value="person.id" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" native-type="submit">保存审批人</el-button></el-form-item>
      </el-form>
    </section>
    <section class="copy-config-card" aria-label="项目抄送人">
      <h4>项目抄送人</h4>
      <p class="copy-config-tip">按项目配置四组名单。每组可多选或留空，保存后自动带入新整改单。</p>
      <el-form class="config-filters" inline @submit.prevent>
        <el-form-item label="项目名称">
          <el-input v-model="projectKeyword" :disabled="!!editingProjectId" placeholder="搜索项目名称" clearable />
        </el-form-item>
        <el-form-item label="抄送人">
          <el-input v-model="recipientKeyword" :disabled="!!editingProjectId" placeholder="搜索抄送人姓名" clearable />
        </el-form-item>
        <el-form-item>
          <el-button :disabled="!!editingProjectId" @click="projectKeyword = ''; recipientKeyword = ''">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="pagedProjects" row-key="id" border stripe>
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
              <el-option v-for="person in listInspectionPersonCandidates()" :key="person.id" :label="`${person.name}（${person.role}）`" :value="person.id" />
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
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="filteredProjects.length"
        :disabled="!!editingProjectId"
        layout="total, sizes, prev, pager, next"
        class="config-pagination"
      />
    </section>
    </template>
  </div>
</template>

<style scoped>
.copy-config-page { display: grid; gap: 16px; }
.copy-config-header { display: flex; align-items: center; gap: 12px; }
.copy-config-header h3 { margin: 0; font-size: 18px; }
.copy-config-card { min-width: 0; padding: 16px; background: var(--ap-card, #fff); border: 1px solid var(--ap-border, #e4e7ee); border-radius: 8px; }
.copy-config-card h4 { margin: 0 0 12px; font-size: 16px; }
.copy-config-tip { margin: 0 0 12px; color: var(--ap-text-muted, #606266); line-height: 1.6; }
.copy-recipient-text { overflow-wrap: anywhere; }
.config-filters .el-select { width: 250px; }
.config-filters .el-input { width: 200px; }
.config-pagination { justify-content: flex-end; margin-top: 16px; }
.el-select { width: 100%; }
</style>
