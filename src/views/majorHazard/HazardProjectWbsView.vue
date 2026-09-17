<script setup>
import { computed, ref, watch } from 'vue'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  buildLedgerRows,
  buildMajorHazardWbsTree,
  ensureMajorHazardData,
  getMajorHazardData,
  getMajorHazardWbsPath,
  removeMajorHazardWbsNode,
  saveMajorHazardWbsNode,
} from '../../utils/majorHazardManualStorage.js'

const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ wbsNodes: [], ledgers: [], identifications: [] })
const selectedId = ref('')
const dialogVisible = ref(false)
const form = ref(blankForm())

const treeData = computed(() => buildMajorHazardWbsTree(data.value))

function blankForm(row = {}) { return { id: '', code: '', name: '', parentId: '', type: '单体', sortNo: 0, ...row } }
function load() {
  if (!projectId.value) { data.value = { wbsNodes: [], ledgers: [], identifications: [] }; return }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
  if (!(data.value.wbsNodes || []).some((item) => item.id === selectedId.value)) selectedId.value = data.value.wbsNodes?.find((item) => !item.parentId)?.id || ''
}
function typeLabel(row) { return row.parentId ? '单体' : '项目' }
function pathOf(id) { return getMajorHazardWbsPath(data.value, id) || '—' }
function nextCode(parentId) {
  const parent = (data.value.wbsNodes || []).find((item) => item.id === parentId)
  const siblings = (data.value.wbsNodes || []).filter((item) => item.parentId === parentId)
  const order = Math.max(0, ...siblings.map((item) => Number(item.sortNo) || 0)) + 1
  return `${parent?.code || 'WBS'}-${String(order).padStart(2, '0')}`
}
function selectRow(row) { if (row) selectedId.value = row.id }
function openCreate() {
  const parentId = selectedId.value || data.value.wbsNodes?.find((item) => !item.parentId)?.id || ''
  form.value = blankForm({ parentId, code: nextCode(parentId), sortNo: (data.value.wbsNodes || []).filter((item) => item.parentId === parentId).length + 1 })
  dialogVisible.value = true
}
function openEdit(row) { form.value = blankForm(row); dialogVisible.value = true }
function submit() {
  if (!form.value.name.trim()) { ElMessage.warning('请填写节点名称'); return }
  const duplicate = data.value.wbsNodes.some((item) => item.code === form.value.code && item.id !== form.value.id)
  if (duplicate) { ElMessage.warning('WBS 编码不可重复'); return }
  saveMajorHazardWbsNode(projectId.value, { ...form.value, type: form.value.parentId ? '单体' : '项目' })
  load(); dialogVisible.value = false; ElMessage.success(form.value.id ? '项目 WBS 已更新' : '项目 WBS 已新增')
}
function usedByLedger(row) { return buildLedgerRows(data.value).some((ledger) => (ledger.parts || []).some((part) => part.wbsNodeId === row.id)) }
function remove(row) {
  if (!row.parentId) { ElMessage.warning('项目根节点不可删除'); return }
  if ((data.value.wbsNodes || []).some((item) => item.parentId === row.id)) { ElMessage.warning('该 WBS 节点存在子级，不能删除'); return }
  if (usedByLedger(row)) { ElMessage.warning('该 WBS 节点已被危大清单施工部位引用，不能删除'); return }
  ElMessageBox.confirm(`确定删除 WBS 节点“${row.name}”？`, '删除确认', { type: 'warning' }).then(() => { removeMajorHazardWbsNode(projectId.value, row.id); load(); ElMessage.success('删除成功') }).catch(() => {})
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="project-wbs-page page-card">
    <template v-if="projectId">
      <div class="page-header"><div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 项目 WBS</div><span class="project-name">当前项目：{{ headerProjectLabel }}</span></div>
      <div class="toolbar"><el-button type="primary" size="small" :icon="Plus" @click="openCreate">新增</el-button></div>
      <el-table :data="treeData" row-key="id" default-expand-all :tree-props="{ children: 'children' }" border stripe highlight-current-row empty-text="暂无项目 WBS 数据" @current-change="selectRow">
        <el-table-column prop="name" label="节点名称" min-width="430"><template #default="{ row }"><span :title="pathOf(row.id)">{{ row.name }}</span></template></el-table-column>
        <el-table-column label="类型" width="180"><template #default="{ row }">{{ typeLabel(row) }}</template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="Edit" @click.stop="openEdit(row)">编辑</el-button><el-button link type="danger" :icon="Delete" @click.stop="remove(row)">删除</el-button></template></el-table-column>
      </el-table>
    </template>
    <el-empty v-else description="项目 WBS 仅支持项目级使用，请切换至具体项目。" />

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑项目WBS' : '新增项目WBS'" width="560px" destroy-on-close>
      <el-form label-width="104px" class="wbs-form"><el-form-item label="上级节点"><el-input :model-value="form.parentId ? pathOf(form.parentId) : '顶级节点'" disabled /></el-form-item><el-form-item label="节点名称" required><el-input v-model="form.name" placeholder="请输入节点名称" /></el-form-item><el-form-item label="排序编号" required><el-input-number v-model="form.sortNo" :min="0" controls-position="right" style="width:100%" /></el-form-item></el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="submit">提交</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.project-wbs-page{padding:18px 22px 32px}.page-header{display:flex;align-items:center;gap:18px;margin-bottom:14px}.page-breadcrumb,.project-name{font-size:13px;color:var(--ap-text-muted)}.project-name{margin-left:auto}.toolbar{display:flex;justify-content:flex-end;margin-bottom:10px}.wbs-form{padding:6px 8px 8px}
</style>
