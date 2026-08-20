<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  projectList,
  createProjectFields,
  validateProjectPortraitRequired,
  displayProjectManagerName,
} from '../../mock/projectBasicInfo'
import { mergeSafetyProfile } from '../../mock/projectSafetyProfile'
import ProjectSafetyProfileForm from '../../components/basicData/ProjectSafetyProfileForm.vue'

const route = useRoute()
const router = useRouter()
const model = ref(null)
const editing = ref(false)

const projectId = computed(() => String(route.params.id || ''))

const pageTitle = computed(() => {
  const shortName = String(model.value?.shortName || '').trim()
  return shortName ? `项目画像：${shortName}` : '项目画像'
})

function loadProject() {
  const source = projectList.find((item) => item.id === projectId.value)
  if (!source) {
    ElMessage.warning('未找到项目')
    router.replace({ name: 'ProjectBasicInfo' })
    return
  }
  model.value = {
    ...source,
    ...createProjectFields(source),
    safetyProfile: mergeSafetyProfile(source.safetyProfile),
  }
}

function syncEditModeFromQuery() {
  editing.value = String(route.query.mode || '') === 'edit'
}

onMounted(() => {
  loadProject()
  syncEditModeFromQuery()
})

watch(
  () => route.query.mode,
  () => {
    syncEditModeFromQuery()
  },
)

watch(
  () => route.params.id,
  () => {
    loadProject()
    syncEditModeFromQuery()
  },
)

function goBack() {
  router.push({ name: 'ProjectBasicInfo' })
}

function enterEdit() {
  editing.value = true
  router.replace({
    name: 'ProjectPortrait',
    params: { id: projectId.value },
    query: { mode: 'edit' },
  })
}

function cancelEdit() {
  loadProject()
  editing.value = false
  router.replace({
    name: 'ProjectPortrait',
    params: { id: projectId.value },
  })
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

  const index = projectList.findIndex((item) => item.id === data.id)
  if (index === -1) {
    ElMessage.error('未找到要保存的项目')
    return
  }
  Object.assign(projectList[index], {
    ...data,
    safetyProfile: mergeSafetyProfile(data.safetyProfile),
  })
  ElMessage.success('保存成功')
  editing.value = false
  router.replace({
    name: 'ProjectPortrait',
    params: { id: projectId.value },
  })
  loadProject()
}
</script>

<template>
  <div class="portrait-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目基础信息 / 项目画像</div>
      <div class="page-heading">
        <div class="title-block">
          <el-button :icon="ArrowLeft" @click="goBack">返回列表</el-button>
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="header-actions">
          <template v-if="editing">
            <el-button @click="cancelEdit">取消</el-button>
            <el-button class="ap-btn-primary" type="primary" @click="handleSave">保存</el-button>
          </template>
          <el-button v-else class="ap-btn-primary" type="primary" @click="enterEdit">编辑</el-button>
        </div>
      </div>
    </div>

    <div v-if="model" class="portrait-body">
      <ProjectSafetyProfileForm :model="model" :readonly="!editing" />
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
