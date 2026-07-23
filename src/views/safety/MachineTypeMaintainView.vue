<script setup>
/**
 * 机械类型维护（项目级）
 */
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  machineTypeList,
  machineAttrOptions,
  addMachineType,
  removeMachineType,
} from '../../mock/machineTypes.js'

const newTypeName = ref('')
const newTypeAttr = ref('大型设备')

function handleAdd() {
  const r = addMachineType(newTypeName.value, newTypeAttr.value)
  if (!r.ok) {
    ElMessage.warning(r.msg)
    return
  }
  newTypeName.value = ''
  newTypeAttr.value = '大型设备'
  ElMessage.success('已添加')
}

function handleRemove(idx) {
  const name = machineTypeList[idx]?.name || ''
  ElMessageBox.confirm(`确认删除「${name}」？`, '提示', { type: 'warning' })
    .then(() => {
      removeMachineType(idx)
      ElMessage.success('已删除')
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">机械设备台账 / 机械类型维护</div>
        <h3 class="page-title">机械类型维护</h3>
        <p class="page-tip">维护本项目可用的机械类型与属性，供设备进场登记选用。</p>
      </div>
      <span class="total-count">共 {{ machineTypeList.length }} 种</span>
    </div>

    <div class="toolbar">
      <el-input v-model="newTypeName" placeholder="输入类型名称" clearable style="width: 220px" />
      <el-select v-model="newTypeAttr" placeholder="机械属性" style="width: 140px">
        <el-option v-for="a in machineAttrOptions" :key="a" :label="a" :value="a" />
      </el-select>
      <el-button type="primary" @click="handleAdd">添加</el-button>
    </div>

    <el-table :data="machineTypeList" border stripe class="ap-table" style="width: 100%">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="机械类型" min-width="180" />
      <el-table-column prop="attr" label="机械属性" min-width="140" align="center" />
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ $index }">
          <el-button link type="danger" size="small" @click="handleRemove($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.page-title {
  margin: 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.total-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  padding-top: 8px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.ap-table {
  font-size: 13px;
}
</style>
