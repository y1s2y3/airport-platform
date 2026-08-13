<script setup>
import { ref, reactive, computed } from 'vue'
import { Search, Plus, VideoCamera } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree } from '../../mock/laborRealName.js'

const { isHqSelected, treeProjectId, onTreeNodeClick: _treeClick } = useLaborProjectScope()

// 项目树搜索与选中
const treeSearch = ref('')
const localProjectId = ref('')

function handleTreeNodeClick(data) {
  if (data.id === 'hq') {
    localProjectId.value = ''
    treeProjectId.value = data.id
  } else {
    localProjectId.value = data.id
    _treeClick(data)
  }
}

// ===== 机械设备台账数据 =====
const deviceData = ref([
  { id:'mac-001', deviceType:'塔吊', deviceName:'塔吊QTZ160（#1）', deviceSN:'TD-2026-001', region:'飞行区跑道延长工程-施工A区', regionId:'reg-a', bindTime:'2026-01-15', lastOnline:'2026-07-20 14:30:00', project:'飞行区跑道延长工程', project_id:'p-000', online:true, contact:'王工', contactPhone:'138****5621',
    craneHeight:'150', boomHeight:'64.5', jibLength:'50', counterJibLength:'24.9', hookHeight:'61', xCoord:'99.4', yCoord:'8.7', rotation:'90', remark:'',
    techChars:[{ range:'10', capacity:'12' }, { range:'20', capacity:'8' }, { range:'30', capacity:'5' }] },
  { id:'mac-002', deviceType:'升降机', deviceName:'升降机SC200（#2）', deviceSN:'SJ-2026-002', region:'飞行区跑道延长工程-施工B区', regionId:'reg-b', bindTime:'2026-02-01', lastOnline:'2026-07-19 09:15:00', project:'飞行区跑道延长工程', project_id:'p-000', online:false, contact:'李工', contactPhone:'139****3344' },
  { id:'mac-003', deviceType:'复合地基机械', deviceName:'复合地基桩机#3', deviceSN:'ZJ-2026-003', region:'T3航站楼扩建工程-基坑区', regionId:'reg-c', bindTime:'2026-03-10', lastOnline:'2026-07-20 10:00:00', project:'T3航站楼扩建工程', project_id:'p-001', online:true, contact:'陈工', contactPhone:'136****7788' },
  { id:'mac-004', deviceType:'升降机', deviceName:'升降机SC200（#4）', deviceSN:'SJ-2026-004', region:'T3航站楼扩建工程-主体区', regionId:'reg-d', bindTime:'2026-03-20', lastOnline:'2026-07-20 08:45:00', project:'T3航站楼扩建工程', project_id:'p-001', online:true, contact:'陈工', contactPhone:'136****7788' },
  { id:'mac-005', deviceType:'桩基机械', deviceName:'桩基钻孔机#5', deviceSN:'ZJ-2026-005', region:'飞行区跑道延长工程-跑道区', regionId:'reg-e', bindTime:'2026-04-01', lastOnline:'2026-07-18 16:20:00', project:'飞行区跑道延长工程', project_id:'p-000', online:true, contact:'王工', contactPhone:'138****5621' },
  { id:'mac-006', deviceType:'复合地基机械', deviceName:'复合地基桩机#6', deviceSN:'ZJ-2026-006', region:'新货运站建设工程-基础区', regionId:'reg-f', bindTime:'2026-04-15', lastOnline:'2026-07-17 11:30:00', project:'新货运站建设工程', project_id:'p-003', online:false, contact:'张工', contactPhone:'137****9900' },
  { id:'mac-007', deviceType:'塔吊', deviceName:'塔吊QTZ80（#7）', deviceSN:'TD-2026-007', region:'新货运站建设工程-堆场区', regionId:'reg-g', bindTime:'2026-05-01', lastOnline:'2026-07-20 13:00:00', project:'新货运站建设工程', project_id:'p-003', online:true, contact:'张工', contactPhone:'137****9900',
    craneHeight:'120', boomHeight:'55', jibLength:'45', counterJibLength:'20', hookHeight:'52', xCoord:'78.2', yCoord:'15.3', rotation:'75', remark:'',
    techChars:[{ range:'8', capacity:'10' }, { range:'16', capacity:'6' }, { range:'25', capacity:'4' }] },
  { id:'mac-008', deviceType:'桩基机械', deviceName:'桩基旋挖机#8', deviceSN:'ZJ-2026-008', region:'T3航站楼扩建工程-桩基区', regionId:'reg-h', bindTime:'2026-05-10', lastOnline:'2026-07-19 15:45:00', project:'T3航站楼扩建工程', project_id:'p-001', online:true, contact:'赵工', contactPhone:'135****2233' },
])

