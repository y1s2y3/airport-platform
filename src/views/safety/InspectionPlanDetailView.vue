<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FolderOpened } from '@element-plus/icons-vue'
import { getPlanById, userOptions, projectOptions, checkCategoryTree, getItemLabel } from '../../composables/useInspectionPlan'

const route = useRoute()
const router = useRouter()
const plan = computed(() => getPlanById(route.params.id))

const getExecLabel = computed(() => {
  if (!plan.value) return ''
  const u = userOptions.find(u => u.id === plan.value.responsiblePerson)
  return u ? `${u.label}（${u.role}）` : ''
})
const getCcLabels = computed(() => {
  if (!plan.value) return '无'
  return plan.value.ccPersons.map(id => { const u = userOptions.find(u => u.id === id); return u ? `${u.label}（${u.role}）` : '' }).join('；') || '无'
})
const getProjLabels = computed(() => {
  if (!plan.value) return []
  return plan.value.projectIds.map(id => projectOptions.find(p => p.id === id)?.label || '').filter(Boolean)
})
const getPushRule = computed(() => {
  if (!plan.value) return ''
  const map = { day: '天', week: '周', month: '月', once: '' }
  if (plan.value.cycleType === 'once') return '有效期内执行 1 次巡检'
  return `每 ${plan.value.cycleInterval} ${map[plan.value.cycleType]} 需进行 ${plan.value.cycleTimes} 次巡检`
})

// 检查内容树形结构
const checkConfigTree = computed(() => {
  if (!plan.value?.checkConfig) return []
  return plan.value.checkConfig.map(cfg => {
    const cat = checkCategoryTree.find(c => c.id === cfg.categoryId)
    const items = cfg.itemIds.map(id => ({
      id,
      label: getItemLabel(cfg.categoryId, id),
    }))
    return { categoryId: cfg.categoryId, categoryLabel: cat?.label || cfg.categoryId, items }
  })
})

// 详情页左树右项
const detailTreeActive = ref('')
const detailTreeItems = computed(() => {
  if (!detailTreeActive.value) return []
  const cfg = checkConfigTree.value.find(c => c.categoryId === detailTreeActive.value)
  return cfg?.items || []
})

// 自动选中第一个分类
watch(checkConfigTree, (val) => {
  if (val.length > 0 && !detailTreeActive.value) {
    detailTreeActive.value = val[0].categoryId
  }
}, { immediate: true })

function goBack() { router.push('/safety-inspection/plan') }
</script>

