<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { getProjectPersonnel } from '../../mock/laborRealName.js'
import { createMajorHazardIdentificationTodo } from '../../mock/personalCenter.js'
import {
  MAJOR_HAZARD_APPROVERS,
  ensureMajorHazardData,
  flattenCategories,
  getControlPointsForDescription,
  getMajorHazardData,
  saveIdentification,
} from '../../utils/majorHazardManualStorage.js'

const route = useRoute()
const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ categories: [], descriptions: [], controlPoints: [], identifications: [] })
const form = ref(blankForm())
const formTab = ref('all')
const pointDialogVisible = ref(false)
const pointDialogRows = ref([])
const pointDialogName = ref('')
const recordId = computed(() => String(route.params.id || ''))
const isNew = computed(() => !recordId.value)
const canEdit = computed(() => isNew.value || ['草稿', '已驳回'].includes(form.value.approvalStatus))
const categories = computed(() => flattenCategories(data.value.categories))
const selectedItems = computed(() => form.value.items.filter((item) => item.conclusion === '√'))
const approverOptions = (kind) => MAJOR_HAZARD_APPROVERS.filter((item) => item.kind === kind).map((item) => ({ id: item.id, label: `${item.name}（${item.post}）` }))
const supervisorApprovers = computed(() => approverOptions('supervisor'))
const projectManagerApprovers = computed(() => approverOptions('pm'))

/** 辨识人下拉：取本项目在岗实名制人员；无实名制数据的项目用默认人员兜底 */
const FALLBACK_IDENTIFIERS = ['张工（项目技术负责人）', '王工（安全员）', '李工（施工员）', '陈静（安全员）', '吴敏（测量员）']
const identifierOptions = computed(() => {
  const list = getProjectPersonnel(projectId.value)
    .filter((person) => person.entry_status === '在岗')
    .map((person) => {
      const name = person.basic?.name || '未命名人员'
      const position = person.unit?.work_type || person.basic?.category || '人员'
      return `${name}（${String(position).replace(/^特种-/, '')}）`
    })
  return list.length ? list : FALLBACK_IDENTIFIERS
})

function blankForm(row = {}) {
  return { id: '', categoryId: '', categoryName: '', identifiedBy: '', identifiedAt: new Date().toISOString().slice(0, 10), approvalStatus: '草稿', remark: '', supervisorApproverId: '', projectManagerApproverId: '', items: [], ...row }
}
function load() {
  if (!projectId.value) { data.value = { categories: [], descriptions: [], controlPoints: [], identifications: [] }; return }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
  if (isNew.value) {
    form.value = blankForm()
  } else {
    const record = data.value.identifications.find((item) => item.id === recordId.value)
    if (!record) { ElMessage.warning('未找到该危大辨识记录'); router.replace('/major-hazard/identification'); return }
    form.value = blankForm(record)
  }
  formTab.value = 'all'
}
function setCategory(categoryId) {
  const category = categories.value.find((item) => item.id === categoryId)
  form.value.categoryId = categoryId
  form.value.categoryName = category?.name || ''
  form.value.items = data.value.descriptions.filter((item) => item.categoryId === categoryId).map((item) => ({ id: item.id, description: item.description, isSuperMajor: item.isSuperMajor, needMonitoring: item.needMonitoring, conclusion: '×', plannedStart: '', plannedEnd: '' }))
}
function pointsOf(descriptionId, categoryId) { return getControlPointsForDescription(data.value, { id: descriptionId, categoryId }) }
function openPointDialog(row) {
  pointDialogName.value = row.description || '类别描述'
  pointDialogRows.value = pointsOf(row.id, form.value.categoryId)
  pointDialogVisible.value = true
}
function validateForm() {
  if (!form.value.categoryId || !form.value.identifiedBy.trim()) return '请选择危大工程类别并填写辨识人'
  if (!form.value.supervisorApproverId || !form.value.projectManagerApproverId) return '请配置监理单位审批人与项目经理审批人'
  const invalid = form.value.items.find((item) => item.conclusion === '√' && (!item.plannedStart || !item.plannedEnd))
  return invalid ? '辨识结论为“√”的数据必须填写计划施工起止时间' : ''
}
function persist(status) {
  const message = validateForm()
  if (message) { ElMessage.warning(message); return }
  const saved = saveIdentification(projectId.value, { ...form.value, approvalStatus: status })
  if (status === '审批中') {
    createMajorHazardIdentificationTodo({
      projectId: projectId.value,
      projectName: headerProjectLabel.value,
      identification: saved,
    })
  }
  ElMessage.success(status === '审批中' ? '已发起审批' : '辨识记录已保存')
  router.push('/major-hazard/identification')
}
function back() { router.push('/major-hazard/identification') }
function tagType(status) { return status === '已通过' ? 'success' : status === '已驳回' ? 'danger' : status === '审批中' ? 'warning' : 'info' }

watch([projectId, recordId], load, { immediate: true })
</script>

