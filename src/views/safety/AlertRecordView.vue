<script setup>
import { ref, reactive, computed } from 'vue'
import { InfoFilled, Search, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'

const { isHqSelected, treeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') { localProjectId.value = ''; treeProjectId.value = data.id }
  else { localProjectId.value = data.id; _treeClick(data) }
}

const alertData = ref([
  { id:'alt-001', alertTime:'2026-07-16 08:56:23', alertType:'塔吊告警', content:'塔吊起力矩告警，请及时处理', deviceName:'塔吊QTZ160（#1）', region:'施工A区', level:'重大告警', status:'未处置', project_id:'p-000', project:'飞行区跑道延长工程' },
  { id:'alt-002', alertTime:'2026-07-16 07:30:15', alertType:'塔吊告警', content:'塔吊风力超限告警', deviceName:'塔吊QTZ80（#7）', region:'堆场区', level:'重大告警', status:'未处置', project_id:'p-003', project:'新货运站建设工程' },
  { id:'alt-003', alertTime:'2026-07-15 17:20:00', alertType:'升降机告警', content:'升降机载重超限告警', deviceName:'升降机SC200（#2）', region:'施工B区', level:'较大告警', status:'已处置', result:'现场已处置', remark:'超载人员已疏散', handler:'李工', handleTime:'2026-07-15 17:45:00', project_id:'p-000', project:'飞行区跑道延长工程' },
  { id:'alt-004', alertTime:'2026-07-15 14:10:30', alertType:'塔吊告警', content:'塔吊倾角异常告警', deviceName:'塔吊QTZ160（#1）', region:'施工A区', level:'重大告警', status:'已处置', result:'误报', remark:'传感器临时波动', handler:'王工', handleTime:'2026-07-15 14:30:00', project_id:'p-000', project:'飞行区跑道延长工程' },
  { id:'alt-005', alertTime:'2026-07-14 10:05:00', alertType:'桩基告警', content:'桩基施工深度超限', deviceName:'桩基钻孔机#5', region:'跑道区', level:'较大告警', status:'未处置', project_id:'p-000', project:'飞行区跑道延长工程' },
  { id:'alt-006', alertTime:'2026-07-14 09:30:00', alertType:'升降机告警', content:'升降机人数超限告警', deviceName:'升降机SC200（#4）', region:'基础区', level:'较大告警', status:'已处置', result:'现场已处置', remark:'超员已劝离', handler:'张工', handleTime:'2026-07-14 10:00:00', project_id:'p-003', project:'新货运站建设工程' },
  { id:'alt-007', alertTime:'2026-07-13 16:45:20', alertType:'复合地基告警', content:'复合地基电流异常', deviceName:'复合地基桩机#3', region:'基坑区', level:'一般告警', status:'未处置', project_id:'p-001', project:'T3航站楼扩建工程' },
  { id:'alt-008', alertTime:'2026-07-13 08:00:00', alertType:'塔吊告警', content:'塔吊起重力矩超限', deviceName:'塔吊QTZ160（#1）', region:'施工A区', level:'重大告警', status:'已处置', result:'现场已处置', remark:'已调整起重参数', handler:'王工', handleTime:'2026-07-13 09:15:00', project_id:'p-000', project:'飞行区跑道延长工程' },
])

const filterForm = reactive({ keyword: '', status: '', alertType: '', level: '' })
const detailVisible = ref(false)
const currentAlert = ref(null)

function viewDetail(row) {
  currentAlert.value = row
  detailVisible.value = true
}

const confirmDialogVisible = ref(false)
const confirmTarget = ref(null)
const confirmForm = reactive({ result: '已处置', remark: '' })

function confirmAlert(row) {
  confirmTarget.value = row
  confirmForm.result = '已处置'
  confirmForm.remark = ''
  confirmDialogVisible.value = true
}

function doConfirm() {
  if (!confirmForm.result) { ElMessage.warning('请选择处理结果'); return }
  const item = alertData.value.find(d => d.id === confirmTarget.value.id)
  if (item) {
    item.status = '已处置'
    item.result = confirmForm.result
    item.remark = confirmForm.remark
    item.handler = '系统'
    item.handleTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  }
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

// 告警规则配置弹窗
const ruleDialogVisible = ref(false)
const alertTypeOptions = ['塔吊告警', '升降机告警', '桩基告警', '复合地基告警', '高支模告警', '深基坑告警', '地铁铁路安全监管告警']
const hqPushOptions = ['是', '否']
const receiverOptions = ['测试工程指挥部推送告警接收人', '工程指挥部安全负责人', '工程指挥部值班人员']
const pushMethodOptions = ['短信', '站内信']
const upgradeEnableOptions = ['是', '否']
const pushRuleRows = ref([
  { alertLevel: '重大告警', pushToHq: '是', receivers: ['测试工程指挥部推送告警接收人'], methods: ['短信', '站内信'] },
  { alertLevel: '较大告警', pushToHq: '是', receivers: ['工程指挥部安全负责人'], methods: ['站内信', '短信'] },
  { alertLevel: '一般告警', pushToHq: '否', receivers: [], methods: [] },
])
const upgradeRuleRows = ref([
  { alertLevel: '较大告警', overdueDays: 2, upgradeLevel: '重大告警', enabled: '是' },
  { alertLevel: '一般告警', overdueDays: 1, upgradeLevel: '较大告警', enabled: '否' },
])

function openRuleConfig() { ruleDialogVisible.value = true }
function handleHqPushChange(row) {
  if (row.pushToHq === '否') {
    row.receivers = []
    row.methods = []
  }
}
function submitRuleConfig() {
  ruleDialogVisible.value = false
  ElMessage.success('告警推送规则配置已提交')
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-head-main">
        <div v-if="isHqSelected" class="page-breadcrumb">安全看板 / 机械设备告警</div>
        <h3 class="page-title">{{ isHqSelected ? '机械设备告警' : '告警记录' }}</h3>
      </div>
      <span class="total-count">共 {{ filteredData.length }} 条</span>
      <el-button v-if="isHqSelected" type="primary" size="default" :icon="Setting" @click="openRuleConfig" style="margin-left:auto">告警规则配置</el-button>
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
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/告警内容..." clearable style="width:260px" :prefix-icon="Search" aria-label="搜索设备名称/告警内容..."/>
          <el-select v-model="filterForm.alertType" placeholder="告警类型" clearable style="width:120px" aria-label="告警类型">
            <el-option v-for="t in alertTypeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterForm.level" placeholder="告警等级" clearable style="width:90px" aria-label="告警等级">
            <el-option label="重大告警" value="重大告警" /><el-option label="较大告警" value="较大告警" /><el-option label="一般告警" value="一般告警" />
          </el-select>
          <el-select v-model="filterForm.status" placeholder="告警状态" clearable style="width:100px" aria-label="告警状态">
            <el-option label="未处置" value="未处置" /><el-option label="已处置" value="已处置" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <el-table :data="filteredData" stripe border style="width:100%" class="data-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="alertType" label="告警类型"  align="center" />
          <el-table-column prop="deviceName" label="设备名称" min- />
          <el-table-column prop="content" label="告警内容" min- show-overflow-tooltip />
          <el-table-column prop="region" label="告警区域"  align="center" />
          <el-table-column prop="level" label="告警等级"  align="center" />
          <el-table-column label="告警状态"  align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === '未处置' ? 'danger' : 'success'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="alertTime" label="告警时间" min- align="center" />
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
              <el-button v-if="!isHqSelected && row.status === '未处置'" link type="primary" size="small" @click="confirmAlert(row)">告警确认</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 告警详情弹窗 -->
    <el-dialog v-model="detailVisible" title="告警详情" width="520px" :close-on-click-modal="false">
      <div v-if="currentAlert" class="alert-detail">
        <div class="detail-row"><span class="dl">告警类型</span><span class="dv">{{ currentAlert.alertType }}</span></div>
        <div class="detail-row"><span class="dl">设备名称</span><span class="dv">{{ currentAlert.deviceName }}</span></div>
        <div class="detail-row"><span class="dl">告警时间</span><span class="dv">{{ currentAlert.alertTime }}</span></div>
        <div class="detail-row"><span class="dl">告警区域</span><span class="dv">{{ currentAlert.region }}</span></div>
        <div class="detail-row"><span class="dl">告警内容</span><span class="dv">{{ currentAlert.content }}</span></div>
        <div class="detail-row"><span class="dl">告警等级</span><span class="dv">{{ currentAlert.level }}</span></div>
        <div class="detail-row">
          <span class="dl">告警状态</span>
          <span class="dv">
            <el-tag :type="currentAlert.status === '未处置' ? 'danger' : 'success'" size="small" effect="plain">{{ currentAlert.status }}</el-tag>
          </span>
        </div>
        <!-- 已处置：额外显示处理结果、说明、处理人、处理时间 -->
        <template v-if="currentAlert.status === '已处置'">
          <div class="detail-row"><span class="dl">处理结果</span><span class="dv">{{ currentAlert.result || '-' }}</span></div>
          <div class="detail-row"><span class="dl">告警说明</span><span class="dv">{{ currentAlert.remark || '-' }}</span></div>
          <div class="detail-row"><span class="dl">处理人</span><span class="dv">{{ currentAlert.handler || '-' }}</span></div>
          <div class="detail-row"><span class="dl">处理时间</span><span class="dv">{{ currentAlert.handleTime || '-' }}</span></div>
        </template>
      </div>
      <template #footer><el-button type="primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 告警确认弹窗 -->
    <el-dialog v-model="confirmDialogVisible" title="告警确认" width="420px" :close-on-click-modal="false">
      <div v-if="confirmTarget" style="margin-bottom:16px;font-size:13px;color:#666">
        告警：{{ confirmTarget.content }}
      </div>
      <el-form :model="confirmForm" label-width="80px">
        <el-form-item label="处理结果" required>
          <el-select v-model="confirmForm.result" style="width:100%">
            <el-option label="已处置" value="已处置" />
            <el-option label="误报" value="误报" />
          </el-select>
        </el-form-item>
        <el-form-item label="告警说明">
          <el-input v-model="confirmForm.remark" type="textarea" :rows="3" placeholder="请输入告警说明" aria-label="请输入告警说明"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doConfirm">确认处理</el-button>
      </template>
    </el-dialog>

    <!-- 告警规则配置弹窗 -->
    <el-dialog v-model="ruleDialogVisible" title="告警推送规则配置" width="796px" :close-on-click-modal="false" class="rule-config-dialog">
      <div class="rule-section">
        <div class="rule-section-title">
          <span>分级推送配置</span>
          <el-icon class="rule-info"><InfoFilled /></el-icon>
        </div>
        <el-table :data="pushRuleRows" border class="rule-table" size="default">
          <el-table-column prop="alertLevel" label="告警等级" width="120" align="center" />
          <el-table-column label="是否推送工程指挥部" width="170" align="center">
            <template #default="{ row }">
              <el-select v-model="row.pushToHq" class="enable-select" placeholder="请选择" @change="handleHqPushChange(row)" aria-label="请选择">
                <el-option v-for="item in hqPushOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="告警接收人" min-width="250" align="center">
            <template #default="{ row }">
              <el-select
                v-model="row.receivers"
                class="rule-select"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :disabled="row.pushToHq === '否'"
                placeholder="请选择" aria-label="请选择">
                <el-option v-for="item in receiverOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="推送方式" min-width="190" align="center">
            <template #default="{ row }">
              <el-select
                v-model="row.methods"
                class="rule-select"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :disabled="row.pushToHq === '否'"
                placeholder="请选择" aria-label="请选择">
                <el-option v-for="item in pushMethodOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="rule-section upgrade-section">
        <div class="rule-section-title">
          <span>告警超期未处理自动升级配置</span>
        </div>
        <el-table :data="upgradeRuleRows" border class="rule-table" size="default">
          <el-table-column prop="alertLevel" label="告警等级" width="150" align="center" />
          <el-table-column label="超期未处理天数" min-width="230" align="center">
            <template #default="{ row }">
              <div class="overdue-cell">
                <span>超过</span>
                <el-input-number v-model="row.overdueDays" :min="1" :controls="false" class="days-input" />
                <span>天未处理</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="upgradeLevel" label="升级后等级" min-width="180" align="center" />
          <el-table-column label="是否启用升级" min-width="160" align="center">
            <template #default="{ row }">
              <el-select v-model="row.enabled" class="enable-select" placeholder="请选择" aria-label="请选择">
                <el-option v-for="item in upgradeEnableOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRuleConfig">提交</el-button>
      </template>
    </el-dialog>
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

.rule-section { margin-bottom:22px; }
.upgrade-section { margin-bottom:0; }
.rule-section-title { display:flex; align-items:center; gap:6px; margin-bottom:12px; font-size:14px; font-weight:600; color:#1f2329; }
.rule-info { color:#909399; font-size:16px; }
.rule-table { font-size:13px; }
.rule-table :deep(.el-table__header th) { background:#f5f7fa; color:#606266; font-weight:600; }
.rule-table :deep(.el-table__cell) { padding:11px 0; }
.rule-select { width:100%; }
.overdue-cell { display:flex; align-items:center; justify-content:center; gap:8px; }
.days-input { width:64px; }
.days-input :deep(.el-input__wrapper) { padding:0 8px; }
.days-input :deep(.el-input__inner) { text-align:center; }
.enable-select { width:96px; }
.rule-config-dialog :deep(.el-dialog__body) { padding-top:10px; }
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
