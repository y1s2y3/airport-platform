<script setup>
import './sample-page.css'
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { submitMaterialApp } from '../../../mock/sample.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const form = reactive({
  material_name: '',
  use_part: '',
  compare_record: '',
  photo_text: '',
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
  if (!photo_files.length) return ElMessage.warning('请至少填写 1 张样板照片文件名')
  const r = submitMaterialApp({
    project_id: scopeProjectId.value,
    material_name: form.material_name,
    use_part: form.use_part,
    compare_record: form.compare_record,
    photo_files,
    remark: form.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/sample/material/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样报审 / 新建</div>
      <h1 class="page-title">新建材料定样报审</h1>
      <p class="page-tip">
        项目：{{ isHqSelected ? '请先选项目' : scopeProjectLabel }} · 本页仅施工方提交，审批请在个人中心办理
      </p>
    </div>

    <el-form label-width="112px" class="create-form">
      <el-form-item label="材料名称" required>
        <el-input v-model="form.material_name" placeholder="如：外墙真石漆" maxlength="80" />
      </el-form-item>
      <el-form-item label="使用部位" required>
        <el-input v-model="form.use_part" placeholder="如：T3 航站楼外立面" maxlength="80" />
      </el-form-item>
      <el-form-item label="比选记录">
        <el-input
          v-model="form.compare_record"
          type="textarea"
          :rows="3"
          placeholder="比选过程与结论（选填）"
        />
      </el-form-item>
      <el-form-item label="样板照片" required>
        <el-input
          v-model="form.photo_text"
          type="textarea"
          :rows="2"
          placeholder="必填：多个文件名用逗号或换行分隔"
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
