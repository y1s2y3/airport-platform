<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Plus, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree, getAlertRules, saveAlertRule, removeAlertRule, indicatorDefs, getAllDevices } from '../../mock/majorHazard'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const isReadOnly = computed(() => isHqSelected.value)

const keyword = ref('')
const filterType = ref('')
const list = ref([])

const treeData = computed(() =>
  projectTree.map((g) => ({ id: g.id, label: g.label, children: g.children?.map((c) => ({ id: c.id, label: c.label.replace(/\(\d+\)$/, '') })) }))
)

const typeOptions = [
  { label: '深基坑', value: 'pit' },
  { label: '地铁铁路', value: 'subway' },
  { label: '高支模', value: 'formwork' },
]

const filteredList = computed(() => {
  let l = list.value
  const kw = keyword.value.trim()
  if (kw) l = l.filter(r => r.name.includes(kw) || r.handler.includes(kw))
  if (filterType.value) l = l.filter(r => r.hazardType === filterType.value)
  return l
})

function load() {
  list.value = getAlertRules(scopeProjectId.value, '')
}

watch(scopeProjectId, () => { keyword.value = ''; filterType.value = ''; load() }, { immediate: true })

// 编辑弹窗
const dialogVisible = ref(false)
const editRule = ref(null)
const editForm = ref({ name: '', hazardType: 'pit', deviceIds: [], indicatorName: '', handler: '', pushChannel: [], thresholdCondition: '', pushRule: '实时推送', enabled: true })

const deviceOpts = computed(() => {
  return getAllDevices(scopeProjectId.value).filter(d => {
    if (!editForm.value.hazardType) return true
    const region = d.regionName || ''
    if (editForm.value.hazardType === 'pit') return region.includes('深基坑')
    if (editForm.value.hazardType === 'subway') return region.includes('地铁') || region.includes('高铁') || region.includes('城际')
    if (editForm.value.hazardType === 'formwork') return region.includes('高支模')
    return true
  })
})

const indicatorOpts = computed(() => indicatorDefs[editForm.value.hazardType] || [])

const channelOpts = ['短信', '站内信', 'APP推送']
const pushRuleOpts = ['实时推送', '每15分钟', '每30分钟', '每小时']

function openAdd() {
  editRule.value = null
  editForm.value = { name: '', hazardType: 'pit', deviceIds: [], indicatorName: '', handler: '', pushChannel: [], thresholdCondition: '', pushRule: '实时推送', enabled: true }
  dialogVisible.value = true
}

function openEdit(row) {
  editRule.value = row
  editForm.value = {
    name: row.name, hazardType: row.hazardType, deviceIds: [...row.deviceIds],
    indicatorName: row.indicatorName, handler: row.handler,
    pushChannel: [...(row.pushChannel || [])], thresholdCondition: row.thresholdCondition,
    pushRule: row.pushRule || '实时推送', enabled: row.enabled,
  }
  dialogVisible.value = true
}

function saveForm() {
  if (!editForm.value.name) { ElMessage.warning('请输入规则名称'); return }
  if (!editForm.value.handler) { ElMessage.warning('请选择处置负责人'); return }
  
  const data = { ...editForm.value, projectId: scopeProjectId.value }
  if (editRule.value) {
    saveAlertRule({ ...data, id: editRule.value.id }, true)
    ElMessage.success('规则已更新')
  } else {
    saveAlertRule(data, false)
    ElMessage.success('规则已新增')
  }
  dialogVisible.value = false
  load()
}

