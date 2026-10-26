<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Search, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'
import { machineAlerts, disposeMachineAlert } from '../../mock/machineAlert.js'
import AttachmentUpload from '../../components/common/AttachmentUpload.vue'
import AlertRuleConfigDialog from '../../components/alert/AlertRuleConfigDialog.vue'

const { isHqSelected, treeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') { localProjectId.value = ''; treeProjectId.value = data.id }
  else { localProjectId.value = data.id; _treeClick(data) }
}

const alertData = machineAlerts

const filterForm = reactive({ keyword: '', status: '', alertType: '', level: '' })
const detailVisible = ref(false)
const currentAlert = ref(null)

function viewDetail(row) {
  currentAlert.value = row
  detailVisible.value = true
}

const confirmDialogVisible = ref(false)
const confirmTarget = ref(null)
const confirmForm = reactive({ result: '已处置', remark: '', attachments: [] })

function confirmAlert(row) {
  confirmTarget.value = row
  confirmForm.result = '已处置'
  confirmForm.remark = ''
  confirmForm.attachments = []
  confirmDialogVisible.value = true
}

function doConfirm() {
  if (!confirmForm.result) { ElMessage.warning('请选择处理结果'); return }
  const item = disposeMachineAlert(confirmTarget.value.id, {
    result: confirmForm.result,
    remark: confirmForm.remark,
    attachments: confirmForm.attachments,
    handler: '系统',
  })
  if (!item) ElMessage.warning('该预警已处置或状态已变化')
  confirmDialogVisible.value = false
}

const treeDataWithCount = computed(() => {
  if (!isHqSelected.value) return []
  const root = projectTree[0]
  const children = root.children.map(node => {
    const count = alertData.value.filter(d => d.project_id === node.id).length
    const label = treeSearch.value
      ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
      : `${node.label}（${count}）`
    return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
  }).filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})


const filteredData = computed(() => {
  let list = alertData.value
  if (isHqSelected.value && localProjectId.value) list = list.filter(d => d.project_id === localProjectId.value)
  return list.filter(d => {
    if (filterForm.status && d.status !== filterForm.status) return false
    if (filterForm.alertType && d.alertType !== filterForm.alertType) return false
    if (filterForm.level && d.level !== filterForm.level) return false
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!d.deviceName.includes(kw) && !d.content.includes(kw) && !d.project.includes(kw)) return false
    }
    return true
  })
})

function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }

// 预警规则配置弹窗
// 分页
const page = ref(1)
const pageSize = ref(10)
const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})
watch([filteredData, pageSize], () => { page.value = 1 })

const ruleDialogVisible = ref(false)
const alertTypeOptions = ['塔吊预警', '升降机预警', '桩基预警', '复合地基预警', '高支模预警', '深基坑预警', '地铁铁路安全监管预警']

/**
 * 预警推送规则弹窗（用户 2026-10-26）：抽成公共组件 AlertRuleConfigDialog，
 * 与危大监测预警共用同一份规则数据（src/mock/alertRuleConfig.js）。
 */
