<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { INSPECTION_PERSON_CONFIG_GROUPS, getInspectionPersonConfig, getInspectorById, inspectorCandidates, saveInspectionPersonConfig } from '../../composables/useInspectionPersonConfig'
const { laborProjectId, projectLabel } = useCurrentProject()
const category = ref('安全'), isEditing = ref(false)
const form = reactive({})
const fields = computed(() => [
  { key: 'inspectorId', label: '巡检人' },
  { key: 'rectifierId', label: '施工单位整改人', multiple: true },
  ...(category.value === '质量' ? [{ key: 'contractorManagerId', label: '施工单位项目经理（A级验收）' }] : []),
  { key: 'reviewerId', label: '监理单位复核人', multiple: true },
  ...(category.value === '质量' ? [{ key: 'directorId', label: '监理单位项目总监（A级验收）' }] : []),
  { key: 'managerId', label: category.value === '质量' ? '指挥部项目经理（审批）' : '项目经理（审批）' },
])
function load() {
  const config = getInspectionPersonConfig(laborProjectId.value, category.value) || {}
  Object.assign(form, config, { rectifierId: [...(config.rectifierId || [])], reviewerId: [...(config.reviewerId || [])] })
  isEditing.value = false
}
watch([laborProjectId, category], load, { immediate: true })
function label(id) {
  if (Array.isArray(id)) return id.length ? id.map(label).join('、') : '未配置'
  const person = getInspectorById(id); return person ? `${person.name}（${person.role}）` : '未配置'
}
function save() {
  if (!laborProjectId.value) return ElMessage.warning('请先选择项目')
  const missing = fields.value.find(field => field.multiple ? !form[field.key]?.length : !form[field.key])
  if (missing) return ElMessage.warning('请选择' + missing.label)
  saveInspectionPersonConfig(laborProjectId.value, { ...form }, category.value)
  isEditing.value = false; ElMessage.success(category.value === '质量' ? '质量人员配置已保存，安全、其他配置不受影响' : '安全、其他共用人员配置已保存，质量配置不受影响')
}
</script>
<template>
  <div class="person-config-page">
    <div class="page-head"><h3>人员配置</h3><el-button v-if="!isEditing" type="primary" @click="isEditing = true">编辑</el-button><div v-else><el-button @click="load">取消</el-button><el-button type="primary" @click="save">保存</el-button></div></div>
    <el-radio-group v-model="category" size="large"><el-radio-button v-for="item in INSPECTION_PERSON_CONFIG_GROUPS" :key="item.value" :value="item.value">{{ item.label }}</el-radio-button></el-radio-group>
    <el-alert :closable="false" type="info" :title="category === '质量' ? '质量A级：施工单位整改 → 施工单位项目经理验收 → 监理单位复核 → 监理单位项目总监验收 → 指挥部项目经理审批；B/C级：整改 → 监理复核 → 指挥部项目经理审批。' : '安全、其他共用巡检人、整改人、复核人和项目经理：施工单位整改 → 监理单位复核 → 项目经理审批；质量人员独立配置。'" />
    <el-card shadow="never"><el-descriptions :column="1" border><el-descriptions-item label="项目">{{ projectLabel }}</el-descriptions-item>
      <el-descriptions-item v-for="field in fields" :key="field.key" :label="field.label">
        <el-select v-if="isEditing" v-model="form[field.key]" :multiple="field.multiple" filterable :placeholder="'请选择' + field.label" style="width:100%;max-width:520px"><el-option v-for="person in inspectorCandidates" :key="person.id" :label="label(person.id)" :value="person.id" /></el-select><span v-else>{{ label(form[field.key]) }}</span>
      </el-descriptions-item>
    </el-descriptions></el-card>
  </div>
</template>
<style scoped>.person-config-page { display:flex;flex-direction:column;gap:18px; }.page-head { display:flex;justify-content:space-between;align-items:center; }.page-head h3 { margin:0; }</style>
