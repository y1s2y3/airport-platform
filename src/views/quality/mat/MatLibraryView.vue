<script setup>
import './mat-page.css'
import { useRouter } from 'vue-router'
import { useQmProjectScope } from '../../../composables/useCurrentProject'

const router = useRouter()
const { isHqSelected, scopeProjectLabel } = useQmProjectScope()
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料标准库</div>
      <h1 class="page-title">材料标准库</h1>
      <p class="page-tip">
        复用本项目品牌报审主数据（只读入口）。材料规格库与品牌库的维护在「品牌报审」模块。
        当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      class="mb"
      title="请切换到具体项目后查看本项目标准库入口"
    />

    <template v-else>
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="mb"
        title="本页为复用入口，不单独维护主数据，避免双份维护。"
      />

      <div class="stat-grid">
        <el-card
          shadow="hover"
          class="stat-card"
          style="cursor: pointer"
          @click="router.push('/qm/brand/materials')"
        >
          <div class="label">材料规格库</div>
          <div class="value" style="font-size: 16px; margin-top: 10px">前往品牌报审 · 材料规格库</div>
        </el-card>
        <el-card
          shadow="hover"
          class="stat-card"
          style="cursor: pointer"
          @click="router.push('/qm/brand/library')"
        >
          <div class="label">品牌库</div>
          <div class="value" style="font-size: 16px; margin-top: 10px">前往品牌报审 · 品牌库管理</div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
</style>