function toggleEnabled(row) {
  const rule = list.value.find(r => r.id === row.id)
  if (rule) { rule.enabled = !rule.enabled; ElMessage.success(rule.enabled ? '已启用' : '已停用') }
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除告警规则「${row.name}」？`, '提示', { type: 'warning' }).then(() => {
    removeAlertRule(row.id); ElMessage.success('已删除'); load()
  }).catch(() => {})
}
</script>

<template>
  <div class="page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">危大工程监管 / 告警配置</div>
      <div class="page-heading">
        <h1 class="page-title">告警配置</h1>
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openAdd" v-if="!isReadOnly">新增规则</el-button>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">配置告警规则，设定监测指标阈值、处置负责人与推送方式。指标超限时自动生成告警记录并推送。</p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree :data="treeData" node-key="id" highlight-current default-expand-all
          :current-node-key="treeProjectId" :expand-on-click-node="false" class="project-tree"
          @node-click="onTreeNodeClick" />
      </aside>

      <section class="content-panel">
        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="规则名称/负责人" clearable style="width: 200px" :prefix-icon="Search" />
          <el-select v-model="filterType" placeholder="工程类型" clearable style="width: 130px">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <el-button @click="keyword = ''; filterType = ''">重置</el-button>
        </div>

        <el-table :data="filteredList" border stripe class="ap-table" style="width:100%">
          <el-table-column type="index" label="序号" width="50" align="center" />
          <el-table-column prop="name" label="规则名称" min-width="160" />
          <el-table-column label="工程类型" width="80" align="center">
            <template #default="{ row }">{{ { pit:'深基坑', subway:'地铁铁路', formwork:'高支模' }[row.hazardType] }}</template>
          </el-table-column>
          <el-table-column prop="indicatorName" label="监测指标" width="90" align="center" />
          <el-table-column prop="thresholdCondition" label="触发条件" width="110" align="center" />
          <el-table-column prop="handler" label="负责人" width="70" align="center" />
          <el-table-column label="推送渠道" width="130" align="center">
            <template #default="{ row }">
              <el-tag v-for="ch in (row.pushChannel || [])" :key="ch" size="small" effect="plain" style="margin-right:2px">{{ ch }}</el-tag>
              <span v-if="!row.pushChannel?.length" class="ap-muted">未配置</span>
            </template>
          </el-table-column>
          <el-table-column prop="pushRule" label="推送规则" width="100" align="center" />
          <el-table-column label="状态" width="65" align="center">
            <template #default="{ row }">
              <el-switch :model-value="row.enabled" size="small" @click.stop="toggleEnabled(row)" :disabled="isReadOnly" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)" v-if="!isReadOnly">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="!isReadOnly">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="dialogVisible" :title="editRule ? '编辑告警规则' : '新增告警规则'" width="600px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="规则名称" required><el-input v-model="editForm.name" placeholder="如：深基坑水平位移超限告警" /></el-form-item>
        <el-form-item label="工程类型">
          <el-select v-model="editForm.hazardType" placeholder="请选择" style="width:100%">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联设备">
          <el-select v-model="editForm.deviceIds" multiple collapse-tags collapse-tags-tooltip placeholder="请选择（可多选）" style="width:100%">
            <el-option v-for="d in deviceOpts" :key="d.id" :label="`${d.name}（${d.deviceNo}）`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="监测指标" required>
          <el-select v-model="editForm.indicatorName" placeholder="请选择" style="width:100%">
            <el-option v-for="ind in indicatorOpts" :key="ind.name" :label="ind.name" :value="ind.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="触发条件">
          <el-input v-model="editForm.thresholdCondition" placeholder="如：> 15 mm" />
        </el-form-item>
        <el-form-item label="处置负责人" required>
          <el-input v-model="editForm.handler" placeholder="请输入负责人姓名" />
        </el-form-item>
        <el-form-item label="推送渠道">
          <el-checkbox-group v-model="editForm.pushChannel">
            <el-checkbox v-for="ch in channelOpts" :key="ch" :label="ch" :value="ch" />
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="推送规则">
          <el-select v-model="editForm.pushRule" style="width:100%">
            <el-option v-for="r in pushRuleOpts" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="editForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="saveForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; align-items: center; }
.project-tree { font-size: 13px; }
.project-tree :deep(.el-tree-node__content) { height: 36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #fceef4; color: var(--ap-primary); font-weight: 600; }
.ap-muted { color: var(--ap-text-muted); font-size: 13px; }
</style>
