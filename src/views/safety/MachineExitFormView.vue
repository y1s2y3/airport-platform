<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const form = reactive({
  docNo: 'TC' + Date.now().toString().slice(-8),
  exitDate: '', remark: ''
})
const equipmentList = ref([])
const selectDialogVisible = ref(false)
const deviceKeyword = ref('')
const selectedEquipment = ref([])

const availableEquipment = [
  { id:'mac-001', recordNo:'渝U-T00789', factoryNo:'1012T002318', name:'塔吊QTZ160（#1）', spec:'QTZ160', machineType:'塔吊', machineAttr:'大型设备', entryType:'租赁' },
  { id:'mac-002', recordNo:'渝U-T00790', factoryNo:'1012T002319', name:'塔吊QTZ160（#1）', spec:'WA6515-8', machineType:'塔吊', machineAttr:'大型设备', entryType:'租赁' },
  { id:'mac-003', recordNo:'渝U-T00791', factoryNo:'XUG025P123', name:'塔吊QTZ80（#7）', spec:'QTZ250', machineType:'塔吊', machineAttr:'大型设备', entryType:'租赁' },
  { id:'mac-004', recordNo:'渝JB-S01946', factoryNo:'220431782', name:'升降机SC200（#2）', spec:'SC200/200', machineType:'升降机', machineAttr:'大型设备', entryType:'租赁' },
  { id:'mac-005', recordNo:'渝JB-S01947', factoryNo:'220431781', name:'升降机SC200（#4）', spec:'SC200/200', machineType:'升降机', machineAttr:'大型设备', entryType:'租赁' },
]
const filteredAvailableEquipment = computed(() => {
  if (!deviceKeyword.value) return availableEquipment
  const kw = deviceKeyword.value
  return availableEquipment.filter(d =>
    d.name.includes(kw) ||
    d.recordNo.includes(kw) ||
    d.factoryNo.includes(kw) ||
    d.spec.includes(kw) ||
    d.machineType.includes(kw)
  )
})

function goBack() { router.back() }
function submitForm() {
  if (!form.exitDate) { ElMessage.warning('请选择退场日期'); return }
  if (equipmentList.value.length === 0) { ElMessage.warning('请至少选择一台设备'); return }
  ElMessage.success('设备退场登记已提交')
  router.back()
}

function openSelectDevice() {
  selectedEquipment.value = []
  selectDialogVisible.value = true
}

function handleSelectionChange(rows) {
  selectedEquipment.value = rows
}

function confirmSelectDevices() {
  if (!selectedEquipment.value.length) {
    ElMessage.warning('请选择设备'); return
  }
  const added = []
  selectedEquipment.value.forEach((row) => {
    if (!equipmentList.value.find(d => d.id === row.id)) {
      equipmentList.value.push({ ...row })
      added.push(row.name)
    }
  })
  if (!added.length) {
    ElMessage.warning('所选设备已添加')
    return
  }
  ElMessage.success(`已添加 ${added.length} 台设备`)
  selectDialogVisible.value = false
}

function removeDevice(idx) {
  ElMessageBox.confirm('确认移除此设备？', '提示', { type: 'warning' }).then(() => {
    equipmentList.value.splice(idx, 1)
  }).catch(() => {})
}
</script>

<template>
  <div class="form-page">
    <div class="form-head">
      <el-button text @click="goBack">← 返回</el-button>
      <h3 class="form-title">设备退场登记</h3>
    </div>
    <div class="form-body">
      <el-form :model="form" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="单据编码"><el-input v-model="form.docNo" disabled /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="退场日期" required>
              <el-date-picker v-model="form.exitDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" aria-label="选择日期"/>
            </el-form-item>
          </el-col>
          <el-col :span="8" />
        </el-row>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item label="相关附件">
              <el-upload action="#" :auto-upload="false" list-type="text">
                <el-button size="small">选择文件</el-button>
                <template #tip><div style="font-size:12px;color:#999">支持 doc/docx/pdf/jpg/png 格式</div></template>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit /></el-form-item>
      </el-form>

      <el-divider />
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-size:14px;font-weight:600">退场设备列表</span>
        <el-button type="primary" size="small" @click="openSelectDevice">选择设备</el-button>
      </div>
      <el-table :data="equipmentList" border size="small" style="width:100%">
        <el-table-column type="index" label="序号" width="50" align="center" />
        <el-table-column prop="recordNo" label="备案编号" width="120" />
        <el-table-column prop="factoryNo" label="出厂编号" width="110" />
        <el-table-column prop="name" label="机械设备名称" min-width="130" />
        <el-table-column prop="spec" label="规格型号" width="100" />
        <el-table-column prop="machineType" label="机械类型" width="80" align="center" />
        <el-table-column prop="machineAttr" label="机械属性" width="80" align="center" />
        <el-table-column prop="entryType" label="进场类型" width="70" align="center" />
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="removeDevice($index)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:24px;text-align:center">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
      </div>
    </div>

    <!-- 选择在场设备弹窗 -->
    <el-dialog v-model="selectDialogVisible" title="选择在场机械设备" width="800px" :close-on-click-modal="false">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:13px;color:#333">设备</span>
        <el-input v-model="deviceKeyword" placeholder="搜索设备名称/备案编号/出厂编号..." clearable style="width:280px" aria-label="搜索设备名称/备案编号/出厂编号..."/>
      </div>
      <el-table :data="filteredAvailableEquipment" border size="small" style="width:100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" align="center" />
        <el-table-column type="index" label="序号" width="50" align="center" />
        <el-table-column prop="recordNo" label="备案编号" width="120" />
        <el-table-column prop="factoryNo" label="出厂编号" width="110" />
        <el-table-column prop="name" label="机械设备名称" min-width="130" />
        <el-table-column prop="spec" label="规格型号" width="100" />
        <el-table-column prop="machineType" label="机械类型" width="80" align="center" />
        <el-table-column prop="machineAttr" label="机械属性" width="80" align="center" />
        <el-table-column prop="entryType" label="进场类型" width="70" align="center" />
      </el-table>
      <template #footer>
        <el-button @click="selectDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSelectDevices">确认选择</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.form-page { padding:0; }
.form-head { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.form-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.form-body { background:#fff; border-radius:8px; padding:24px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }

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
