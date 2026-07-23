<script setup>
import { ref, computed, reactive } from 'vue'
import { FolderOpened, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { checkCategoryTree as baseTree } from '../../composables/useInspectionPlan'

// 一级分类（扁平）
const categoryTree = ref(baseTree.map(c => ({ id: c.id, label: c.label })))
const selectedCategory = ref(baseTree[0]?.id || null)
const filterText = ref('')

// 检查项数据（合并基础数据 + 用户新增）
const itemStore = reactive({})
baseTree.forEach(cat => {
  itemStore[cat.id] = cat.items.map(item => ({
    id: item.id,
    checkPoint: item.label,
    updatedBy: '系统',
    updatedAt: '2026-07-13 10:00',
  }))
})

const currentCategoryName = computed(() => categoryTree.value.find(g => g.id === selectedCategory.value)?.label || '')

const checkItems = computed(() => {
  if (!selectedCategory.value) return []
  return itemStore[selectedCategory.value] || []
})

const filteredTreeData = computed(() => {
  if (!filterText.value) return categoryTree.value
  return categoryTree.value.filter(c => c.label.includes(filterText.value))
})

function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

// ===== 分类CRUD =====
const catDialogVisible = ref(false)
const catForm = reactive({ label: '' })

function openAddCat() {
  catForm.label = ''
  catDialogVisible.value = true
}

function openEditCat(cat) {
  catForm.label = cat.label
  catDialogVisible.value = true
  // 存下编辑目标
  editingCat.value = cat
}
const editingCat = ref(null)

function confirmCat() {
  if (!catForm.label.trim()) { ElMessage.warning('请输入分类名称'); return }
  if (editingCat.value) {
    editingCat.value.label = catForm.label.trim()
    editingCat.value = null
  } else {
    const newId = 'cat-' + Date.now()
    categoryTree.value.push({ id: newId, label: catForm.label.trim() })
    itemStore[newId] = []
  }
  catDialogVisible.value = false
  ElMessage.success('操作成功')
}

function deleteCat(cat) {
  ElMessageBox.confirm(`确定删除分类「${cat.label}」吗？`, '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    .then(() => {
      const idx = categoryTree.value.findIndex(c => c.id === cat.id)
      if (idx > -1) categoryTree.value.splice(idx, 1)
      delete itemStore[cat.id]
      if (selectedCategory.value === cat.id) selectedCategory.value = null
      ElMessage.success('已删除')
    }).catch(() => {})
}

// ===== 检查项CRUD =====
const itemDialogVisible = ref(false)
const itemForm = reactive({ checkPoint: '' })
const editingItemId = ref(null)

function openAddItem() {
  if (!selectedCategory.value) { ElMessage.warning('请先选择左侧分类'); return }
  itemForm.checkPoint = ''
  editingItemId.value = null
  itemDialogVisible.value = true
}

function openEditItem(row) {
  itemForm.checkPoint = row.checkPoint
  editingItemId.value = row.id
  itemDialogVisible.value = true
}

function confirmItem() {
  if (!itemForm.checkPoint.trim()) { ElMessage.warning('请输入检查项内容'); return }
  const catId = selectedCategory.value
  if (!catId) return
  if (!itemStore[catId]) itemStore[catId] = []
  const t = now()
  if (editingItemId.value) {
    const item = itemStore[catId].find(i => i.id === editingItemId.value)
    if (item) { item.checkPoint = itemForm.checkPoint.trim(); item.updatedAt = t }
  } else {
    itemStore[catId].push({ id: 'item-' + Date.now(), checkPoint: itemForm.checkPoint.trim(), updatedBy: '当前用户', updatedAt: t })
  }
  itemDialogVisible.value = false
  ElMessage.success(editingItemId.value ? '已更新' : '已添加')
}

function deleteItem(row) {
  const catId = selectedCategory.value
  if (!catId || !itemStore[catId]) return
  ElMessageBox.confirm('确定删除该检查项吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    .then(() => {
      const idx = itemStore[catId].findIndex(i => i.id === row.id)
      if (idx > -1) itemStore[catId].splice(idx, 1)
      ElMessage.success('已删除')
    }).catch(() => {})
}
</script>

