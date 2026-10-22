<script setup>
/**
 * 一期功能聚合页
 *
 * 用于分组条目较多/低频的一期模块（支付管理 8 项、资料档案 6 项、一期系统管理 12 项）：
 * 侧栏只留 1 个入口，页内以卡片形式展示该分组全部一期功能，仍为「新窗口跳转」。
 *
 * 范围：只做页面跳转入口，不复制一期页面、不做数据/审批打通。
 */
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  PHASE1_CATALOGS,
  PHASE1_ROLE_LABELS,
  listCatalogItems,
} from '../../config/phase1Menu'
import { PHASE1_LOGIN_TIP, PHASE1_SYSTEM_NAME, buildPhase1Url } from '../../config/phase1'
import { openPhase1ByItem, resolvePhase1OrgId } from '../../utils/phase1Jump'
import { getPhase1RoleLabels, resolvePhase1RoleIds } from '../../utils/phase1Role'

const props = defineProps({
  catalog: { type: String, default: 'system' },
  pageTitle: { type: String, default: '' },
})

const router = useRouter()
const route = useRoute()
const keyword = ref('')
/** 支持 ?role=HQ-03 预览；缺省按当前登录角色映射 */
const roleIds = computed(() => resolvePhase1RoleIds({ override: String(route.query.role || '') }))
const roleLabels = computed(() => getPhase1RoleLabels(roleIds.value))
const orgId = resolvePhase1OrgId()

const catalogMeta = computed(() => PHASE1_CATALOGS[props.catalog] || {})
const catalogTitle = computed(() => catalogMeta.value.label || props.pageTitle || '一期功能')

/** 该聚合页全部条目（含角色） */
const allItems = computed(() => listCatalogItems(props.catalog))

/** 按当前角色过滤后的可见条目 */
const visibleItems = computed(() => {
  const set = new Set(roleIds.value)
  return allItems.value.filter((item) => {
    const roles = item.roles || []
    return !roles.length || roles.some((role) => set.has(role))
  })
})

const filteredItems = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return visibleItems.value
  return visibleItems.value.filter(
    (item) => item.label.includes(kw) || String(item.hashPath || '').includes(kw),
  )
})

/* ---------- 最近使用（按组织ID分桶） ---------- */
const recentKey = `phase1-catalog-recent-v1-${orgId || 'default'}`
function readRecent() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(recentKey) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch (e) {
    return []
  }
}
const recentKeys = ref(readRecent())
const recentItems = computed(() =>
  recentKeys.value
    .map((key) => visibleItems.value.find((item) => item.key === key))
    .filter(Boolean)
    .slice(0, 3),
)

function markRecent(key) {
  const next = [key, ...recentKeys.value.filter((item) => item !== key)].slice(0, 8)
  recentKeys.value = next
  try {
    window.localStorage.setItem(recentKey, JSON.stringify(next))
  } catch (e) {
    /* 忽略存储异常 */
  }
}

/* ---------- 跳转/复制 ---------- */
function openItem(item) {
  const ok = openPhase1ByItem(item)
  if (ok) markRecent(item.key)
}

async function copyItem(item) {
  try {
    await navigator.clipboard.writeText(buildPhase1Url(item.hashPath, { orgId }))
    ElMessage.success(`已复制「${item.label}」一期地址`)
  } catch (e) {
    ElMessage.warning('复制失败，请手动选择地址复制')
  }
}

function roleText(code) {
  return PHASE1_ROLE_LABELS[code] || code
}
</script>

<template>
  <div class="phase1-catalog page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ PHASE1_SYSTEM_NAME }} / {{ catalogTitle }}</div>
      <h1 class="page-title">{{ catalogTitle }} · 一期功能导航</h1>
      <p class="page-tip">
        该模块下共 {{ allItems.length }} 项一期功能，当前角色可见 {{ visibleItems.length }} 项。
        点击卡片将在新窗口打开一期对应页面（二期不复制页面、不做数据打通）。
      </p>
    </div>

    <el-alert type="info" :closable="false" class="mb">
      <template #title>
        当前授权角色：<b>{{ roleLabels.length ? roleLabels.join('、') : '全部登录用户（GN-01）' }}</b>
        <span class="muted">　携带组织 ID：{{ orgId || '--' }}</span>
      </template>
      {{ PHASE1_LOGIN_TIP }}
    </el-alert>

    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索一期功能名称或路径"
        clearable
        class="search"
        aria-label="搜索一期功能"
      />
      <el-button @click="router.push('/workbench')">返回工作台</el-button>
    </div>

    <el-card v-if="recentItems.length" shadow="never" class="mb">
      <template #header>最近使用</template>
      <div class="recent">
        <el-button v-for="item in recentItems" :key="`recent-${item.key}`" @click="openItem(item)">
          {{ item.label }}
        </el-button>
      </div>
    </el-card>

    <div v-if="filteredItems.length" class="cards">
      <el-card v-for="item in filteredItems" :key="item.key" shadow="hover" class="card">
        <div class="card-head">
          <span class="card-title">{{ item.label }}</span>
          <el-tag size="small" type="danger" effect="plain">一期</el-tag>
          <el-tag v-if="item.verified === false" size="small" type="warning" effect="plain">待核</el-tag>
        </div>
        <div class="card-path">
          <code>{{ item.hashPath }}</code>
        </div>
        <div v-if="(item.roles || []).length" class="card-roles">
          可见角色：{{ (item.roles || []).map(roleText).join('、') }}
        </div>
        <div class="card-actions">
          <el-button type="primary" size="small" @click="openItem(item)">打开一期</el-button>
          <el-button size="small" @click="copyItem(item)">复制链接</el-button>
        </div>
      </el-card>
    </div>

    <el-empty
      v-else
      :description="keyword ? '未找到匹配的一期功能' : '当前角色暂无该分组的一期入口权限'"
    />
  </div>
</template>

<style scoped>
.phase1-catalog { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0 0 8px; font-size: 13px; color: #606266; }
.mb { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.search { max-width: 320px; }
.recent { display: flex; flex-wrap: wrap; gap: 8px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.card-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.card-title { font-weight: 600; }
.card-path { margin-bottom: 6px; }
.card-path code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #606266; }
.card-roles { font-size: 12px; color: #909399; margin-bottom: 10px; }
.card-actions { display: flex; gap: 8px; }
</style>
