<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import { INSPECTION_CATEGORIES, formatInspectionCategories, normalizeInspectionCategories } from '../../config/inspectionManagement'
import {
  projectOptions, activeProjects, userOptions,
  checkCategoryTree, getCategoryLabel, getItemLabel,
  getPlanById, addPlan, updatePlan,
} from '../../composables/useInspectionPlan'
import {
  getProjectInspectorLabel,
  hasInspectionInspectorConfig,
  hasCompleteInspectionPersonConfig,
} from '../../composables/useInspectionPersonConfig'
import { getMajorHazardLedgerOptions } from '../../utils/inspectionMajorHazardLink'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? '编辑巡检任务' : '下发巡检任务')

const form = reactive({
  name: '',
  inspectionCategories: ['安全'],
  projectIds: [],
  isMajorHazardPatrol: '是',
  majorHazardLedgerId: '',
  majorHazardSourceId: '',
  majorHazardName: '',
  responsiblePerson: '',
  ccPersons: [],
  deadlineDate: '',
  remark: '',
  checkConfig: [],
})

const receiverSummary = computed(() => {
  const selected = projectOptions.filter(project => form.projectIds.includes(project.id))
  if (!selected.length) return '选择项目后自动带入已配置的巡检人'
  return selected
    .map(project => `${project.label}：${getProjectInspectorLabel(project.id) || '未配置'}`)
    .join('；')
})

// ===== 检查内容选择对话框 =====
const selectDialogVisible = ref(false)
const selecting = reactive({})         // { categoryId: [itemId, ...] }
const selTreeActive = ref('')          // 左侧树当前选中分类
const selectInspectionCategory = ref('安全')
const displayInspectionCategory = ref('安全')
const activeSelectingItems = computed(() => {
  if (!selTreeActive.value) return []
  return selecting[selTreeActive.value] || []
})
const categoryCheckTree = computed(() =>
  checkCategoryTree.filter(category => category.inspectionCategory === selectInspectionCategory.value)
)
const selectedCheckTabs = computed(() => form.inspectionCategories.map((category) => {
  const configs = form.checkConfig.filter((config) =>
    checkCategoryTree.find((item) => item.id === config.categoryId)?.inspectionCategory === category,
  )
  return {
    category,
    configs,
    itemCount: configs.reduce((total, config) => total + config.itemIds.length, 0),
  }
}))
const activeDisplayConfigs = computed(() =>
  selectedCheckTabs.value.find((tab) => tab.category === displayInspectionCategory.value)?.configs || [],
)

const majorHazardOptions = computed(() => {
  if (form.projectIds.length !== 1) return []
  return getMajorHazardLedgerOptions(form.projectIds[0])
})

watch(() => [...form.inspectionCategories], (categories) => {
  const available = new Set(checkCategoryTree
    .filter(category => categories.includes(category.inspectionCategory))
    .map(category => category.id))
  form.checkConfig = form.checkConfig.filter(config => available.has(config.categoryId))
  if (!available.has(displayTreeCat.value)) displayTreeCat.value = form.checkConfig[0]?.categoryId || ''
  if (!available.has(selTreeActive.value)) selTreeActive.value = ''
  Object.keys(selecting).forEach(key => {
    if (!available.has(key)) delete selecting[key]
  })
  if (!categories.includes(selectInspectionCategory.value)) selectInspectionCategory.value = categories[0] || ''
  if (!categories.includes(displayInspectionCategory.value)) displayInspectionCategory.value = categories[0] || ''
}, { flush: 'sync' })

watch(displayInspectionCategory, (category) => {
  const configs = selectedCheckTabs.value.find((tab) => tab.category === category)?.configs || []
  if (!configs.some((config) => config.categoryId === displayTreeCat.value)) {
    displayTreeCat.value = configs[0]?.categoryId || ''
  }
})

watch(selectInspectionCategory, (category) => {
  if (!categoryCheckTree.value.some((item) => item.id === selTreeActive.value)) {
    selTreeActive.value = categoryCheckTree.value[0]?.id || ''
  }
})