function openRuleConfig() { ruleDialogVisible.value = true }
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-head-main">
        <div v-if="isHqSelected" class="page-breadcrumb">安全看板 / 机械设备预警</div>
        <h3 class="page-title">{{ isHqSelected ? '机械设备预警' : '预警记录' }}</h3>
      </div>
      <span class="total-count">共 {{ filteredData.length }} 条</span>
      <el-button v-if="isHqSelected" type="primary" size="default" :icon="Setting" @click="openRuleConfig" style="margin-left:auto">预警规则配置</el-button>
    </div>
    <div class="page-layout">
      <aside v-if="isHqSelected" class="tree-panel">
        <div class="panel-title">项目列表</div>
        <el-input v-model="treeSearch" placeholder="搜索项目..." clearable size="small" style="margin-bottom:8px" :prefix-icon="Search" aria-label="搜索项目..."/>
        <el-tree :data="treeDataWithCount" node-key="id" highlight-current default-expand-all :current-node-key="localProjectId || 'hq'"
          :expand-on-click-node="false" class="project-tree" @node-click="handleTreeNodeClick" />
      </aside>
      <div class="page-panel">
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/预警内容..." clearable style="width:260px" :prefix-icon="Search" aria-label="搜索设备名称/预警内容..."/>
          <el-select v-model="filterForm.alertType" placeholder="预警类型" clearable style="width:120px" aria-label="预警类型">
            <el-option v-for="t in alertTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterForm.level" placeholder="预警等级" clearable style="width:90px" aria-label="预警等级">
            <el-option label="重大预警" value="重大预警" /><el-option label="较大预警" value="较大预警" /><el-option label="一般预警" value="一般预警" />
          </el-select>
          <el-select v-model="filterForm.status" placeholder="预警状态" clearable style="width:100px" aria-label="预警状态">
            <el-option label="未处置" value="未处置" /><el-option label="已处置" value="已处置" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <el-table :data="pagedData" stripe border style="width:100%" class="data-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="alertType" label="预警类型"  align="center" />
          <el-table-column prop="deviceName" label="设备名称" min- />
          <el-table-column prop="content" label="预警内容" min- show-overflow-tooltip />
          <el-table-column prop="region" label="预警区域"  align="center" />
          <el-table-column prop="level" label="预警等级"  align="center" />
          <el-table-column label="预警状态"  align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === '未处置' ? 'danger' : 'success'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="alertTime" label="预警时间" min- align="center" />
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
              <el-button v-if="!isHqSelected && row.status === '未处置'" link type="primary" size="small" @click="confirmAlert(row)">预警确认</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          :total="filteredData.length"
          style="margin-top:12px;justify-content:flex-end"
        />
      </div>
    </div>

    <!-- 预警详情弹窗 -->
    <el-dialog v-model="detailVisible" title="预警详情" width="520px" :close-on-click-modal="false">
      <div v-if="currentAlert" class="alert-detail">
        <div class="detail-row"><span class="dl">预警类型</span><span class="dv">{{ currentAlert.alertType }}</span></div>
        <div class="detail-row"><span class="dl">设备名称</span><span class="dv">{{ currentAlert.deviceName }}</span></div>
        <div class="detail-row"><span class="dl">预警时间</span><span class="dv">{{ currentAlert.alertTime }}</span></div>
        <div class="detail-row"><span class="dl">预警区域</span><span class="dv">{{ currentAlert.region }}</span></div>
        <div class="detail-row"><span class="dl">预警内容</span><span class="dv">{{ currentAlert.content }}</span></div>
        <div class="detail-row"><span class="dl">预警等级</span><span class="dv">{{ currentAlert.level }}</span></div>
        <div class="detail-row">
          <span class="dl">预警状态</span>
          <span class="dv">
            <el-tag :type="currentAlert.status === '未处置' ? 'danger' : 'success'" size="small" effect="plain">{{ currentAlert.status }}</el-tag>
          </span>
        </div>
        <!-- 已处置：额外显示处理结果、说明、处理人、处理时间 -->
        <template v-if="currentAlert.status === '已处置'">
          <div class="detail-row"><span class="dl">处理结果</span><span class="dv">{{ currentAlert.result || '-' }}</span></div>
          <div class="detail-row"><span class="dl">预警说明</span><span class="dv">{{ currentAlert.remark || '-' }}</span></div>
          <div class="detail-row"><span class="dl">处理人</span><span class="dv">{{ currentAlert.handler || '-' }}</span></div>
          <div class="detail-row"><span class="dl">处理时间</span><span class="dv">{{ currentAlert.handleTime || '-' }}</span></div>
        </template>
      </div>
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 预警确认弹窗 -->
    <el-dialog v-model="confirmDialogVisible" title="预警确认" width="420px" :close-on-click-modal="false">
      <div v-if="confirmTarget" style="margin-bottom:16px;font-size:13px;color:#666">
        预警：{{ confirmTarget.content }}
      </div>
      <el-form :model="confirmForm" label-width="80px">
        <el-form-item label="处理结果" required>
          <el-select v-model="confirmForm.result" style="width:100%">
            <el-option label="已处置" value="已处置" />
            <el-option label="误报" value="误报" />
          </el-select>
        </el-form-item>
        <el-form-item label="预警说明">
          <el-input v-model="confirmForm.remark" type="textarea" :rows="3" placeholder="请输入预警说明" aria-label="请输入预警说明"/>
        </el-form-item>
        <el-form-item label="上传附件">
          <AttachmentUpload v-model="confirmForm.attachments" preset="file" :min="0" :max="9" name-prefix="处置附件" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doConfirm">确认处理</el-button>
      </template>
    </el-dialog>

    <!-- 预警推送规则配置弹窗（公共组件，与危大监测预警共用同一份数据源） -->
    <AlertRuleConfigDialog v-model="ruleDialogVisible" />
  </div>
</template>

<style scoped>
.page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap: 12px; }
.page-head-main { display:flex; flex-direction:column; gap:4px; min-width:0; }
.page-breadcrumb { font-size:13px; color:var(--ap-text-muted, #909399); }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.data-table { font-size:13px; }
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }

/* 详情样式 */
.alert-detail { padding:0 8px; }
.detail-row { display:flex; padding:10px 0; border-bottom:1px solid #f0f0f0; font-size:14px; }
.detail-row:last-child { border-bottom:none; }
.dl { width:90px; color:#666; flex-shrink:0; }
.dv { flex:1; color:#1f2329; }

.el-table { width:100% !important; }
.el-table__header-wrapper table, .el-table__body-wrapper table { table-layout:fixed; width:100% !important; }

.el-form-item__label::before {
  content: '' !important;
}
.el-form-item.is-required .el-form-item__label::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}
</style>
