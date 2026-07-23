<script setup>
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { machineTypeList, machineAttrOptions } from '../../mock/machineTypes.js'

const router = useRouter()
const form = reactive({
  docNo: 'RJ' + Date.now().toString().slice(-8),
  entryType: '租赁', entryDate: '', supplier: '', supplierContact: '', supplierPhone: '',
  machineType: '', machineAttr: '', remark: ''
})
const equipmentList = ref([])
const addDialogVisible = ref(false)
watch(() => form.machineType, (val) => {
  const found = machineTypeList.find((t) => t.name === val)
  if (found) form.machineAttr = found.attr
  else form.machineAttr = ''
})
const newDevice = reactive({
  deviceCode: '', recordNo: '', factoryNo: '', name: '', spec: '',
  prodDate: '', manufacturer: '', admin: '', adminPhone: '', remark: ''
})
const editingIdx = ref(-1)

function getTodayCodePart() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function buildDeviceCode() {
  const seq = String(equipmentList.value.length + 1).padStart(3, '0')
  return `JXSB${getTodayCodePart()}${seq}`
}

function goBack() { router.back() }
function submitForm() {
  if (!form.entryDate) { ElMessage.warning('请选择进场日期'); return }
  if (equipmentList.value.length === 0) { ElMessage.warning('请至少新增一台设备'); return }
  ElMessage.success('设备进场登记已提交')
  router.back()
}

function openAddDevice() {
  editingIdx.value = -1
  Object.keys(newDevice).forEach(k => newDevice[k] = '')
  newDevice.deviceCode = buildDeviceCode()
  addDialogVisible.value = true
}

function editDevice(idx) {
  editingIdx.value = idx
  Object.assign(newDevice, equipmentList.value[idx])
  addDialogVisible.value = true
}

function saveDevice() {
  if (!newDevice.name || !newDevice.spec) {
    ElMessage.warning('请填写完整设备信息（带*字段）'); return
  }
  if (editingIdx.value >= 0) {
    Object.assign(equipmentList.value[editingIdx.value], { ...newDevice })
  } else {
    if (!newDevice.deviceCode) newDevice.deviceCode = buildDeviceCode()
    equipmentList.value.push({ ...newDevice })
  }
  addDialogVisible.value = false
}

function deleteDevice(idx) {
  ElMessageBox.confirm('确认删除该设备？', '提示', { type: 'warning' }).then(() => {
    equipmentList.value.splice(idx, 1)
  }).catch(() => {})
}
</script>

<template>
  <div class="form-page">
    <div class="form-head">
      <el-button text @click="goBack">← 返回</el-button>
      <h3 class="form-title">设备进场登记</h3>
    </div>
    <div class="form-body">
      <el-form :model="form" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="单据编码"><el-input v-model="form.docNo" disabled /></el-form-item></el-col>
          <el-col :span="8">
            <el-form-item label="进场类型" required>
              <el-select v-model="form.entryType" style="width:100%">
                <el-option label="租赁" value="租赁" /><el-option label="自有" value="自有" /><el-option label="分包自带" value="分包自带" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="进场日期" required>
              <el-date-picker v-model="form.entryDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="设备供应商" required>
              <el-input v-model="form.supplier" placeholder="请输入" />
            </el-form-item>
          </el-col>
          <el-col :span="8"><el-form-item label="供应商联系人"><el-input v-model="form.supplierContact" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="供应商联系人电话"><el-input v-model="form.supplierPhone" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="机械类型" required>
              <el-select v-model="form.machineType" style="width:100%" placeholder="请选择">
                <el-option v-for="t in machineTypeList" :key="t.name" :label="t.name" :value="t.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="机械属性" required>
              <el-select v-model="form.machineAttr" style="width:100%">
                <el-option v-for="a in machineAttrOptions" :key="a" :label="a" :value="a" />
              </el-select>
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
        <span style="font-size:14px;font-weight:600">进场设备列表</span>
        <el-button type="primary" size="small" @click="openAddDevice">新增设备</el-button>
      </div>
      <el-table :data="equipmentList" border size="small" style="width:100%">
        <el-table-column type="index" label="序号" width="50" align="center" />
        <el-table-column prop="recordNo" label="备案编号" width="120" />
        <el-table-column prop="factoryNo" label="出厂编号" width="110" />
        <el-table-column prop="name" label="机械设备名称" min-width="130" />
        <el-table-column prop="spec" label="规格型号" width="100" />
        <el-table-column prop="prodDate" label="生产日期" width="90" align="center" />
        <el-table-column prop="manufacturer" label="生产厂商" min-width="130" />
        <el-table-column prop="admin" label="设备管理员" width="80" align="center" />
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ $index }">
            <el-button link type="primary" size="small" @click="editDevice($index)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteDevice($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top:24px;text-align:center">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" @click="submitForm">提交</el-button>
      </div>
    </div>

    <!-- 新增/编辑机械设备弹窗 -->
    <el-dialog v-model="addDialogVisible" :title="editingIdx >= 0 ? '编辑机械设备' : '新增机械设备'" width="520px" :close-on-click-modal="false">
      <el-form :model="newDevice" label-width="110px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="机械设备编码"><el-input v-model="newDevice.deviceCode" disabled /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="备案编号"><el-input v-model="newDevice.recordNo" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="出厂编号"><el-input v-model="newDevice.factoryNo" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="机械设备名称" required><el-input v-model="newDevice.name" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="规格型号" required><el-input v-model="newDevice.spec" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="生产日期"><el-date-picker v-model="newDevice.prodDate" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="生产厂商"><el-input v-model="newDevice.manufacturer" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="设备管理员"><el-select v-model="newDevice.admin" placeholder="请选择" style="width:100%"><el-option label="王工" value="王工" /><el-option label="李工" value="李工" /><el-option label="张工" value="张工" /><el-option label="陈工" value="陈工" /></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="设备管理员电话"><el-input v-model="newDevice.adminPhone" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="备注"><el-input v-model="newDevice.remark" maxlength="20" show-word-limit /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDevice">确认</el-button>
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
