<script setup>
/**
 * 一期系统功能入口占位页
 *
 * 用途：一期功能已登记到二期侧栏（跳转式集成），点击菜单默认直接新窗口打开一期页面；
 * 本页作为兜底——当浏览器拦截弹窗、或用户通过标签页/直达路由进入时，展示入口说明与手动打开按钮。
 *
 * 范围：只做页面跳转，不复制一期业务页面、不做数据/审批集成。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  PHASE1_BASE_URL,
  PHASE1_LOGIN_TIP,
  PHASE1_SYSTEM_NAME,
  buildPhase1Url,
} from '../../config/phase1'
import { openPhase1ByHashPath, resolvePhase1OrgId } from '../../utils/phase1Jump'

const props = defineProps({
  externalJump: { type: Object, default: () => ({}) },
  pageTitle: { type: String, default: '' },
})

const router = useRouter()
const title = computed(() => props.pageTitle || '一期功能')
const hashPath = computed(() => String(props.externalJump?.hashPath || ''))
const verified = computed(() => props.externalJump?.verified !== false)
const orgId = computed(() => resolvePhase1OrgId())
const url = computed(() => buildPhase1Url(hashPath.value, { orgId: orgId.value }))

function openTarget() {
  if (!hashPath.value) {
    ElMessage.warning('未配置一期页面地址')
    return
  }
  openPhase1ByHashPath(hashPath.value, title.value)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value)
    ElMessage.success('已复制一期页面地址')
  } catch (e) {
    ElMessage.warning('复制失败，请手动选择地址复制')
  }
}
</script>

<template>
  <div class="phase1-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ PHASE1_SYSTEM_NAME }} / {{ title }}</div>
      <h1 class="page-title">{{ title }} · 一期系统入口</h1>
      <p class="page-tip">
        该功能由一期系统承载，二期仅提供入口（跳转式集成，不复制页面、不做数据打通）。
        点击下方按钮将在新窗口打开一期对应页面。
      </p>
    </div>

    <el-card shadow="never" class="mb">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="目标系统">{{ PHASE1_SYSTEM_NAME }}</el-descriptions-item>
        <el-descriptions-item label="系统地址">{{ PHASE1_BASE_URL }}</el-descriptions-item>
        <el-descriptions-item label="目标页面">
          <code>{{ hashPath || '--' }}</code>
          <el-tag v-if="!verified" size="small" type="warning" class="tag-gap">待核页面</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="携带组织 ID">
          <code>{{ orgId || '--' }}</code>
          <span class="muted">（一期侧接收后切换门户/组织，参数名见 config/phase1.js）</span>
        </el-descriptions-item>
        <el-descriptions-item label="登录说明">{{ PHASE1_LOGIN_TIP }}</el-descriptions-item>
      </el-descriptions>

      <div class="actions">
        <el-button type="primary" @click="openTarget">打开一期系统</el-button>
        <el-button @click="copyLink">复制链接</el-button>
        <el-button @click="router.push('/workbench')">返回工作台</el-button>
      </div>
    </el-card>

    <el-alert
      v-if="!verified"
      type="warning"
      :closable="false"
      title="该页面依赖模型加载或低代码子应用，打开可能需要等待；如长期打不开请联系一期系统维护方。"
    />
  </div>
</template>

<style scoped>
.phase1-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0 0 8px; font-size: 13px; color: #606266; }
.mb { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; margin-left: 6px; }
.tag-gap { margin-left: 8px; }
.actions { margin-top: 16px; display: flex; gap: 8px; }
code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; }
</style>