<template>
  <div class="identify-form-page page-card">
    <template v-if="projectId">
      <div class="page-header"><el-button text :icon="ArrowLeft" @click="back">返回危大辨识</el-button><div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 危大辨识 / {{ isNew ? '新增' : '详情' }}</div><div class="title-row"><h1 class="page-title">{{ isNew ? '新增危大工程清单辨识记录' : '危大工程清单辨识记录' }}</h1><el-tag v-if="!isNew" :type="tagType(form.approvalStatus)">{{ form.approvalStatus }}</el-tag></div><p class="page-scope">当前项目：{{ headerProjectLabel }}</p></div>
      <el-card shadow="never" class="form-card">
        <el-form label-width="116px" class="identify-form"><el-row :gutter="20"><el-col :span="12"><el-form-item label="危大工程类别" required><el-select :model-value="form.categoryId" filterable style="width:100%" :disabled="!canEdit" @update:model-value="setCategory"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="辨识人" required><el-select v-model="form.identifiedBy" filterable clearable placeholder="请选择辨识人" style="width:100%" :disabled="!canEdit"><el-option v-for="item in identifierOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="辨识时间"><el-date-picker v-model="form.identifiedAt" type="date" value-format="YYYY-MM-DD" style="width:100%" :disabled="!canEdit" /></el-form-item></el-col><el-col :span="12"><el-form-item label="备注"><el-input v-model="form.remark" :disabled="!canEdit" /></el-form-item></el-col></el-row></el-form>
        <el-tabs v-model="formTab">
          <el-tab-pane label="全部" name="all">
            <el-table :data="form.items" border empty-text="请先选择危大工程类别">
              <el-table-column type="index" label="序号" width="56" />
              <el-table-column prop="description" label="类别描述" min-width="360" />
              <el-table-column prop="isSuperMajor" label="是否超危" width="100" />
              <el-table-column label="本次辨识结论" width="150">
                <template #default="{ row }">
                  <el-select v-model="row.conclusion" :disabled="!canEdit">
                    <el-option label="√" value="√" />
                    <el-option label="×" value="×" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="计划施工起止时间" label-class-name="plan-date-header" width="310">
                <template #default="{ row }">
                  <div v-if="row.conclusion === '√'" class="plan-date-edit">
                    <el-date-picker v-model="row.plannedStart" type="date" value-format="YYYY-MM-DD" placeholder="开始" :disabled="!canEdit" />
                    <span class="date-separator">至</span>
                    <el-date-picker v-model="row.plannedEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束" :disabled="!canEdit" />
                  </div>
                  <span v-else>—</span>
                </template>
              </el-table-column>
              <el-table-column label="管控要点" width="100" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openPointDialog(row)">{{ pointsOf(row.id, form.categoryId).length }}</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`已辨识出危大工程（${selectedItems.length}）`" name="selected">
            <el-table :data="selectedItems" border>
              <el-table-column type="index" label="序号" width="56" />
              <el-table-column prop="description" label="类别描述" min-width="420" />
              <el-table-column prop="isSuperMajor" label="是否超危" width="110" />
              <el-table-column label="计划施工起止时间" label-class-name="plan-date-header" width="240">
                <template #default="{ row }"><span class="plan-date-text">{{ row.plannedStart }} 至 {{ row.plannedEnd }}</span></template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
        <div class="approver-config">
          <div class="approver-config-title">审批人配置</div>
          <el-form label-width="116px" class="identify-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="监理单位审批" required>
                  <el-select v-model="form.supervisorApproverId" filterable placeholder="请选择监理单位审批人（姓名+岗位）" style="width:100%" :disabled="!canEdit">
                    <el-option v-for="item in supervisorApprovers" :key="item.id" :label="item.label" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="项目经理审批" required>
                  <el-select v-model="form.projectManagerApproverId" filterable placeholder="请选择项目经理审批人（姓名+岗位）" style="width:100%" :disabled="!canEdit">
                    <el-option v-for="item in projectManagerApprovers" :key="item.id" :label="item.label" :value="item.id" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-card>
      <el-dialog v-model="pointDialogVisible" :title="`${pointDialogName} · 管控要点`" width="980px" destroy-on-close>
        <el-table :data="pointDialogRows" border stripe size="small" empty-text="暂无管控要点">
          <el-table-column type="index" label="序号" width="56" />
          <el-table-column prop="content" label="管控内容" min-width="360" />
          <el-table-column label="显示状态（红）" width="150"><template #default="{ row }"><el-tag type="danger">{{ row.redStatusText || '未落实' }}</el-tag></template></el-table-column>
          <el-table-column label="显示状态（绿）" width="150"><template #default="{ row }"><el-tag type="success">{{ row.greenStatusText || '已落实' }}</el-tag></template></el-table-column>
        </el-table>
        <template #footer><el-button type="primary" @click="pointDialogVisible = false">关闭</el-button></template>
      </el-dialog>
      <div class="page-actions"><el-button @click="back">{{ canEdit ? '取消' : '返回' }}</el-button><template v-if="canEdit"><el-button type="primary" @click="persist('审批中')">提交审批</el-button></template></div>
    </template>
    <el-empty v-else description="危大辨识仅支持项目级使用，请切换至具体项目。" />
  </div>
</template>

<style scoped>
.identify-form-page{padding:20px 24px 32px}.page-header{margin-bottom:16px}.page-breadcrumb,.page-scope,.muted{font-size:13px;color:var(--ap-text-muted);margin:7px 0}.title-row{display:flex;align-items:center;gap:10px}.page-title{font-size:20px;font-weight:600;margin:0}.form-card{min-height:420px}.identify-form{padding:4px 8px 10px}.plan-date-edit{display:flex;align-items:center;flex-wrap:nowrap;white-space:nowrap}.plan-date-edit :deep(.el-date-editor){width:132px;flex:0 0 132px}.date-separator{display:inline-block;flex:0 0 auto;padding:0 4px}.plan-date-text{white-space:nowrap}.plan-date-header :deep(.cell){white-space:nowrap}.point-line{margin:0 0 8px;line-height:1.55;font-size:13px}.page-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.approver-config{margin-top:18px;padding-top:16px;border-top:1px solid var(--ap-border-color,#ebeef5)}.approver-config-title{margin-bottom:12px;padding-left:9px;border-left:3px solid #2563eb;color:#273142;font-size:15px;font-weight:650}
</style>
