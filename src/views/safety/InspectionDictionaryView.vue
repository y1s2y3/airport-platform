<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { INSPECTION_CATEGORIES, inspectionDictionaries, saveInspectionDictionary } from '../../config/inspectionManagement'
import { useCurrentProject } from '../../composables/useCurrentProject'

const { isHqSelected } = useCurrentProject()

const category = ref('安全')
const keyword = ref('')
const status = ref('')
const visible = ref(false)
const form = reactive({ id: '', category: '安全', name: '', sort: 1, enabled: true, remark: '' })
const rows = computed(() => inspectionDictionaries.hazards.filter(item =>
  item.category === category.value
  && (!keyword.value || item.name.includes(keyword.value.trim()))
  && (status.value === '' || item.enabled === (status.value === 'enabled')),
).sort((a, b) => a.sort - b.sort))
function edit(row) {
  if (!isHqSelected.value) return
  Object.assign(form, row || { id: '', category: category.value, name: '', sort: rows.value.length + 1, enabled: true, remark: '' })
  visible.value = true
}
function save() {
  if (!isHqSelected.value) return
  try { saveInspectionDictionary('hazards', { ...form }); visible.value = false; ElMessage.success('配置已保存') }
  catch (error) { ElMessage.warning(error.message) }
}
function toggle(row) {
  if (!isHqSelected.value) return
  saveInspectionDictionary('hazards', { ...row, enabled: !row.enabled })
  ElMessage.success(row.enabled ? '已启用' : '已停用，历史记录不受影响')
}
</script>

<template>
  <div class="page-card dictionary-page">
    <h3>隐患类别配置</h3>
    <el-empty v-if="!isHqSelected" description="仅工程指挥部可维护巡检配置" />
    <template v-else>
      <el-radio-group v-model="category" size="large" class="category-tabs">
        <el-radio-button v-for="item in INSPECTION_CATEGORIES" :key="item" :value="item">{{ item }}</el-radio-button>
      </el-radio-group>
      <p class="tip">按巡检分类维护隐患类别，新增隐患仅可选择当前分类下已启用的类别。 停用或修改不回写历史记录；配置在当前浏览器保存，同源页签同步。</p>
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索名称" clearable style="width:240px" />
        <el-select v-model="status" placeholder="启用状态" clearable style="width:140px">
          <el-option label="启用" value="enabled" /><el-option label="停用" value="disabled" />
        </el-select>
        <el-button @click="keyword = ''; status = ''">重置</el-button>
        <el-button type="primary" @click="edit()">新增隐患类别</el-button>
      </div>
      <el-table :data="rows" border stripe>
        <el-table-column type="index" label="序号" width="65" />
        <el-table-column prop="category" label="巡检分类" width="120" />
        <el-table-column prop="name" label="隐患类别名称" min-width="180" />
        <el-table-column prop="sort" label="排序" width="90" />
        <el-table-column label="是否启用" width="110"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="150"><template #default="{ row }">
          <el-button link type="primary" @click="edit(row)">编辑</el-button>
          <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button>
        </template></el-table-column>
      </el-table>
    </template>
    <el-dialog v-model="visible" :title="`${form.id ? '编辑' : '新增'}隐患类别`" width="520px" destroy-on-close>
      <el-form label-width="110px" @submit.prevent="save">
        <el-form-item label="巡检分类" required><el-select v-model="form.category"><el-option v-for="item in INSPECTION_CATEGORIES" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="50" placeholder="请输入名称" /></el-form-item>
        <el-form-item label="排序" required><el-input-number v-model="form.sort" :min="0" :precision="0" /></el-form-item>
        <el-form-item label="是否启用" required><el-switch v-model="form.enabled" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="visible = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dictionary-page h3 { margin:0 0 20px; }
.toolbar { display:flex; flex-wrap:wrap; gap:12px; margin:16px 0; }
.tip { color:#909399; font-size:13px; line-height:1.7; margin-top:16px; }
</style>
