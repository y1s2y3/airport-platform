<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  projectList,
  createEmptyProject,
  createProjectFields,
  validateProjectPortraitRequired,
  displayProjectManagerName,
} from '../../mock/projectBasicInfo'
import { mergeSafetyProfile } from '../../mock/projectSafetyProfile'
import ProjectSafetyProfileForm from '../../components/basicData/ProjectSafetyProfileForm.vue'

const router = useRouter()
const model = ref(null)

onMounted(() => {
  model.value = createEmptyProject()
})

function goBack() {
  router.push({ name: 'ProjectBasicInfo' })
}

function handleSave() {
  const data = model.value
  const check = validateProjectPortraitRequired(data)
  if (!check.ok) {
    ElMessage.warning(check.msg)
    return
  }

  data.projectName = data.projectName.trim()
  data.shortName = data.shortName.trim()
  data.projectManagerContact = data.projectManagerContact.trim()
  const managerName = displayProjectManagerName(data)
  if (managerName) data.personInCharge = managerName

  const saved = {
    ...data,
    ...createProjectFields(data),
    safetyProfile: mergeSafetyProfile(data.safetyProfile),
  }
  projectList.unshift(saved)
  ElMessage.success('新增成功')
  router.replace({
    name: 'ProjectPortrait',
    params: { id: saved.id },
  })
}
</script>

<template>
  <div class="portrait-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目信息管理 / 新增项目</div>
      <div class="page-heading">
        <div class="title-block">
          <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
          <h1 class="page-title">新增项目画像</h1>
        </div>
        <div class="header-actions">
          <el-button @click="goBack">取消</el-button>
          <el-button class="ap-btn-primary" type="primary" @click="handleSave">保存</el-button>
        </div>
      </div>
    </div>

    <div v-if="model" class="portrait-body">
      <ProjectSafetyProfileForm :model="model" :readonly="false" />
    </div>
  </div>
</template>

<style scoped>
.portrait-page {
  padding: 20px 24px 28px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.portrait-body {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 18px 20px;
}
</style>