<template>
  <div class="page-card detail-page">
    <div class="detail-nav">
      <el-button text @click="goBack">← 返回巡检计划列表</el-button>
    </div>
    <el-divider />

    <div v-if="plan">
      <div class="detail-header">
        <div class="detail-title-row">
          <h3 class="detail-title">{{ plan.name }}</h3>
          <el-tag :type="plan.enabled ? 'success' : 'info'" size="large" effect="light">
            {{ plan.enabled ? '启用' : '禁用' }}
          </el-tag>
        </div>
        <span class="detail-meta">
          更新人：{{ userOptions.find((u) => u.id === plan.updatedBy)?.label || plan.updatedBy || '-' }}
          · 更新时间：{{ plan.updatedAt }}
        </span>
      </div>

      <!-- ===== 基本信息 ===== -->
      <div class="detail-card">
        <h4 class="section-title">基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="计划名称" :span="2">{{ plan.name }}</el-descriptions-item>
          <el-descriptions-item label="计划编号">{{ plan.planNo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="计划类型">
            <el-tag v-if="plan.type==='周检'" size="small" effect="plain">周检</el-tag>
            <el-tag v-else-if="plan.type==='月检'" size="small" type="warning" effect="plain">月检</el-tag>
            <el-tag v-else size="small" type="danger" effect="plain">专项巡检</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="plan.enabled ? 'success' : 'info'" size="small" effect="light">{{ plan.enabled ? '启用' : '禁用' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联项目" :span="2">{{ getProjLabels.join('、') }}</el-descriptions-item>
          <el-descriptions-item label="更新人">
            {{ userOptions.find((u) => u.id === plan.updatedBy)?.label || plan.updatedBy || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ plan.updatedAt }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- ===== 执行规则 ===== -->
      <div class="detail-card">
        <h4 class="section-title">执行规则</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行人">{{ getExecLabel }}</el-descriptions-item>
          <el-descriptions-item label="抄送人">{{ getCcLabels }}</el-descriptions-item>
          <el-descriptions-item label="推送规则" :span="2">{{ getPushRule }}</el-descriptions-item>
          <el-descriptions-item label="生效日期" :span="2">{{ plan.startDate }} ~ {{ plan.endDate }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ plan.remark || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- ===== 检查内容（左树右项） ===== -->
      <div class="detail-card">
        <h4 class="section-title">检查内容</h4>
        <div v-if="checkConfigTree.length" class="detail-tree-layout">
          <div class="detail-tree-left">
            <div
              v-for="cfg in checkConfigTree"
              :key="cfg.categoryId"
              class="detail-tree-cat"
              :class="{ active: detailTreeActive === cfg.categoryId }"
              @click="detailTreeActive = cfg.categoryId"
            >
              <el-icon :size="16" color="var(--ap-primary)"><FolderOpened /></el-icon>
              <span class="dt-cat-label">{{ cfg.categoryLabel }}</span>
              <span class="dt-cat-count">{{ cfg.items.length }} 项</span>
            </div>
          </div>
          <div class="detail-tree-right">
            <div v-if="detailTreeItems.length" class="dt-items">
              <div v-for="(item, i) in detailTreeItems" :key="item.id" class="dt-item">
                <span class="dt-num">{{ i + 1 }}.</span>
                <span class="dt-text">{{ item.label }}</span>
              </div>
            </div>
            <div v-else class="dt-empty">请从左侧选择一个分类</div>
          </div>
        </div>
        <div v-else class="text-muted" style="padding:20px 0;text-align:center">未配置检查内容</div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>未找到该巡检计划</p>
      <el-button @click="goBack">返回列表</el-button>
    </div>
  </div>
</template>

<style scoped>
.detail-nav { display: flex; align-items: center; justify-content: space-between; }
.detail-header { margin-bottom: 24px; }
.detail-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.detail-title { font-size: 20px; font-weight: 700; color: var(--ap-text); margin: 0; }
.detail-meta { font-size: 12px; color: var(--ap-text-muted); }
.detail-card { background: var(--ap-card); border: 1px solid var(--ap-border); border-radius: 8px; padding: 20px 24px; margin-bottom: 16px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--ap-text); margin: 0 0 16px 0; padding-left: 10px; border-left: 3px solid var(--ap-primary); }
.text-muted { color: var(--ap-text-muted); font-size: 13px; }
.empty-state { text-align: center; padding: 60px 0; color: var(--ap-text-muted); }

/* ===== 详情页检查内容：左树右项 ===== */
.detail-tree-layout { display: flex; border: 1px solid var(--ap-border); border-radius: 6px; overflow: hidden; }
.detail-tree-left { width: 200px; flex-shrink: 0; border-right: 1px solid var(--ap-border); background: #fafafa; padding: 6px 0; }
.detail-tree-cat { display: flex; align-items: center; gap: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.detail-tree-cat:hover { background: var(--ap-primary-muted); }
.detail-tree-cat.active { background: var(--ap-primary-light); }
.dt-cat-label { font-weight: 500; color: var(--ap-text); flex: 1; min-width: 0; }
.dt-cat-count { font-size: 11px; color: var(--ap-text-muted); flex-shrink: 0; }
.detail-tree-right { flex: 1; padding: 12px 16px; min-height: 120px; }
.dt-items { display: flex; flex-direction: column; gap: 4px; }
.dt-item { display: flex; gap: 6px; font-size: 13px; color: var(--ap-text-secondary); line-height: 1.6; padding: 3px 0; }
.dt-num { color: var(--ap-text-muted); flex-shrink: 0; }
.dt-text { flex: 1; }
.dt-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--ap-text-muted); font-size: 13px; min-height: 100px; }
</style>
