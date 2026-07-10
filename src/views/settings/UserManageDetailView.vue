<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getSysUser } from '../../mock/sysUsers'
import { getOrgNodeOptions, getOrgPositions } from '../../mock/orgStructure'

const route = useRoute()
const router = useRouter()
const detail = ref(null)

const orgLabelMap = computed(() =>
  Object.fromEntries(getOrgNodeOptions().map((item) => [item.value, item.label])),
)

const positionLabels = computed(() => {
  if (!detail.value) return []
  return (detail.value.positions || [])
    .filter(Boolean)
    .map((id) => {
      const pos = getOrgPositions(detail.value.orgId).find((item) => item.id === id)
      return pos?.name || id
    })
})

onMounted(() => {
  detail.value = getSysUser(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到用户信息')
    router.replace({ name: 'Sysuser' })
  }
})

function goBack() {
  router.push({ name: 'Sysuser' })
}

function goEdit() {
  router.push({ name: 'SysUserEdit', params: { id: detail.value.id } })
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="detail-header">
      <el-button text class="back-btn" :icon="ArrowLeft" @click="goBack">返回</el-button>
      <h1 class="detail-title">用户详情</h1>
      <el-button type="primary" class="ap-btn-primary" :icon="Edit" @click="goEdit">编辑</el-button>
    </div>

    <section class="detail-section">
      <div class="section-title">基本信息</div>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="姓名">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="登录账号">{{ detail.loginAccount }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="性别">{{ detail.gender || '—' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detail.phone }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email }}</el-descriptions-item>
        <el-descriptions-item label="所属组织">
          {{ orgLabelMap[detail.orgId] || detail.orgId || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="岗位" :span="2">
          {{ positionLabels.length ? positionLabels.join('、') : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail.status ? 'success' : 'info'">{{ detail.status ? '启用' : '停用' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </section>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 16px 20px 24px;
  min-height: calc(100vh - 120px);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ap-border-light);
}

.back-btn {
  padding-left: 0;
  font-size: 14px;
}

.detail-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text-primary);
  flex: 1;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text-primary);
  margin-bottom: 12px;
}
</style>
