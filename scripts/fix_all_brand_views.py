# -*- coding: utf-8 -*-
"""Rewrite all brand views as UTF-8 (fix prior encoding corruption)."""
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "views" / "quality" / "brand"


def w(name: str, content: str) -> None:
    (BASE / name).write_text(content.replace("\r\n", "\n"), encoding="utf-8", newline="\n")


w(
    "BrandLedgerView.vue",
    r"""<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { listLedger, MATERIAL_TYPE, statusTagType, STATUS_LABEL } from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')

const list = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listLedger(scopeProjectId.value, { keyword: keyword.value })
})

function reset() {
  keyword.value = ''
}

function openDetail(row) {
  router.push(`/qm/brand/applications/detail?id=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 品牌报审台账</div>
      <h1 class="page-title">品牌报审台账</h1>
      <p class="page-tip">
        已通过报审视图 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
        · 按品牌名称、厂家、材料名称查询
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="品牌报审台账为项目级视图，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="品牌 / 厂家 / 材料名称 / 报审编号"
          style="width: 280px"
          :prefix-icon="Search"
        />
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无已通过报审记录">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="application_id" label="报审编号" width="130" />
        <el-table-column prop="material_name" label="材料/设备名称" min-width="140" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] || row.material_type }}</template>
        </el-table-column>
        <el-table-column prop="spec_text" label="规格型号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="selected_brand" label="入选品牌" width="120" />
        <el-table-column prop="selected_manufacturer" label="生产厂家" min-width="180" show-overflow-tooltip />
        <el-table-column prop="use_part" label="使用部位" width="110" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="finish_time" label="办结时间" width="170" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
</style>
""",
)

print("wrote BrandLedgerView")

# Keep library/material from previous script content by re-importing
from fix_brand_views_encoding import main as fix_lib_mat

fix_lib_mat()

# Verify all utf-8
for p in BASE.glob("*.vue"):
    text = p.read_text(encoding="utf-8")
    assert "品牌报审" in text or "Brand" in p.name
    print("ok", p.name)