<template>
  <div class="check-items-page">
    <div class="page-head">
      <h3 class="page-title">安全检查项</h3>
      <div class="page-actions">
        <el-button type="primary" size="default" @click="openAddItem"><el-icon><Plus /></el-icon>新增检查项</el-button>
        <el-input v-model="filterText" placeholder="搜索分类..." clearable size="default" style="width: 200px" />
      </div>
    </div>

    <div class="check-items-body">
      <aside class="category-panel">
        <div class="panel-header">
          <span class="panel-title">检查分类</span>
          <el-button text type="primary" size="small" @click="openAddCat"><el-icon><Plus /></el-icon>新增</el-button>
        </div>
        <div class="tree-wrap">
          <div v-for="cat in filteredTreeData" :key="cat.id" class="cat-item" :class="{ active: selectedCategory === cat.id }" @click="selectedCategory = cat.id">
            <el-icon :size="16" color="var(--ap-primary)"><FolderOpened /></el-icon>
            <span class="cat-label">{{ cat.label }}</span>
            <span class="cat-actions" @click.stop>
              <el-button text size="small" @click="openEditCat(cat)"><el-icon><Edit /></el-icon></el-button>
              <el-button text size="small" type="danger" @click="deleteCat(cat)"><el-icon><Delete /></el-icon></el-button>
            </span>
          </div>
        </div>
      </aside>

      <main class="items-panel">
        <div v-if="!selectedCategory" class="empty-hint">
          <el-icon :size="56" color="#d9d9d9"><FolderOpened /></el-icon>
          <p>请从左侧选择一个检查分类</p>
        </div>
        <div v-else class="items-table-wrap">
          <div class="table-head">
            <span class="table-title">{{ currentCategoryName }}</span>
            <span class="table-count">共 {{ checkItems.length }} 项</span>
          </div>
          <el-table :data="checkItems" border stripe class="ap-table" style="width: 100%" max-height="560">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="checkPoint" label="检查项" min-width="380" show-overflow-tooltip />
            <el-table-column prop="updatedBy" label="更新人" width="100" align="center" />
            <el-table-column prop="updatedAt" label="更新时间" width="160" align="center" />
            <el-table-column label="操作" width="130" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditItem(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="deleteItem(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </main>
    </div>

    <!-- 分类新增/编辑对话框 -->
    <el-dialog v-model="catDialogVisible" :title="editingCat ? '编辑分类' : '新增分类'" width="400px" destroy-on-close @close="editingCat=null">
      <el-form label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="catForm.label" placeholder="请输入分类名称" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible=false;editingCat=null">取消</el-button>
        <el-button type="primary" @click="confirmCat">确定</el-button>
      </template>
    </el-dialog>

    <!-- 检查项新增/编辑对话框 -->
    <el-dialog v-model="itemDialogVisible" :title="editingItemId ? '编辑检查项' : '新增检查项'" width="540px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="所属分类">
          <el-input :model-value="currentCategoryName" disabled />
        </el-form-item>
        <el-form-item label="检查内容" required>
          <el-input v-model="itemForm.checkPoint" type="textarea" :rows="3" placeholder="请输入检查项内容" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="confirmItem">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.check-items-page { display:flex; flex-direction:column; gap:16px; height:100%; }
.page-head { display:flex; align-items:center; justify-content:space-between; }
.page-title { font-size:18px; font-weight:700; color:var(--ap-text); margin:0; }
.page-actions { display:flex; align-items:center; gap:12px; }
.check-items-body { display:flex; gap:16px; flex:1; min-height:0; }
.category-panel { width:220px; flex-shrink:0; background:var(--ap-card); border:1px solid var(--ap-border); border-radius:8px; display:flex; flex-direction:column; overflow:hidden; }
.panel-header { padding:10px 14px; border-bottom:1px solid var(--ap-border); display:flex; align-items:center; justify-content:space-between; }
.panel-title { font-size:14px; font-weight:600; color:var(--ap-text); }
.tree-wrap { flex:1; overflow-y:auto; padding:2px 0; }
.cat-item { display:flex; align-items:center; gap:6px; padding:8px 12px; cursor:pointer; font-size:13px; color:var(--ap-text-secondary); }
.cat-item:hover { background:var(--ap-primary-muted); }
.cat-item.active { background:var(--ap-primary-light); color:var(--ap-primary); font-weight:600; }
.cat-label { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cat-actions { display:none; gap:2px; flex-shrink:0; }
.cat-item:hover .cat-actions { display:inline-flex; }
.items-panel { flex:1; min-width:0; display:flex; flex-direction:column; }
.empty-hint { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; color:var(--ap-text-muted); background:var(--ap-card); border:1px dashed var(--ap-border); border-radius:8px; min-height:300px; }
.empty-hint p { font-size:14px; margin:0; }
.items-table-wrap { flex:1; background:var(--ap-card); border:1px solid var(--ap-border); border-radius:8px; padding:16px; overflow:hidden; }
.table-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.table-title { font-size:14px; font-weight:600; color:var(--ap-text); }
.table-count { font-size:12px; color:var(--ap-text-muted); }
</style>
