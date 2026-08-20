<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { buildProjects, getProjectManagementPersonnel } from '../../coc/mock/data.js'
import { projectTree, getProjectLabel } from '../../mock/laborRealName.js'
import { useLaborProjectScope } from '../../composables/useCurrentProject.js'
import {
  getPatrolDevices,
  savePatrolDevice,
  emptyPatrolDevice,
} from '../../utils/cocAdminDeviceStorage.js'

defineProps({
  title: { type: String, default: '巡检仪管理' },
  description: { type: String, default: '' },
})

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } =
  useLaborProjectScope()

const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const form = ref(emptyPatrolDevice())

const projectOptions = buildProjects().map((p) => ({
  id: p.id,
  shortName: p.shortName || p.name,
}))

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: item.label.replace(/\(\d+\)$/, ''),
    })),
  })),
)

function getScopeProjectMatchers(scopeProjectId) {
  const labels = new Set()
  const laborLabel = getProjectLabel(scopeProjectId)
  if (laborLabel) labels.add(laborLabel)
  const cocProject = buildProjects().find((p) => p.id === scopeProjectId)
  if (cocProject) {
    if (cocProject.shortName) labels.add(cocProject.shortName)
    if (cocProject.name) labels.add(cocProject.name)
  }
  return [...labels]
}

function deviceMatchesScope(deviceProject, scopeProjectId) {
  if (!scopeProjectId) return true
  const projectName = String(deviceProject || '').trim()
  if (!projectName) return false
  return getScopeProjectMatchers(scopeProjectId).some((label) => {
    const scopeLabel = String(label || '').trim()
    return (
      projectName === scopeLabel
      || scopeLabel.includes(projectName)
      || projectName.includes(scopeLabel)
    )
  })
}

function resolveProjectByShortName(shortName) {
  if (!shortName?.trim()) return null
  return buildProjects().find((p) => p.shortName === shortName || p.name === shortName) || null
}

function buildBindPersonOptions(projectShortName) {
  const project = resolveProjectByShortName(projectShortName)
  if (!project) return []
  const seen = new Set()
  const options = []

  const pushOption = (name, role) => {
    if (!name?.trim()) return
    const label = role?.trim() ? `${name.trim()}（${role.trim()}）` : name.trim()
    if (seen.has(label)) return
    seen.add(label)
    options.push({ value: label, label })
  }

  ;(project.personnel || []).forEach((person) => {
    pushOption(person.name, person.role || person.position)
  })
  getProjectManagementPersonnel(project.id).forEach((person) => {
    pushOption(person.name, person.role)
  })

  return options
}

const bindPersonOptions = computed(() => buildBindPersonOptions(form.value.project))

const scopedList = computed(() => {
  if (!isHqSelected.value) return list.value
  return list.value.filter((row) => deviceMatchesScope(row.project, scopeProjectId.value))
})

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return scopedList.value
  return scopedList.value.filter((row) =>
    [row.id, row.deviceCode, row.name, row.project, row.bindPerson].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getPatrolDevices()
}

function defaultFormProject() {
  if (!isHqSelected.value) return ''
  const cocProject = buildProjects().find((p) => p.id === scopeProjectId.value)
  return cocProject?.shortName || scopeProjectLabel.value || ''
}

function openCreate() {
  form.value = emptyPatrolDevice({ project: defaultFormProject() })
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptyPatrolDevice(row)
  formVisible.value = true
}

function submitForm() {
  if (!form.value.deviceCode?.trim()) {
    ElMessage.warning('请填写设备编码')
    return
  }
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写设备名称')
    return
  }
  if (!form.value.project?.trim()) {
    ElMessage.warning('请选择绑定项目')
    return
  }
  if (!form.value.deviceAccount?.trim()) {
    ElMessage.warning('请填写设备账号')
    return
  }
  if (!form.value.devicePassword) {
    ElMessage.warning('请填写设备密码')
    return
  }
  savePatrolDevice({
    ...form.value,
    deviceCode: form.value.deviceCode.trim(),
    name: form.value.name.trim(),
    project: form.value.project.trim(),
    bindPerson: form.value.bindPerson?.trim() || '',
    deviceAccount: form.value.deviceAccount.trim(),
    devicePassword: form.value.devicePassword,
  })
  load()
  formVisible.value = false
  ElMessage.success('巡检仪信息已保存')
}

