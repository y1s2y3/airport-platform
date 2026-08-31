<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getSubcontractorDetail,
  isSubcontractorInApproval,
  canAccessSubcontractorDetail,
  canResubmitSubcontractor,
} from '../../mock/subcontractorManagement'
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

const showResubmit = computed(
  () => !isHqSelected.value && detail.value && canResubmitSubcontractor(detail.value.status),
)

function goBack() {
  router.push({ name: 'SubcontractorList' })
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
            <div v-if="detail.projectName || detail.rejectedFromId" class="sub-meta">
              <span v-if="detail.projectName">{{ detail.projectName }}</span>
              <span v-if="detail.rejectedFromId">关联驳回单：{{ detail.rejectedFromId }}</span>
            </div>
          </div>
        </div>
        <div v-if="showResubmit" class="header-actions">
          <el-button type="primary" @click="handleResubmit">重新报审</el-button>
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