// 区域选项
const regionOptions = [
  { label:'飞行区跑道延长工程-施工A区', value:'reg-a' },
  { label:'飞行区跑道延长工程-施工B区', value:'reg-b' },
  { label:'飞行区跑道延长工程-跑道区', value:'reg-e' },
  { label:'T3航站楼扩建工程-基坑区', value:'reg-c' },
  { label:'T3航站楼扩建工程-主体区', value:'reg-d' },
  { label:'T3航站楼扩建工程-桩基区', value:'reg-h' },
  { label:'新货运站建设工程-基础区', value:'reg-f' },
  { label:'新货运站建设工程-堆场区', value:'reg-g' },
]

// 筛选条件
const filterForm = reactive({ keyword: '', deviceType: '', onlineStatus: '' })

const treeDataWithCount = computed(() => {
  if (!isHqSelected.value) return []
  const root = projectTree[0]
  const children = root.children
    .map(node => {
      const count = deviceData.value.filter(d => d.project_id === node.id).length
      const label = treeSearch.value
        ? (node.label.includes(treeSearch.value) ? `${node.label}（${count}）` : '')
        : `${node.label}（${count}）`
      return { ...node, label, _visible: !treeSearch.value || node.label.includes(treeSearch.value) }
    })
    .filter(n => n._visible)
  return [{ ...root, label: treeSearch.value ? '搜索结果' : root.label, children }]
})

const filteredData = computed(() => {
  let list = deviceData.value
  if (isHqSelected.value && localProjectId.value) {
    list = list.filter(d => d.project_id === localProjectId.value)
  }
  return list.filter(d => {
    if (filterForm.deviceType && d.deviceType !== filterForm.deviceType) return false
    if (filterForm.onlineStatus === '在线' && !d.online) return false
    if (filterForm.onlineStatus === '离线' && d.online) return false
    if (filterForm.keyword) {
      const kw = filterForm.keyword
      if (!d.deviceName.includes(kw) && !d.deviceSN.includes(kw) && !d.region.includes(kw) && !d.project.includes(kw) && !d.contact.includes(kw)) return false
    }
    return true
  })
})

function handleReset() { Object.keys(filterForm).forEach(k => filterForm[k] = '') }

// ===== 绑定（新增）设备弹窗 =====
const formDialogVisible = ref(false)
const isEditMode = ref(false)
const editingId = ref('')
const typeOptions = ['塔吊', '升降机', '复合地基机械', '桩基机械']

const formModel = reactive({
  deviceType: '',
  deviceName: '', deviceSN: '', regionName: '', contact: '', contactPhone: '',
  // 塔吊专属字段
  craneHeight: '', boomHeight: '', jibLength: '', counterJibLength: '', hookHeight: '',
  xCoord: '', yCoord: '', rotation: '', remark: '', cameraName: '', cameraUrl: '',
})

function openAddDialog() {
  isEditMode.value = false
  editingId.value = ''
  formModel.deviceType = ''
  formModel.deviceName = ''; formModel.deviceSN = ''; formModel.regionName = ''
  formModel.contact = ''; formModel.contactPhone = ''
  formModel.craneHeight = ''; formModel.boomHeight = ''; formModel.jibLength = ''; formModel.counterJibLength = ''
  formModel.hookHeight = ''; formModel.xCoord = ''; formModel.yCoord = ''; formModel.rotation = ''; formModel.remark = ''; formModel.cameraName = ''; formModel.cameraUrl = ''
  formDialogVisible.value = true
}

function openEditDialog(row) {
  isEditMode.value = true
  editingId.value = row.id
  formModel.deviceType = row.deviceType
  formModel.deviceName = row.deviceName; formModel.deviceSN = row.deviceSN; formModel.regionName = row.region
  formModel.contact = row.contact; formModel.contactPhone = row.contactPhone
  formModel.craneHeight = row.craneHeight || ''; formModel.boomHeight = row.boomHeight || ''; formModel.jibLength = row.jibLength || ''
  formModel.counterJibLength = row.counterJibLength || ''; formModel.hookHeight = row.hookHeight || ''
  formModel.xCoord = row.xCoord || ''; formModel.yCoord = row.yCoord || ''; formModel.rotation = row.rotation || ''; formModel.remark = row.remark || ''
  formModel.cameraName = row.cameraName || ''; formModel.cameraUrl = row.cameraUrl || ''
  formDialogVisible.value = true
}