watch(() => [...form.projectIds], () => {
  const selected = majorHazardOptions.value.some(item => item.id === form.majorHazardLedgerId)
  if (!selected) {
    form.majorHazardLedgerId = ''
    form.majorHazardSourceId = ''
    form.majorHazardName = ''
  }
})

watch(() => form.isMajorHazardPatrol, (value) => {
  if (value === '是') return
  form.majorHazardLedgerId = ''
  form.majorHazardSourceId = ''
  form.majorHazardName = ''
})

function chooseMajorHazard(ledgerId) {
  const option = majorHazardOptions.value.find(item => item.id === ledgerId)
  form.majorHazardLedgerId = ledgerId || ''
  form.majorHazardSourceId = option?.sourceId || ''
  form.majorHazardName = option?.name || ''
}

function openSelectDialog() {
  const keys = {}
  for (const c of form.checkConfig) keys[c.categoryId] = [...c.itemIds]
  Object.keys(selecting).forEach(k => delete selecting[k])
  for (const [catId, itemIds] of Object.entries(keys)) selecting[catId] = itemIds
  selectInspectionCategory.value = form.inspectionCategories[0] || ''
  selTreeActive.value = categoryCheckTree.value[0]?.id || ''
  selectDialogVisible.value = true
}

function onSelTreeClick(cat) {
  selTreeActive.value = selTreeActive.value === cat.id ? '' : cat.id
}

function toggleSelCatItem(itemId, checked) {
  const catId = selTreeActive.value
  if (!catId) return
  if (!selecting[catId]) selecting[catId] = []
  if (checked) { if (!selecting[catId].includes(itemId)) selecting[catId].push(itemId) }
  else { selecting[catId] = selecting[catId].filter(id => id !== itemId) }
}

function toggleSelCatAll(catId, checked) {
  const cat = checkCategoryTree.find(c => c.id === catId)
  if (!cat) return
  selecting[catId] = checked ? cat.items.map(i => i.id) : []
}

function isCatSelAll(catId) {
  const cat = checkCategoryTree.find(c => c.id === catId)
  if (!cat) return false
  const sel = selecting[catId] || []
  return cat.items.length > 0 && sel.length === cat.items.length
}
function isCatSelInd(catId) {
  const sel = selecting[catId] || []
  return sel.length > 0 && !isCatSelAll(catId)
}

function confirmSelection() {
  form.checkConfig = []
  for (const [catId, itemIds] of Object.entries(selecting)) {
    if (itemIds.length > 0) form.checkConfig.push({ categoryId: catId, itemIds: [...itemIds] })
  }
  selectDialogVisible.value = false
  selTreeActive.value = ''
  if (form.checkConfig.length > 0) {
    const firstConfiguredTab = selectedCheckTabs.value.find((tab) => tab.configs.length > 0)
    displayInspectionCategory.value = firstConfiguredTab?.category || form.inspectionCategories[0] || ''
    displayTreeCat.value = firstConfiguredTab?.configs[0]?.categoryId || ''
    const total = form.checkConfig.reduce((s, c) => s + c.itemIds.length, 0)
    ElMessage.success(`已选择 ${form.checkConfig.length} 个分类，共 ${total} 个检查项`)
  }
}

function removeConfig(index) {
  form.checkConfig.splice(index, 1)
  if (!form.checkConfig.some(config => config.categoryId === displayTreeCat.value)) {
    displayTreeCat.value = form.checkConfig[0]?.categoryId || ''
  }
}

// ===== 回显（左树右项）=====
const displayTreeCat = ref('')
const displayItems = computed(() => {
  if (!displayTreeCat.value) return []
  const cfg = activeDisplayConfigs.value.find(c => c.categoryId === displayTreeCat.value)
  if (!cfg) return []
  return cfg.itemIds.map(id => ({ id, label: getItemLabel(cfg.categoryId, id) }))
})
const totalCheckItems = computed(() => form.checkConfig.reduce((s, c) => s + c.itemIds.length, 0))

