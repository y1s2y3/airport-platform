<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import { INSPECTION_CATEGORIES } from '../../config/inspectionManagement'
import {
  projectOptions, activeProjects, userOptions,
  checkCategoryTree, getCategoryLabel, getItemLabel,
  getPlanById, addPlan, updatePlan,
} from '../../composables/useInspectionPlan'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? '编辑巡检任务' : '下发巡检任务')

const form = reactive({
  name: '',
  inspectionCategory: '安全',
  projectId: '',
  responsiblePerson: '',
  ccPersons: [],
  deadlineDate: '',
  remark: '',
  checkConfig: [],
})

// ===== 检查内容选择对话框 =====
const selectDialogVisible = ref(false)
const selecting = reactive({})         // { categoryId: [itemId, ...] }
const selTreeActive = ref('')          // 左侧树当前选中分类
const activeSelectingItems = computed(() => {
  if (!selTreeActive.value) return []
  return selecting[selTreeActive.value] || []
})
const categoryCheckTree = computed(() =>
  checkCategoryTree.filter(category => category.inspectionCategory === form.inspectionCategory)
)

watch(() => form.inspectionCategory, () => {
  form.checkConfig = []
  displayTreeCat.value = ''
  selTreeActive.value = ''
  Object.keys(selecting).forEach(key => delete selecting[key])
}, { flush: 'sync' })

function openSelectDialog() {
  const keys = {}
  for (const c of form.checkConfig) keys[c.categoryId] = [...c.itemIds]
  Object.keys(selecting).forEach(k => delete selecting[k])
  for (const [catId, itemIds] of Object.entries(keys)) selecting[catId] = itemIds
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
    displayTreeCat.value = form.checkConfig[0].categoryId
    const total = form.checkConfig.reduce((s, c) => s + c.itemIds.length, 0)
    ElMessage.success(`已选择 ${form.checkConfig.length} 个分类，共 ${total} 个检查项`)
  }
}

// ===== 回显（左树右项）=====
const displayTreeCat = ref('')
const displayItems = computed(() => {
  if (!displayTreeCat.value) return []
  const cfg = form.checkConfig.find(c => c.categoryId === displayTreeCat.value)
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
      form.inspectionCategory = plan.inspectionCategory || '安全'
      form.projectId = plan.projectIds?.[0] || ''
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
  if (!form.inspectionCategory) { ElMessage.warning('请选择巡检分类'); return }
  if (!form.projectId) { ElMessage.warning('请选择所属项目'); return }
  if (form.checkConfig.length === 0) { ElMessage.warning('请配置检查内容'); return }
  if (!form.deadlineDate) { ElMessage.warning('请选择截止日期'); return }

  const projectLabel = projectOptions.find(p => p.id === form.projectId)?.label || ''
  const payload = {
    name: form.name.trim(), inspectionCategory: form.inspectionCategory,
    projects: [projectLabel], projectIds: [form.projectId],
    checkConfig: form.checkConfig.map(c => ({ categoryId: c.categoryId, itemIds: [...c.itemIds] })),
    responsiblePerson: form.responsiblePerson, ccPersons: [...form.ccPersons],
    deadlineDate: form.deadlineDate, remark: form.remark.trim(),
  }
  if (isEdit.value) { updatePlan(route.params.id, payload); ElMessage.success('任务已更新') }
  else { addPlan(payload); ElMessage.success('巡检任务已直接下发给监理') }
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
        <el-radio-group v-model="form.inspectionCategory">
          <el-radio v-for="category in INSPECTION_CATEGORIES" :key="category" :value="category" border>
            {{ category }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="所属项目" required>
        <el-select v-model="form.projectId" placeholder="请选择项目" style="width: 100%">
          <el-option v-for="p in activeProjects" :key="p.id" :label="p.label" :value="p.id" />
        </el-select>
        <div class="form-tip">已竣工项目自动隐藏</div>
      </el-form-item>

      <!-- ===== 下发信息 ===== -->
      <h4 class="form-section-title" style="margin-top: 28px">下发信息</h4>
      <el-form-item label="任务接收人">
        <el-input model-value="监理" disabled />
        <div class="form-tip">提交后立即生成一份巡检任务并下发给项目监理，不再滚动生成计划</div>
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
        <!-- 已选检查项：左树右项回显 -->
        <div v-if="form.checkConfig.length > 0" class="result-tree-layout">
          <div class="result-tree-left">
            <div
              v-for="cfg in form.checkConfig"
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
            <div v-else class="result-tree-empty">请从左侧选择一个分类</div>
          </div>
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

    <!-- ===== 检查项选择对话框（左树右项） ===== -->
    <el-dialog v-model="selectDialogVisible" title="选择检查项" width="760px" destroy-on-close top="5vh">
      <div class="sel-dialog-body">
        <div class="sel-dialog-left">
          <div class="sel-left-title">检查分类</div>
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
            {{ selTreeActive ? (categoryCheckTree.find(c=>c.id===selTreeActive)?.label || '') + ' 检查项' : '请选择分类' }}
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
            <p>请在左侧选择一个分类</p>
          </div>
        </div>
      </div>
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
.rule-tip { margin-top:14px; }
.date-sep { display: block; text-align: center; font-size: 12px; color: var(--ap-text-muted); padding: 4px 0; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; padding-bottom: 24px; }

/* ===== 检查内容回显：左树右项 ===== */
.check-config-area { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.config-hint { font-size: 12px; color: var(--ap-text-muted); }
.result-tree-layout { display: flex; border: 1px solid var(--ap-border); border-radius: 6px; overflow: hidden; margin-top: 10px; }
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