function saveForm() {
  if (!formModel.deviceType) { ElMessage.warning('请选择设备类型'); return }
  if (!formModel.deviceName) { ElMessage.warning('请输入设备名称'); return }
  if (!formModel.deviceSN) { ElMessage.warning('请输入设备SN'); return }

  const baseData = {
    deviceType: formModel.deviceType,
    deviceName: formModel.deviceName, deviceSN: formModel.deviceSN,
    region: formModel.regionName, project: '飞行区跑道延长工程', project_id: 'p-000',
    bindTime: new Date().toISOString().slice(0,10), lastOnline: new Date().toISOString().slice(0,10) + ' ' + new Date().toTimeString().slice(0,8),
    contact: formModel.contact, contactPhone: formModel.contactPhone
  }
  // 塔吊专属字段
  const craneData = formModel.deviceType === '塔吊' ? {
    craneHeight: formModel.craneHeight, boomHeight: formModel.boomHeight,
    jibLength: formModel.jibLength, counterJibLength: formModel.counterJibLength,
    hookHeight: formModel.hookHeight, xCoord: formModel.xCoord,
    yCoord: formModel.yCoord, rotation: formModel.rotation, remark: formModel.remark,
    cameraName: formModel.cameraName, cameraUrl: formModel.cameraUrl,
  } : {}

  if (isEditMode.value) {
    const dev = deviceData.value.find(d => d.id === editingId.value)
    if (dev) {
      Object.assign(dev, baseData)
      if (formModel.deviceType === '塔吊') Object.assign(dev, craneData)
      ElMessage.success('设备信息已更新')
    }
  } else {
    const newId = 'mac-' + String(deviceData.value.length + 1).padStart(3, '0')
    deviceData.value.push({ id: newId, online: true, ...baseData, ...craneData })
    ElMessage.success('设备添加成功')
  }
  formDialogVisible.value = false
}

function deleteDevice(row) {
  ElMessageBox.confirm(`确认删除设备 "${row.deviceName}"（${row.deviceSN}）？`, '提示', {
    confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    const idx = deviceData.value.findIndex(d => d.id === row.id)
    if (idx !== -1) { deviceData.value.splice(idx, 1); ElMessage.success('已删除') }
  }).catch(() => {})
}

// ===== 吊钩可视化弹窗 =====
const hookVideoVisible = ref(false)
const hookDevice = ref(null)

function openHookVideo(row) {
  hookDevice.value = row
  hookVideoVisible.value = true
}

// ===== 特性管理弹窗 =====
const techCharVisible = ref(false)
const techDevice = ref(null)
// techGroups: 每个元素 { ropeRatio, chars: [{range, capacity}] }
const techGroups = ref([])

function openTechChar(row) {
  techDevice.value = row
  techGroups.value = []
  // 特性1
  const g1 = {
    ropeRatio: row.ropeRatio1 || '',
    chars: (row.techChars && row.techChars.length > 0)
      ? row.techChars.map(c => ({ ...c }))
      : [{ range: '', capacity: '' }]
  }
  techGroups.value.push(g1)
  // 特性2+
  if (row.techGroups && row.techGroups.length > 1) {
    row.techGroups.slice(1).forEach(g => {
      techGroups.value.push({
        ropeRatio: g.ropeRatio || '',
        chars: g.chars && g.chars.length > 0 ? g.chars.map(c => ({ ...c })) : [{ range: '', capacity: '' }]
      })
    })
  }
  techCharVisible.value = true
}

function addTechRow(list) {
  list.push({ range: '', capacity: '' })
}

function removeTechRow(list, idx) {
  list.splice(idx, 1)
}

function addTechGroup() {
  techGroups.value.push({ ropeRatio: '', chars: [{ range: '', capacity: '' }] })
}

function removeTechGroup(idx) {
  techGroups.value.splice(idx, 1)
}