// ===== 编辑加载 =====
onMounted(() => {
  if (isEdit.value) {
    const plan = getPlanById(route.params.id)
    if (plan) {
      form.name = plan.name
      form.inspectionCategories = normalizeInspectionCategories(plan.inspectionCategories || plan.inspectionCategory)
      form.projectIds = [...(plan.projectIds || [])]
      form.isMajorHazardPatrol = plan.isMajorHazardPatrol || '否'
      form.majorHazardLedgerId = plan.majorHazardLedgerId || ''
      form.majorHazardSourceId = plan.majorHazardSourceId || ''
      form.majorHazardName = plan.majorHazardName || ''
      form.responsiblePerson = plan.responsiblePerson
      form.ccPersons = [...plan.ccPersons]
      form.deadlineDate = plan.deadlineDate || plan.endDate || ''
      form.remark = plan.remark || ''
      form.checkConfig = plan.checkConfig ? plan.checkConfig.map(c => ({ categoryId: c.categoryId, itemIds: [...c.itemIds] })) : []
      if (form.checkConfig.length > 0) displayTreeCat.value = form.checkConfig[0].categoryId
    }
  }
})

// ===== 保存 =====
function handleSave() {
  if (!form.name.trim()) { ElMessage.warning('请输入任务名称'); return }
  if (!form.inspectionCategories.length) { ElMessage.warning('请选择至少一个巡检分类'); return }
  if (form.projectIds.length === 0) { ElMessage.warning('请选择所属项目'); return }
  if (form.isMajorHazardPatrol === '是' && form.projectIds.length !== 1) {
    ElMessage.warning('危大工程现场巡视仅可选择一个所属项目')
    return
  }
  if (form.isMajorHazardPatrol === '是' && !form.majorHazardLedgerId) {
    ElMessage.warning('请选择危大工程名称')
    return
  }
  const incompleteProject = projectOptions.find(project =>
    form.projectIds.includes(project.id) && !hasCompleteInspectionPersonConfig(project.id),
  )
  if (incompleteProject) {
    ElMessage.warning(`${incompleteProject.label}尚未完整配置巡检人、整改人和复查人，请先完成人员配置`)
    return
  }
  if (form.checkConfig.length === 0) { ElMessage.warning('请配置检查内容'); return }
  const categoryWithoutItems = form.inspectionCategories.find((category) => !form.checkConfig.some((config) =>
    checkCategoryTree.find((item) => item.id === config.categoryId)?.inspectionCategory === category && config.itemIds.length > 0,
  ))
  if (categoryWithoutItems) {
    ElMessage.warning(`请在“${categoryWithoutItems}”页签至少选择一项检查项`)
    return
  }
  if (!form.deadlineDate) { ElMessage.warning('请选择截止日期'); return }

  const selectedProjects = projectOptions.filter(p => form.projectIds.includes(p.id))
  const payload = {
    name: form.name.trim(),
    inspectionCategories: [...form.inspectionCategories],
    inspectionCategory: formatInspectionCategories(form.inspectionCategories),
    projects: selectedProjects.map(project => project.label), projectIds: selectedProjects.map(project => project.id),
    isMajorHazardPatrol: form.isMajorHazardPatrol,
    majorHazardLedgerId: form.majorHazardLedgerId,
    majorHazardSourceId: form.majorHazardSourceId,
    majorHazardName: form.majorHazardName,
    checkConfig: form.checkConfig.map(c => ({ categoryId: c.categoryId, itemIds: [...c.itemIds] })),
    responsiblePerson: form.responsiblePerson, ccPersons: [...form.ccPersons],
    deadlineDate: form.deadlineDate, remark: form.remark.trim(),
  }
  if (isEdit.value) {
    const addedCount = updatePlan(route.params.id, payload)
    ElMessage.success(addedCount > 0 ? `任务已更新，并新增下发 ${addedCount} 条任务` : '任务已更新')
  } else {
    const count = addPlan(payload)
    ElMessage.success(`已向 ${count} 个项目直接下发巡检任务`)
  }
  router.push('/safety-inspection/plan')
}
function handleCancel() { router.push('/safety-inspection/plan') }
</script>

