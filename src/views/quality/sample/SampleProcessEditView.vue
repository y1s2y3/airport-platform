<script setup>
import './sample-page.css'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { submitProcessApp } from '../../../mock/sample.js'
import SampleDemoRoleBar from './SampleDemoRoleBar.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const form = reactive({
  process_name: '',
  use_part: '',
  briefing_content: '',
  photo_text: '',
  video_text: '',
  remark: '',
})

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const photo_files = form.photo_text
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const video_files = form.video_text
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const r = submitProcessApp({
    project_id: scopeProjectId.value,
    process_name: form.process_name,
    use_part: form.use_part,
    briefing_content: form.briefing_content,
    photo_files,
    video_files,
    remark: form.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/sample/process/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板报审 / 新建</div>
      <h1 class="page-title">新建关键工序样板</h1>
      <p class="page-tip">项目：{{ isHqSelected ? '请先选项目' : scopeProjectLabel }}</p>
    </div>

    <SampleDemoRoleBar />

    <el-form label-width="112px" class="create-form">
      <el-form-item label="工序名称" required>
        <el-input v-model="form.process_name" placeholder="如：清水混凝土柱样板" maxlength="80" />
      </el-form-item>
      <el-form-item label="使用部位" required>
        <el-input v-model="form.use_part" placeholder="如：地下一层结构区" maxlength="80" />
      </el-form-item>
      <el-form-item label="技术交底" required>
        <el-input
          v-model="form.briefing_content"
          type="textarea"
          :rows="4"
          placeholder="交底要点（审批通过后供扫码查看）"
        />
      </el-form-item>
      <el-form-item label="现场照片">
        <el-input
          v-model="form.photo_text"
          type="textarea"
          :rows="2"
          placeholder="Demo：文件名，逗号或换行分隔"
        />
      </el-form-item>
      <el-form-item label="现场视频">
        <el-input
          v-model="form.video_text"
          type="textarea"
          :rows="2"
          placeholder="Demo：文件名，逗号或换行分隔"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="选填" />
      </el-form-item>
      <div class="form-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交报审</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.create-form {
  max-width: 720px;
}
</style>
