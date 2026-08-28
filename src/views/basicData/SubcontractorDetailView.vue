<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getSubcontractorDetail,
  approveStatusTagClass,
  isSubcontractorInApproval,
  canAccessSubcontractorDetail,
  canWithdrawSubcontractor,
  withdrawSubcontractorApplication,
  cloneSubcontractorApplication,
  canResubmitSubcontractor,
} from '../../mock/subcontractorManagement'
import { discardSubcontractorTodos } from '../../mock/personalCenter'
import SubcontractorDetailBody from '../../components/basicData/SubcontractorDetailBody.vue'
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected, laborProjectId } = useCurrentProject()
const detail = ref(null)

onMounted(() => {
  const row = getSubcontractorDetail(route.params.id)
  if (!row) {
    ElMessage.warning('未找到分包单位报审信息')
    router.replace({ name: 'SubcontractorList' })
    return
  }
  const allowed = canAccessSubcontractorDetail(row, {
    isHq: isHqSelected.value,
    projectId: laborProjectId.value,
  })
  if (!allowed) {
    ElMessage.warning(
      isHqSelected.value ? '指挥部仅可查看已通过的报审' : '无权查看非本项目的报审单',
    )
    router.replace({ name: 'SubcontractorList' })
    return
  }
  detail.value = row
})

const pageListTitle = computed(() => (isHqSelected.value ? '分包单位管理' : '分包单位报审'))

const showReadonlyHint = computed(
  () => detail.value && isSubcontractorInApproval(detail.value.status),
)

const showWithdraw = computed(
  () => !isHqSelected.value && detail.value && canWithdrawSubcontractor(detail.value.status),
)

const showResubmit = computed(
  () => !isHqSelected.value && detail.value && canResubmitSubcontractor(detail.value.status),
)

function goBack() {
  router.push({ name: 'SubcontractorList' })
}

async function handleWithdraw() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('确认撤回该报审？仅待审批时可撤回。', '撤回报审', {
      type: 'warning',
      confirmButtonText: '确认撤回',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const r = withdrawSubcontractorApplication(detail.value.id)
  if (!r.ok) return ElMessage.warning(r.msg)
  if (r.needDiscardTodos) discardSubcontractorTodos(detail.value.id)
  detail.value = cloneSubcontractorApplication(r.data)
  ElMessage.success('已撤回报审')
}

function handleResubmit() {
  if (!detail.value) return
  router.push({
    name: 'SubcontractorList',
    query: { resubmitId: detail.value.id },
  })
}
</script>

<template>
  <div v-if="detail" class="detail-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / {{ pageListTitle }} / 详情</div>
      <div class="page-heading">
        <div class="title-block">
          <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
          <div>
            <h1 class="page-title">{{ detail.name }}</h1>
            <div class="sub-meta">
              <span>{{ detail.projectName }}</span>
              <span>{{ detail.unitType }}</span>
              <span class="ap-status-tag" :class="approveStatusTagClass(detail.status)">{{ detail.status }}</span>
              <span v-if="detail.submitTime">提交：{{ detail.submitTime }}</span>
              <span v-if="detail.rejectedFromId">关联驳回单：{{ detail.rejectedFromId }}</span>
            </div>
          </div>
        </div>
        <div v-if="showWithdraw || showResubmit" class="header-actions">
          <el-button v-if="showWithdraw" type="warning" plain @click="handleWithdraw">撤回</el-button>
          <el-button v-if="showResubmit" type="primary" @click="handleResubmit">重新报审</el-button>
        </div>
      </div>
    </div>

    <PersonalCenterReadonlyHint v-if="showReadonlyHint" />

    <SubcontractorDetailBody :detail="detail" show-approval />
  </div>
</template>

<style scoped>
.detail-page {
  padding: 20px 24px 28px;
}

.page-header {
  margin-bottom: 20px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 0 0 6px;
}

.sub-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
</style>