<template>
  <div class="page-card plan-form-page">
    <div class="form-nav">
      <el-button text @click="handleCancel">← 返回任务下发列表</el-button>
      <span class="form-nav-title">{{ pageTitle }}</span>
    </div>
    <el-divider />

    <el-form label-width="110px" class="plan-form">
      <!-- ===== 基本信息 ===== -->
      <h4 class="form-section-title">基本信息</h4>
      <el-form-item label="任务名称" required>
        <el-input v-model="form.name" placeholder="如：雨季临时用电检查" maxlength="50" />
      </el-form-item>
      <el-form-item label="巡检分类" required>
        <el-checkbox-group v-model="form.inspectionCategories">
          <el-checkbox v-for="category in INSPECTION_CATEGORIES" :key="category" :value="category" border>
            {{ category }}
          </el-checkbox>
        </el-checkbox-group>
        <div class="form-tip">可同时选择安全、质量；系统按所选分类生成检查项范围和任务编号。</div>
      </el-form-item>
      <el-form-item label="所属项目" required>
        <el-select v-model="form.projectIds" multiple collapse-tags collapse-tags-tooltip placeholder="请选择项目（可多选）" style="width: 100%">
          <el-option
            v-for="p in activeProjects"
            :key="p.id"
            :label="p.label"
            :value="p.id"
            :disabled="!hasInspectionInspectorConfig(p.id)"
          >
            <span>{{ p.label }}</span>
            <span v-if="!hasInspectionInspectorConfig(p.id)" class="project-disabled-note">（未配置巡检人）</span>
          </el-option>
        </el-select>
        <div class="form-tip">普通巡检支持选择多个在建项目；危大工程现场巡视仅选择一个项目，提交后将直接关联该项目的危大工程。</div>
        <div class="form-tip project-config-tip">未配置巡检人的项目已置灰，无法选择；请先在“人员配置”中完成巡检人配置。</div>
      </el-form-item>
      <el-form-item label="是否危大工程现场巡视" required>
        <el-radio-group v-model="form.isMajorHazardPatrol">
          <el-radio value="是">是</el-radio>
          <el-radio value="否">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.isMajorHazardPatrol === '是'" label="危大工程名称" required>
        <el-select
          v-model="form.majorHazardLedgerId"
          :disabled="form.projectIds.length !== 1"
          placeholder="请先选择一个所属项目"
          filterable
          style="width: 100%"
          @change="chooseMajorHazard"
        >
          <el-option v-for="item in majorHazardOptions" :key="item.id" :label="item.label" :value="item.id" />
        </el-select>
        <div class="form-tip">任务完成后，巡视记录会自动同步至该危大工程当前在施施工部位的“现场巡视”台账。</div>
      </el-form-item>

      <!-- ===== 下发信息 ===== -->
      <h4 class="form-section-title" style="margin-top: 28px">下发信息</h4>
      <el-form-item label="任务接收人">
        <el-input :model-value="receiverSummary" disabled />
        <div class="form-tip">按各项目人员配置自动确定巡检人；三类人员配置完整后才可下发任务</div>
      </el-form-item>
      <el-form-item label="抄送人">
        <el-select v-model="form.ccPersons" multiple placeholder="可选，多人" style="width: 100%">
          <el-option v-for="u in userOptions" :key="u.id" :label="`${u.label}（${u.role}）`" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="截止日期" required>
        <el-date-picker v-model="form.deadlineDate" type="date" placeholder="选择截止日期" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>

      <!-- ===== 配置检查内容 ===== -->
      <h4 class="form-section-title" style="margin-top: 28px">配置检查内容</h4>
      <el-form-item label="检查内容" required>
        <div class="check-config-area">
          <el-button type="primary" @click="openSelectDialog">选择检查项</el-button>
          <span class="config-hint">
            {{ form.checkConfig.length ? `已选择 ${form.checkConfig.length} 个分类，共 ${totalCheckItems} 个检查项` : '还未选择检查项' }}
          </span>
        </div>
        <!-- 已选检查项：先按安全/质量页签区分，再展示具体检查分类 -->
        <div v-if="form.checkConfig.length > 0" class="result-tree-layout">
          <el-tabs v-model="displayInspectionCategory" class="inspection-type-tabs result-type-tabs">
            <el-tab-pane
              v-for="tab in selectedCheckTabs"
              :key="tab.category"
              :name="tab.category"
              :label="`${tab.category}（${tab.itemCount}项）`"
            >
              <div v-if="tab.configs.length" class="result-tree-content">
                <div class="result-tree-left">
                  <div
                    v-for="cfg in tab.configs"
                    :key="cfg.categoryId"
                    class="result-tree-cat"
                    :class="{ active: displayTreeCat === cfg.categoryId }"
                    @click="displayTreeCat = cfg.categoryId"
                  >
                    <el-tag size="small" :type="displayTreeCat === cfg.categoryId ? 'primary' : 'info'" effect="plain">
                      {{ getCategoryLabel(cfg.categoryId) }}
                    </el-tag>
                    <span class="result-tree-cat-count">{{ cfg.itemIds.length }} 项</span>
                    <el-button text type="danger" size="small" @click.stop="removeConfig(form.checkConfig.indexOf(cfg))">移除</el-button>
                  </div>
                </div>
                <div class="result-tree-right">
                  <div v-if="displayItems.length > 0" class="result-tree-items">
                    <div v-for="(item, i) in displayItems" :key="item.id" class="result-tree-item">
                      <span class="ri-num">{{ i + 1 }}.</span>
                      <span class="ri-text">{{ item.label }}</span>
                    </div>
                  </div>
                  <div v-else class="result-tree-empty">请从左侧选择一个检查分类</div>
                </div>
              </div>
              <div v-else class="result-tree-empty empty-tab">该分类尚未选择检查项</div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注..." maxlength="200" show-word-limit />
      </el-form-item>
    </el-form>

    <el-divider />
    <div class="form-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" size="large" @click="handleSave">{{ isEdit ? '保存修改' : '创建并下发' }}</el-button>
    </div>

    <!-- ===== 检查项选择对话框：安全 / 质量页签 + 分类树 ===== -->
    <el-dialog v-model="selectDialogVisible" title="选择检查项" width="760px" destroy-on-close top="5vh">
      <el-tabs v-model="selectInspectionCategory" class="inspection-type-tabs">
        <el-tab-pane
          v-for="category in form.inspectionCategories"
          :key="category"
          :name="category"
          :label="`${category}检查项`"
        >
          <div class="sel-dialog-body">
            <div class="sel-dialog-left">
              <div class="sel-left-title">{{ selectInspectionCategory }}检查分类</div>
              <div class="sel-left-list">
                <div
                  v-for="cat in categoryCheckTree"
                  :key="cat.id"
                  class="sel-left-cat"
                  :class="{ active: selTreeActive === cat.id }"
                  @click="onSelTreeClick(cat)"
                >
                  <el-checkbox
                    :model-value="isCatSelAll(cat.id)"
                    :indeterminate="isCatSelInd(cat.id)"
                    @change="(v) => toggleSelCatAll(cat.id, v)"
                    @click.stop
                  >
                    <span class="sel-cat-label">{{ cat.label }}</span>
                  </el-checkbox>
                  <span class="sel-cat-count">{{ selecting[cat.id]?.length || 0 }}/{{ cat.items.length }}</span>
                </div>
              </div>
            </div>
            <div class="sel-dialog-right">
              <div class="sel-right-title">
                {{ selTreeActive ? (categoryCheckTree.find(c=>c.id===selTreeActive)?.label || '') + ' 检查项' : `请选择${selectInspectionCategory}检查分类` }}
              </div>
              <div v-if="selTreeActive" class="sel-right-list">
                <div
                  v-for="item in (categoryCheckTree.find(c=>c.id===selTreeActive)?.items || [])"
                  :key="item.id"
                  class="sel-right-item"
                >
                  <el-checkbox
                    :model-value="selecting[selTreeActive]?.includes(item.id) || false"
                    @change="(v) => toggleSelCatItem(item.id, v)"
                  >
                    {{ item.label }}
                  </el-checkbox>
                </div>
                <div v-if="!(categoryCheckTree.find(c=>c.id===selTreeActive)?.items?.length)" class="sel-right-empty">该分类下暂无检查项</div>
              </div>
              <div v-else class="sel-right-placeholder">
                <el-icon :size="40" color="#d9d9d9"><FolderOpened /></el-icon>
                <p>请在左侧选择一个检查分类</p>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="selectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelection">确定选择</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-nav { display: flex; align-items: center; gap: 16px; }