watch(
  () => form.value.project,
  (next, prev) => {
    if (!prev || next === prev) return
    const allowed = new Set(bindPersonOptions.value.map((item) => item.value))
    if (form.value.bindPerson && !allowed.has(form.value.bindPerson)) {
      form.value.bindPerson = ''
    }
  },
)

watch(scopeProjectId, () => {
  if (isHqSelected.value) keyword.value = ''
})

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-input v-model="keyword" placeholder="搜索编号、编码、项目、人员…" clearable class="search-input" aria-label="搜索编号、编码、项目、人员…"/>
        <el-button type="primary" :icon="Plus" @click="openCreate">注册设备</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>

      <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
        <aside v-if="isHqSelected" class="project-tree-panel">
          <div class="tree-panel-title">项目列表</div>
          <el-tree
            :data="treeData"
            node-key="id"
            highlight-current
            default-expand-all
            :current-node-key="treeProjectId"
            :expand-on-click-node="false"
            class="project-tree"
            @node-click="onTreeNodeClick"
          />
        </aside>

        <section class="content-panel">
          <div v-if="isHqSelected" class="content-panel-title">{{ scopeProjectLabel || '请选择项目' }}</div>

          <el-table :data="filtered" stripe border empty-text="暂无巡检仪设备">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="id" label="设备编号" width="120" />
            <el-table-column prop="deviceCode" label="设备编码" width="128" show-overflow-tooltip />
            <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="project" label="绑定项目" width="120" />
            <el-table-column prop="bindPerson" label="绑定人员" min-width="140" show-overflow-tooltip />
            <el-table-column label="在线状态" width="96">
              <template #default="{ row }">
                <el-tag :type="row.online ? 'success' : 'info'" size="small">
                  {{ row.online ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastOnline" label="最近在线" width="148" />
            <el-table-column label="操作" width="88" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </div>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑巡检仪' : '注册巡检仪'" width="520px">
      <el-form label-width="96px" autocomplete="off">
        <el-form-item v-if="form.id" label="设备编号">
          <el-input :model-value="form.id" disabled />
        </el-form-item>
        <el-form-item label="设备编码" required>
          <el-input v-model="form.deviceCode" placeholder="如：XJY-20260301" aria-label="如：XJY-20260301"/>
        </el-form-item>
        <el-form-item label="设备名称" required>
          <el-input v-model="form.name" placeholder="如：三跑道东区巡检仪" aria-label="如：三跑道东区巡检仪"/>
        </el-form-item>
        <el-form-item label="绑定项目" required>
          <el-select v-model="form.project" placeholder="选择项目" filterable style="width: 100%" aria-label="选择项目">
            <el-option
              v-for="p in projectOptions"
              :key="p.id"
              :label="p.shortName"
              :value="p.shortName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定人员">
          <el-select
            v-model="form.bindPerson"
            filterable
            clearable
            :disabled="!form.project"
            placeholder="请先选择绑定项目，再选择项目下人员"
            style="width: 100%" aria-label="请先选择绑定项目，再选择项目下人员">
            <el-option
              v-for="item in bindPersonOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备账号" required>
          <el-input
            v-model="form.deviceAccount"
            placeholder="请输入设备账号"
            clearable
            name="patrol-device-account"
            autocomplete="off"
            readonly
            @focus="($event) => $event.target.removeAttribute('readonly')"
          />
        </el-form-item>
        <el-form-item label="设备密码" required>
          <el-input
            v-model="form.devicePassword"
            type="password"
            show-password
            placeholder="请输入设备密码"
            clearable
            name="patrol-device-password"
            autocomplete="new-password"
            readonly
            @focus="($event) => $event.target.removeAttribute('readonly')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.search-input {
  width: 240px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  align-items: start;
}

.project-tree-panel,
.content-panel {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.tree-panel-title,
.content-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.project-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: #ecf5ff;
  color: #409eff;
}
</style>
