<script setup>
import { ref } from 'vue'
import HazardRegionView from './HazardRegionView.vue'

const activeType = ref('pit')

const typeOptions = [
  { label: '深基坑', value: 'pit' },
  { label: '地铁铁路', value: 'subway' },
  { label: '高支模', value: 'formwork' },
]

const typeTitles = { pit: '深基坑区域管理', subway: '地铁铁路区域管理', formwork: '高支模区域管理' }
const typeTips = {
  pit: '管理深基坑监测区域与监测点，一个区域可包含多个监测点，监测点可绑定监测设备。',
  subway: '管理地铁、铁路保护监测区域与监测点，适配狭长基坑多段分区场景。',
  formwork: '管理高支模变形监测区域与监测点，适配沉降、位移、倾斜等监测指标场景。',
}
</script>

<template>
  <div class="manage-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">危大工程监测 / 监测区域管理</div>
      <div class="page-heading">
        <h1 class="page-title">监测区域管理</h1>
        <el-radio-group v-model="activeType" size="small">
          <el-radio-button v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</el-radio-button>
        </el-radio-group>
      </div>
      <p class="page-tip">管理各类危大工程的监测区域与监测点。选择工程类型后，可对区域和监测点进行新增、编辑、删除及设备绑定操作。</p>
    </div>

    <HazardRegionView
      :key="activeType"
      :hazard-type="activeType"
      :title="typeTitles[activeType]"
      :breadcrumb="'危大工程监测 / ' + typeTitles[activeType]"
      :tip="typeTips[activeType]"
    />
  </div>
</template>

<style scoped>
.manage-page { padding: 20px 24px 0; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
</style>