.form-nav-title { font-size: 16px; font-weight: 600; color: var(--ap-text); }
.form-section-title { font-size: 14px; font-weight: 600; color: var(--ap-text); margin: 0 0 16px 0; padding-left: 10px; border-left: 3px solid var(--ap-primary); }
.plan-form { padding: 8px 0; }
.type-radio { padding: 8px 18px; border-radius: 6px; }
.form-tip { font-size: 11px; color: var(--ap-text-muted); margin-top: 4px; }
.project-config-tip { color: #e6a23c; }
.project-disabled-note { color: #999; margin-left: 4px; }
.rule-tip { margin-top:14px; }
.date-sep { display: block; text-align: center; font-size: 12px; color: var(--ap-text-muted); padding: 4px 0; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-bottom: 24px; }

/* ===== 检查内容回显：左树右项 ===== */
.check-config-area { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.config-hint { font-size: 12px; color: var(--ap-text-muted); }
.result-tree-layout { border: 1px solid var(--ap-border); border-radius: 6px; overflow: hidden; margin-top: 10px; }
.inspection-type-tabs { width: 100%; }
.result-tree-content { display: flex; }
.result-type-tabs :deep(.el-tabs__header) { margin: 0; padding: 0 12px; background: #fafafa; border-bottom: 1px solid var(--ap-border); }
.result-type-tabs :deep(.el-tabs__content) { min-height: 120px; }
.empty-tab { padding: 18px; }
.result-tree-left { width: 200px; flex-shrink: 0; border-right: 1px solid var(--ap-border); background: #fafafa; padding: 6px 0; overflow-y: auto; max-height: 300px; }
.result-tree-cat { display: flex; align-items: center; gap: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.result-tree-cat:hover { background: var(--ap-primary-muted); }
.result-tree-cat.active { background: var(--ap-primary-light); }
.result-tree-cat-count { font-size: 11px; color: var(--ap-text-muted); margin-right: auto; }
.result-tree-right { flex: 1; padding: 12px 16px; min-height: 100px; overflow-y: auto; max-height: 300px; }
.result-tree-items { display: flex; flex-direction: column; gap: 4px; }
.result-tree-item { display: flex; gap: 6px; font-size: 13px; color: var(--ap-text-secondary); line-height: 1.6; padding: 2px 0; }
.ri-num { color: var(--ap-text-muted); flex-shrink: 0; }
.ri-text { flex: 1; }
.result-tree-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--ap-text-muted); font-size: 13px; min-height: 80px; }

/* ===== 选择对话框左树右项 ===== */
.sel-dialog-body { display: flex; height: 55vh; }
.sel-dialog-left { width: 200px; flex-shrink: 0; border-right: 1px solid var(--ap-border); display: flex; flex-direction: column; }
.sel-left-title { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--ap-text); border-bottom: 1px solid var(--ap-border); flex-shrink: 0; }
.sel-left-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.sel-left-cat { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; }
.sel-left-cat:hover { background: var(--ap-primary-muted); }
.sel-left-cat.active { background: var(--ap-primary-light); }
.sel-cat-label { font-size: 13px; }
.sel-cat-count { font-size: 11px; color: var(--ap-text-muted); flex-shrink: 0; }
.sel-dialog-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.sel-right-title { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--ap-text); border-bottom: 1px solid var(--ap-border); flex-shrink: 0; }
.sel-right-list { flex: 1; overflow-y: auto; padding: 8px 14px; }
.sel-right-item { padding: 5px 0; }
.sel-right-item :deep(.el-checkbox__label) { font-size: 13px; line-height: 1.5; }
.sel-right-empty, .sel-right-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--ap-text-muted); font-size: 13px; gap: 12px; }
.sel-right-placeholder p { margin: 0; }
</style>
