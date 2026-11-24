<script setup>
import { reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  INSPECTION_PERSON_CONFIG_GROUPS,
  getInspectionPersonConfig,
  getInspectorById,
  inspectionPersonIds,
  inspectorCandidates,
  saveInspectionPersonConfig,
} from '../../composables/useInspectionPersonConfig'

const { laborProjectId, projectLabel } = useCurrentProject()

const sections = INSPECTION_PERSON_CONFIG_GROUPS.map(({ value, label }) => ({
  category: value,
  label,
  state: reactive({ editing: false, form: {} }),
  roles: [
    { key: 'inspectorId', label: '巡检人' },
    { key: 'rectifierId', label: '施工单位整改人', multiple: true },
    { key: 'contractorManagerId', label: '施工单位项目经理', scope: value === '质量' ? 'A级验收' : '重大隐患验收' },
    { key: 'reviewerId', label: '监理单位复核人', multiple: true },
    { key: 'directorId', label: '监理单位项目总监', scope: value === '质量' ? 'A级验收' : '重大隐患验收' },
    { key: 'managerId', label: '指挥部项目经理' },
    { key: 'departmentHeadId', label: '项目部长', scope: value === '质量' ? 'A级确认' : '重大隐患确认' },
  ],
}))

const personLabel = person => person ? `${person.name}（${person.role}）` : ''
const peopleLabels = value => inspectionPersonIds(value).map(id => personLabel(getInspectorById(id))).filter(Boolean)

function load(section) {
  const config = getInspectionPersonConfig(laborProjectId.value, section.category) || {}
  section.state.form = Object.fromEntries(section.roles.map(field =>
    [field.key, field.multiple ? inspectionPersonIds(config[field.key]) : config[field.key] || ''],
  ))
  section.state.editing = false
}
watch(laborProjectId, () => sections.forEach(load), { immediate: true })

function save(section) {
  if (!laborProjectId.value) return ElMessage.warning('请先选择项目')
  const missing = section.roles.find(field => !inspectionPersonIds(section.state.form[field.key]).length)
  if (missing) return ElMessage.warning('请选择' + missing.label)
  saveInspectionPersonConfig(laborProjectId.value, section.state.form, section.category)
  load(section)
  ElMessage.success(section.label + '人员配置已保存')
}
</script>

<template>
  <div class="person-config-page">
    <header class="page-heading">
      <h3>人员配置</h3>
      <p>{{ projectLabel }}</p>
    </header>
    <div class="config-grid">
      <section v-for="section in sections" :key="section.category" class="config-card">
        <header class="card-heading">
          <h4>{{ section.label }}</h4>
          <el-button v-if="!section.state.editing" size="small" @click="section.state.editing = true">编辑</el-button>
          <div v-else>
            <el-button size="small" @click="load(section)">取消</el-button>
            <el-button size="small" type="primary" @click="save(section)">保存</el-button>
          </div>
        </header>
        <div class="config-group">
          <h5>流程办理人</h5>
          <dl>
            <div v-for="field in section.roles" :key="field.key" class="config-row">
              <dt>{{ field.label }} <span v-if="field.scope" class="role-scope">{{ field.scope }}</span></dt>
              <dd>
                <el-select
                  v-if="section.state.editing"
                  v-model="section.state.form[field.key]"
                  :aria-label="field.label"
                  :multiple="field.multiple"
                  filterable
                  placeholder="请选择人员"
                >
                  <el-option v-for="person in inspectorCandidates" :key="person.id" :label="personLabel(person)" :value="person.id" />
                </el-select>
                <ul v-else-if="peopleLabels(section.state.form[field.key]).length">
                  <li v-for="label in peopleLabels(section.state.form[field.key])" :key="label">{{ label }}</li>
                </ul>
                <span v-else class="empty-value">未配置</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.person-config-page { color: #252a34; }
.page-heading h3 { margin: 0; font-size: 20px; }
.page-heading p { margin: 7px 0 18px; color: #616975; }
.config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; align-items: start; }
.config-card { min-width: 0; background: #fff; border: 1px solid #e4e7ee; border-radius: 12px; }
.card-heading { display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: 0 20px; border-bottom: 1px solid #e4e7ee; }
.card-heading h4 { margin: 0; font-size: 17px; }
.config-group { padding: 16px 20px 10px; }
.config-group h5 { margin: 0 0 8px; font-size: 13px; color: #505967; }
.config-group dl { margin: 0; }
.config-row { display: grid; grid-template-columns: minmax(125px, 42%) minmax(0, 1fr); align-items: start; gap: 12px; padding: 9px 0; line-height: 1.45; }
.config-row + .config-row { border-top: 1px solid #f0f1f4; }
.config-row dt { color: #505967; }
.config-row dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.config-row ul { list-style: none; margin: 0; padding: 0; }
.config-row li + li { margin-top: 4px; }
.role-scope { display: block; font-size: 12px; color: #697484; }
.empty-value { color: #697484; }
</style>
