<script setup>
import { computed, ref, watch } from 'vue'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  ensureMajorHazardData,
  flattenCategories,
  getControlPointsForDescription,
  getMajorHazardData,
  removeCategory,
  removeCategoryDescription,
  removeControlPoint,
  saveCategory,
  saveCategoryDescription,
  saveControlPoint,
} from '../../utils/majorHazardManualStorage.js'

const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ categories: [], descriptions: [], controlPoints: [] })
const selectedCategoryId = ref('')
const categoryDialog = ref(false)
const descriptionDialog = ref(false)
const pointListVisible = ref(false)
const addingPoint = ref(false)
const pointDraft = ref(null)
const editingPointId = ref('')
const editingPointDraft = ref(null)
const activeDescriptionId = ref('')
const categoryForm = ref(blankCategory())
const descriptionForm = ref(blankDescription())

const selectedCategory = computed(() => flattenCategories(data.value.categories).find((item) => item.id === selectedCategoryId.value) || null)
const descriptions = computed(() => data.value.descriptions.filter((item) => item.categoryId === selectedCategoryId.value))
const selectedDescription = computed(() => data.value.descriptions.find((item) => item.id === activeDescriptionId.value) || null)
const currentPoints = computed(() => (selectedDescription.value ? getControlPointsForDescription(data.value, selectedDescription.value) : []))
const pointTableRows = computed(() => {
  let rows = currentPoints.value
  if (editingPointId.value && editingPointDraft.value) {
    rows = rows.map((row) => (row.id === editingPointId.value ? editingPointDraft.value : row))
  }
  if (addingPoint.value && pointDraft.value) rows = [pointDraft.value, ...rows]
  return rows
})

function blankCategory(row = {}) {
  return { id: '', name: '', ...row }
}
function blankDescription(row = {}) {
  return { id: '', categoryId: selectedCategoryId.value, description: '', isSuperMajor: '否', needMonitoring: '否', ...row }
}
function blankPoint(row = {}) {
  return {
    id: '',
    categoryId: selectedDescription.value?.categoryId || selectedCategoryId.value,
    descriptionId: selectedDescription.value?.id || activeDescriptionId.value,
    classification: '通用',
    content: '',
    displayStatus: 'green',
    redStatusText: '',
    greenStatusText: '',
    ...row,
  }
}

function load() {
  if (!projectId.value) {
    data.value = { categories: [], descriptions: [], controlPoints: [] }
    return
  }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
  const all = flattenCategories(data.value.categories)
  if (!all.some((item) => item.id === selectedCategoryId.value)) selectedCategoryId.value = all[0]?.id || ''
}

function pointCount(row) {
  return getControlPointsForDescription(data.value, row).length
}

