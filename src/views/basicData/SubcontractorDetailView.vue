<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getSubcontractorDetail,
  approveStatusTagClass,
  isSubcontractorInApproval,
} from '../../mock/subcontractorManagement'
import SubcontractorDetailBody from '../../components/basicData/SubcontractorDetailBody.vue'
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected } = useCurrentProject()
const detail = ref(null)

onMounted(() => {
  detail.value = getSubcontractorDetail(route.params.id)
  if (!detail.value) {
    ElMessage.warning('未找到分包单位报审信息')
    router.replace({ name: 'SubcontractorList' })
  }
})

const pageListTitle = computed(() => (isHqSelected.value ? '分包单位管理' : '分包单位报审'))

const showReadonlyHint = computed(
  () => detail.value && isSubcontractorInApproval(detail.value.status),
)

function goBack() {
  router.push({ name: 'SubcontractorList' })
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
            </div>
          </div>
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
}

.title-block {
  display: flex;
  align-items: flex-start;
  gap: 12px;
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