function saveTechChars() {
  const dev = deviceData.value.find(d => d.id === techDevice.value.id)
  if (dev) {
    dev.techChars = techGroups.value[0]?.chars.filter(c => c.range && c.capacity) || []
    dev.ropeRatio1 = techGroups.value[0]?.ropeRatio || ''
    dev.techGroups = techGroups.value.slice(1).map(g => ({
      ropeRatio: g.ropeRatio || '',
      chars: g.chars.filter(c => c.range && c.capacity)
    })).filter(g => g.chars.length > 0)
    ElMessage.success('技术特性已保存')
  }
  techCharVisible.value = false
}
</script>

<template>
  <div class="device-page">
    <div class="page-head">
      <h3 class="page-title">监测设备管理</h3>
      <span class="total-count">共 {{ filteredData.length }} 台设备</span>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-input v-model="treeSearch" placeholder="搜索项目..." clearable size="small" style="margin-bottom:8px" :prefix-icon="Search" />
        <el-tree
          :data="treeDataWithCount" node-key="id" highlight-current
          default-expand-all :current-node-key="localProjectId || 'hq'"
          :expand-on-click-node="false" class="project-tree"
          @node-click="handleTreeNodeClick"
        />
      </aside>

      <div class="page-panel">
        <div class="filter-bar">
          <el-input v-model="filterForm.keyword" placeholder="搜索设备名称/SN/区域/联系人..." clearable style="width:280px" :prefix-icon="Search" />
          <el-select v-model="filterForm.deviceType" placeholder="设备类型" clearable style="width:110px">
            <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
          </el-select>
          <el-select v-model="filterForm.onlineStatus" placeholder="设备状态" clearable style="width:100px">
            <el-option label="在线" value="在线" /><el-option label="离线" value="离线" />
          </el-select>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="!isHqSelected" type="primary" :icon="Plus" @click="openAddDialog" style="margin-left:auto">绑定设备</el-button>
        </div>

        <el-table :data="filteredData" stripe border style="width:100%" class="device-table">
          <el-table-column type="index" label="序号" width="55" align="center" />
          <el-table-column prop="deviceType" label="设备类型" min- align="center">
            <template #default="{ row }"><span style="white-space:nowrap">{{ row.deviceType }}</span></template>
          </el-table-column>
          <el-table-column prop="deviceName" label="设备名称" min- />
          <el-table-column prop="deviceSN" label="设备SN" min- />
          <el-table-column prop="region" label="区域名称" min- show-overflow-tooltip />
          <el-table-column prop="bindTime" label="绑定时间"  align="center" />
          <el-table-column prop="lastOnline" label="最后在线时间"  align="center" />
          <el-table-column label="设备状态"  align="center">
            <template #default="{ row }">
              <el-tag :type="row.online ? 'success' : 'info'" size="small" effect="plain">{{ row.online ? '在线' : '离线' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="contact" label="联系人"  align="center" />
          <el-table-column prop="contactPhone" label="联系电话"  align="center" />
          <el-table-column label="操作" min-width="180" align="center">
            <template #default="{ row }">
              <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center">
                <el-button v-if="!isHqSelected" link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
                <el-button v-if="row.deviceType === '塔吊'" link type="primary" size="small" :icon="VideoCamera" @click="openHookVideo(row)">吊钩可视化</el-button>
                <el-button v-if="!isHqSelected" link type="danger" size="small" @click="deleteDevice(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 绑定/编辑设备弹窗 -->
    <el-dialog v-model="formDialogVisible" :title="isEditMode ? '编辑设备' : '绑定设备'" width="850px" :close-on-click-modal="false">
      <el-form :model="formModel" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备类型" required>
              <el-select v-model="formModel.deviceType" placeholder="请选择设备类型" style="width:100%">
                <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备名称" required>
              <el-input v-model="formModel.deviceName" placeholder="请输入设备名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备SN" required>
              <el-input v-model="formModel.deviceSN" placeholder="请输入设备SN" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域名称">
              <el-input v-model="formModel.regionName" placeholder="请输入区域名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备联系人">
              <el-input v-model="formModel.contact" placeholder="请输入设备联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系人电话">
              <el-input v-model="formModel.contactPhone" placeholder="请输入联系人电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="formModel.remark" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 塔吊专属字段：每行两个字段，备注独占一行 -->
        <template v-if="formModel.deviceType === '塔吊'">
          <el-divider content-position="left" style="margin:12px 0;font-size:13px">塔吊参数</el-divider>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="镜头名称"><el-input v-model="formModel.cameraName" placeholder="请输入镜头名称" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="镜头地址"><el-input v-model="formModel.cameraUrl" placeholder="请输入镜头地址" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="塔机高度（m）" style="white-space:nowrap"><el-input v-model="formModel.craneHeight" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="限高（m）" style="white-space:nowrap"><el-input v-model="formModel.limitHeight" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="吊臂高度（m）" style="white-space:nowrap"><el-input v-model="formModel.boomHeight" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="起重臂长（m）" style="white-space:nowrap"><el-input v-model="formModel.jibLength" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="平衡臂长（m）" style="white-space:nowrap"><el-input v-model="formModel.counterJibLength" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="吊钩高度（m）" style="white-space:nowrap"><el-input v-model="formModel.hookHeight" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="塔吊X轴坐标" style="white-space:nowrap"><el-input v-model="formModel.xCoord" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="塔吊Y轴坐标" style="white-space:nowrap"><el-input v-model="formModel.yCoord" /></el-form-item></el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="塔吊偏转（°）" style="white-space:nowrap"><el-input v-model="formModel.rotation" /></el-form-item></el-col>
            <el-col :span="12" />
          </el-row>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveForm">{{ isEditMode ? '保存' : '确认绑定' }}</el-button>
      </template>
    </el-dialog>

    <!-- 吊钩可视化弹窗 -->
    <el-dialog v-model="hookVideoVisible" title="吊钩可视化实时监控" width="720px" :close-on-click-modal="false" top="5vh">
      <div v-if="hookDevice" style="text-align:center">
        <div style="background:#0a1628;border-radius:8px;padding:20px;color:#fff;min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:48px;margin-bottom:12px">🎥</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">{{ hookDevice.deviceName }} - 吊钩实时画面</div>
          <div style="font-size:13px;color:#8899bb;margin-bottom:20px">设备SN：{{ hookDevice.deviceSN }} | 区域：{{ hookDevice.region }}</div>
          <div style="display:flex;gap:24px;font-size:13px">
            <div><span style="color:#8899bb">吊钩高度：</span><span style="color:#4fc3f7;font-weight:600">{{ hookDevice.hookHeight || '-' }}m</span></div>
            <div><span style="color:#8899bb">塔机偏转：</span><span style="color:#4fc3f7;font-weight:600">{{ hookDevice.rotation || '-' }}°</span></div>
            <div><span style="color:#8899bb">载重：</span><span style="color:#4fc3f7;font-weight:600">2.8t</span></div>
          </div>
          <div style="margin-top:24px;display:flex;gap:12px">
            <el-tag style="background:#1a2a4a;border-color:#2a4a7a;color:#4fc3f7">● 实时</el-tag>
            <el-tag style="background:#1a2a4a;border-color:#2a4a7a;color:#999">信号强度：强</el-tag>
          </div>
        </div>
      </div>
      <template #footer><el-button type="primary" @click="hookVideoVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 吊钩可视化弹窗 -->
    <el-dialog v-model="hookVideoVisible" title="吊钩可视化实时监控" width="720px" :close-on-click-modal="false" top="5vh">
      <div v-if="hookDevice" style="text-align:center">
        <div style="background:#0a1628;border-radius:8px;padding:20px;color:#fff;min-height:360px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:48px;margin-bottom:12px">🎥</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">{{ hookDevice.deviceName }} - 吊钩实时画面</div>
          <div style="font-size:13px;color:#8899bb;margin-bottom:20px">设备SN：{{ hookDevice.deviceSN }} | 区域：{{ hookDevice.region }}</div>
          <div style="display:flex;gap:24px;font-size:13px">
            <div><span style="color:#8899bb">吊钩高度：</span><span style="color:#4fc3f7;font-weight:600">{{ hookDevice.hookHeight || '-' }}m</span></div>
            <div><span style="color:#8899bb">塔机偏转：</span><span style="color:#4fc3f7;font-weight:600">{{ hookDevice.rotation || '-' }}°</span></div>
            <div><span style="color:#8899bb">载重：</span><span style="color:#4fc3f7;font-weight:600">2.8t</span></div>
          </div>
          <div style="margin-top:24px;display:flex;gap:12px">
            <el-tag style="background:#1a2a4a;border-color:#2a4a7a;color:#4fc3f7">● 实时</el-tag>
            <el-tag style="background:#1a2a4a;border-color:#2a4a7a;color:#999">信号强度：强</el-tag>
          </div>
        </div>
      </div>
      <template #footer><el-button type="primary" @click="hookVideoVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 特性管理弹窗 -->
    <el-dialog v-model="techCharVisible" title="塔吊技术特性" width="560px" :close-on-click-modal="false">
      <div v-if="techDevice" style="margin-bottom:12px;font-size:13px;color:#666">
        设备：{{ techDevice.deviceName }}（{{ techDevice.deviceSN }}）
      </div>
      <el-form label-width="0">
        <!-- 动态特性卡片：v-for 渲染 techGroups -->
        <div v-for="(group, gi) in techGroups" :key="gi">
          <!-- 特性1：无卡片边框 -->
          <div v-if="gi === 0">
            <div style="font-size:14px;font-weight:600;color:#1f2329;margin-bottom:10px">特性1</div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <span style="font-size:13px;font-weight:600;white-space:nowrap">吊绳倍率：</span>
              <el-select v-model="group.ropeRatio" style="width:200px" placeholder="请选择吊绳倍率">
                <el-option label="2倍率" value="2" /><el-option label="4倍率" value="4" /><el-option label="6倍率" value="6" />
              </el-select>
            </div>
            <div style="font-size:13px;font-weight:600;color:#1f2329;margin-bottom:8px">塔吊特性</div>
            <el-table :data="group.chars" border size="small" style="width:100%">
              <el-table-column label="幅度(m)" min-width="120">
                <template #default="{ $index }">
                  <el-input v-model="group.chars[$index].range" placeholder="请输入幅度" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="起重量(t)" min-width="120">
                <template #default="{ $index }">
                  <el-input v-model="group.chars[$index].capacity" placeholder="请输入起重量" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="130" align="center">
                <template #default="{ $index }">
                  <div style="display:flex;gap:4px;justify-content:center">
                    <el-button v-if="!isHqSelected" link type="danger" size="small" @click="removeTechRow(group.chars, $index)">删除</el-button>
                    <el-button link type="primary" size="small" @click="addTechRow(group.chars)">添加一行</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <!-- 特性2+：卡片边框 -->
          <div v-else style="margin-top:16px;border:1px solid #e8e8e8;border-radius:8px;padding:16px;background:#fafafa">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <span style="font-size:14px;font-weight:600;color:#1f2329">特性{{ gi + 1 }}</span>
              <el-button link type="danger" size="small" @click="removeTechGroup(gi)">删除卡片</el-button>
            </div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <span style="font-size:13px;font-weight:600;white-space:nowrap">吊绳倍率：</span>
              <el-select v-model="group.ropeRatio" style="width:200px" placeholder="请选择吊绳倍率">
                <el-option label="2倍率" value="2" /><el-option label="4倍率" value="4" /><el-option label="6倍率" value="6" />
              </el-select>
            </div>
            <div style="font-size:13px;font-weight:600;color:#1f2329;margin-bottom:8px">塔吊特性</div>
            <el-table :data="group.chars" border size="small" style="width:100%">
              <el-table-column label="幅度(m)" min-width="120">
                <template #default="{ $index }">
                  <el-input v-model="group.chars[$index].range" placeholder="请输入幅度" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="起重量(t)" min-width="120">
                <template #default="{ $index }">
                  <el-input v-model="group.chars[$index].capacity" placeholder="请输入起重量" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="操作" min-width="130" align="center">
                <template #default="{ $index }">
                  <div style="display:flex;gap:4px;justify-content:center">
                    <el-button v-if="!isHqSelected" link type="danger" size="small" @click="removeTechRow(group.chars, $index)">删除</el-button>
                    <el-button link type="primary" size="small" @click="addTechRow(group.chars)">添加一行</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 添加特性卡片 -->
        <div style="margin-top:16px">
          <el-button size="small" @click="addTechGroup">+ 添加特性</el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="techCharVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTechChars">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.device-page { padding:0; }
.page-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.page-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.total-count { font-size:12px; color:#999; }
.filter-bar { display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
.el-table { font-size:13px; }
.page-layout { display:flex; gap:0; width:100%; }
.page-panel { flex:1; min-width:0; }
.project-tree-panel { width:220px; flex-shrink:0; margin-right:20px; }
.panel-title { font-size:13px; font-weight:600; color:#1f2329; margin-bottom:10px; padding-left:8px; border-left:3px solid #8f0045; }
.project-tree { font-size:13px; }
.project-tree :deep(.el-tree-node__content) { height:36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background:#fceef4; color:#8f0045; font-weight:600; }

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