function openCategory(row) {
  categoryForm.value = blankCategory(row)
  categoryDialog.value = true
}
function saveCategoryForm() {
  if (!categoryForm.value.name.trim()) {
    ElMessage.warning('请填写工程类别名称')
    return
  }
  saveCategory(projectId.value, categoryForm.value)
  load()
  categoryDialog.value = false
  ElMessage.success('工程类别已保存')
}
function deleteCategory(row) {
  const hasData = data.value.descriptions.some((item) => item.categoryId === row.id)
    || data.value.controlPoints.some((item) => item.categoryId === row.id)
  if (hasData) {
    ElMessage.warning('该类别下存在类别描述或管控要点，不能删除')
    return
  }
  ElMessageBox.confirm(`确定删除工程类别“${row.name}”？`, '删除确认', { type: 'warning' }).then(() => {
    removeCategory(projectId.value, row.id)
    load()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function openDescription(row) {
  descriptionForm.value = blankDescription(row)
  descriptionDialog.value = true
}
function saveDescription() {
  if (!descriptionForm.value.description.trim()) {
    ElMessage.warning('请填写类别描述')
    return
  }
  const payload = { ...descriptionForm.value }
  delete payload.basis
  delete payload.scene
  saveCategoryDescription(projectId.value, payload)
  load()
  descriptionDialog.value = false
  ElMessage.success(descriptionForm.value.id ? '编辑成功' : '新增成功')
}
function deleteDescription(row) {
  ElMessageBox.confirm('确定删除该类别描述？', '删除确认', { type: 'warning' }).then(() => {
    removeCategoryDescription(projectId.value, row.id)
    load()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

function resetPointEdit() {
  addingPoint.value = false
  pointDraft.value = null
  editingPointId.value = ''
  editingPointDraft.value = null
}
function openPoints(row) {
  activeDescriptionId.value = row.id
  resetPointEdit()
  pointListVisible.value = true
}
function startAddPoint() {
  resetPointEdit()
  pointDraft.value = { ...blankPoint(), _isNew: true }
  addingPoint.value = true
}
/** 编辑直接进入表格行内编辑态，与新增一致，不再弹窗 */
function startEditPoint(row) {
  resetPointEdit()
  editingPointId.value = row.id
  editingPointDraft.value = { ...row, _editing: true }
}
function pointDraftInvalid(point) {
  return !point?.content?.trim() || !point?.redStatusText?.trim() || !point?.greenStatusText?.trim()
}
function savePointRow() {
  const draft = addingPoint.value ? pointDraft.value : editingPointDraft.value
  if (pointDraftInvalid(draft)) {
    ElMessage.warning('请完整填写管控内容、显示状态（红）和显示状态（绿）')
    return
  }
  const { _isNew, _editing, ...payload } = draft
  const isNew = addingPoint.value
  saveControlPoint(projectId.value, payload)
  load()
  resetPointEdit()
  ElMessage.success(isNew ? '新增成功' : '编辑成功')
}
function cancelPointRow() {
  resetPointEdit()
}
function deletePoint(row) {
  ElMessageBox.confirm('确定删除该管控要点？', '删除确认', { type: 'warning' }).then(() => {
    removeControlPoint(projectId.value, row.id)
    load()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="dictionary-page page-card">
    <template v-if="projectId">
      <div class="page-header">
        <div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 危大字典</div>
        <div class="page-heading"><h1 class="page-title">危大字典</h1></div>
        <p class="page-scope">当前项目：{{ headerProjectLabel }}</p>
        <p class="page-tip">内置民航专业工程标准库和房建通用补充库；类别描述及项目自定义项统一为危大辨识和危大清单提供基础数据。</p>
      </div>

      <div class="dictionary-layout">
        <aside class="category-panel">
          <div class="panel-heading">
            <strong>工程类别</strong>
            <el-button type="primary" size="small" :icon="Plus" @click="openCategory()">新增类别</el-button>
          </div>
          <el-tree
            :data="data.categories"
            node-key="id"
            :current-node-key="selectedCategoryId"
            default-expand-all
            highlight-current
            :expand-on-click-node="false"
            @node-click="(node) => selectedCategoryId = node.id"
          >
            <template #default="{ data: node }">
              <span class="tree-node">
                <span>{{ node.name }}</span>
                <span class="tree-actions">
                  <el-button link type="primary" :icon="Edit" @click.stop="openCategory(node)" />
                  <el-button link type="danger" :icon="Delete" @click.stop="deleteCategory(node)" />
                </span>
              </span>
            </template>
          </el-tree>
        </aside>

        <section class="dictionary-content">
          <template v-if="selectedCategory">
            <div class="content-title">{{ selectedCategory.name }}配置</div>
            <section class="data-section">
              <div class="section-title">
                <span>类别描述</span>
                <el-button type="primary" size="small" :icon="Plus" @click="openDescription()">新增</el-button>
              </div>
              <el-table :data="descriptions" border stripe size="small" empty-text="暂无类别描述">
                <el-table-column type="index" label="序号" width="56" />
                <el-table-column prop="description" label="类别描述" min-width="360" show-overflow-tooltip />
                <el-table-column prop="isSuperMajor" label="是否超危" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.isSuperMajor === '是' ? 'danger' : 'info'" size="small">{{ row.isSuperMajor }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="needMonitoring" label="是否监测" width="100" />
                <el-table-column label="管控要点数量" width="125" align="center">
                  <template #default="{ row }">
                    <el-link type="primary" :underline="false" title="点击查看/新增管控要点" @click="openPoints(row)">{{ pointCount(row) }}</el-link>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="openDescription(row)">编辑</el-button>
                    <el-button link type="danger" @click="deleteDescription(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </section>
          </template>
          <el-empty v-else description="请先新增工程类别" />
        </section>
      </div>
    </template>
    <el-empty v-else description="危大字典仅支持项目级使用，请切换至具体项目。" />

    <el-dialog v-model="categoryDialog" :title="categoryForm.id ? '编辑工程类别' : '新增工程类别'" width="520px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="类别名称" required>
          <el-input v-model="categoryForm.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCategoryForm">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="descriptionDialog" :title="descriptionForm.id ? '编辑类别描述' : '新增类别描述'" width="640px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="危大工程类别">
          <el-input :model-value="selectedCategory?.name" disabled />
        </el-form-item>
        <el-form-item label="类别描述" required>
          <el-input v-model="descriptionForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="是否超危">
          <el-radio-group v-model="descriptionForm.isSuperMajor">
            <el-radio label="否">否</el-radio>
            <el-radio label="是">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否监测">
          <el-radio-group v-model="descriptionForm.needMonitoring">
            <el-radio label="否">否</el-radio>
            <el-radio label="是">是</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="descriptionDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDescription">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pointListVisible" title="管控要点" width="1100px" top="6vh" destroy-on-close @closed="resetPointEdit">
      <template v-if="selectedDescription">
        <div class="point-scope">
          <div><span>工程类别：</span><strong>{{ selectedCategory?.name || selectedDescription.categoryId }}</strong></div>
          <div><span>类别描述：</span><strong>{{ selectedDescription.description }}</strong></div>
        </div>
        <div class="section-title">
          <span>管控要点（{{ currentPoints.length }}）</span>
          <el-button type="primary" size="small" :icon="Plus" @click="startAddPoint()">新增管控要点</el-button>
        </div>
        <el-table :data="pointTableRows" border stripe size="small" empty-text="暂无管控要点，点击右上角“新增管控要点”添加">
          <el-table-column type="index" label="序号" width="56" />
          <el-table-column label="管控内容" min-width="420" show-overflow-tooltip>
            <template #default="{ row }">
              <el-input v-if="row._isNew || row._editing" v-model="row.content" size="small" placeholder="请填写管控内容" />
              <span v-else>{{ row.content }}</span>
            </template>
          </el-table-column>
          <el-table-column label="显示状态（红）" width="150">
            <template #default="{ row }"><el-input v-if="row._isNew || row._editing" v-model="row.redStatusText" size="small" placeholder="请输入红色状态" /><el-tag v-else type="danger">{{ row.redStatusText || '未落实' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="显示状态（绿）" width="150">
            <template #default="{ row }"><el-input v-if="row._isNew || row._editing" v-model="row.greenStatusText" size="small" placeholder="请输入绿色状态" /><el-tag v-else type="success">{{ row.greenStatusText || '已落实' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <template v-if="row._isNew || row._editing">
                <el-button link type="primary" @click="savePointRow">保存</el-button>
                <el-button link @click="cancelPointRow">取消</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" @click="startEditPoint(row)">编辑</el-button>
                <el-button link type="danger" @click="deletePoint(row)">删除</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button type="primary" @click="pointListVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dictionary-page { padding: 20px 24px 32px; }
.page-header { margin-bottom: 18px; }
.page-breadcrumb, .page-scope, .page-tip { font-size: 13px; color: var(--ap-text-muted); margin: 0 0 7px; }
.page-heading { display: flex; align-items: center; gap: 16px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-tip { color: var(--ap-text-secondary); }
.dictionary-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; }
.category-panel, .dictionary-content { border: 1px solid var(--ap-border, #e5e7eb); border-radius: 8px; background: #fff; padding: 16px; }
.panel-heading, .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.tree-node { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tree-actions { display: none; }
.tree-node:hover .tree-actions { display: inline-flex; }
.content-title { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
.data-section + .data-section { margin-top: 22px; }
.section-title { padding-left: 10px; border-left: 3px solid var(--ap-primary, #a90056); }
.section-title span { font-weight: 600; }
.point-scope { margin-bottom: 14px; padding: 10px 12px; border-radius: 6px; background: #f8f9fb; font-size: 13px; color: var(--ap-text-secondary); line-height: 1.7; }
.point-scope span { color: var(--ap-text-muted); }
.point-scope strong { color: var(--ap-text-primary); font-weight: 600; }
@media (max-width: 900px) {
  .dictionary-layout { grid-template-columns: 1fr; }
}
</style>
