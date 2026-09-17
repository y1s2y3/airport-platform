<script setup>
import { Document, FolderOpened } from '@element-plus/icons-vue'
import AttachmentUpload from '../../components/common/AttachmentUpload.vue'
import {
  SNAPSHOT_FIELDS,
  emptyCell,
  formatSupervisorDisplay,
  listMatSupervisorApprovers,
  formatMatSupervisorApproverLabel,
} from '../../mock/engineeringWork.js'

const props = defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
})

const emit = defineEmits(['pick-work', 'supervisor-change'])

function snapshotValue(key) {
  return emptyCell(props.form.snapshot?.[key])
}
</script>

<template>
  <section class="form-section">
    <header class="section-head">
      <el-icon class="section-icon"><FolderOpened /></el-icon>
      <div class="section-head-main">
        <h2 class="section-title">关联危险作业</h2>
        <p class="section-desc">选自本项目「每日施工作业」中的危险作业，字段只读带出。</p>
      </div>
    </header>
    <div class="section-body">
      <el-form-item v-if="!readonly" label="危险作业" required class="field-span-2">
        <div class="pick-row">
          <el-input
            :model-value="
              form.snapshot?.dangerWorkCategory
                ? `${form.snapshot.reportDate || ''} ${form.snapshot.dangerWorkCategory} · ${form.snapshot.workArea || ''}`
                : ''
            "
            readonly
            placeholder="请选择每日施工作业中的危险作业"
            aria-label="请选择每日施工作业中的危险作业"
          />
          <el-button type="primary" @click="emit('pick-work')">选择</el-button>
        </div>
      </el-form-item>
      <div class="field-grid">
        <el-form-item
          v-for="field in SNAPSHOT_FIELDS"
          :key="field.key"
          :label="field.label"
          :class="{ 'field-span-2': field.span === 2 || field.key === 'dangerControlMeasures' }"
        >
          <el-input
            v-if="field.key === 'dangerControlMeasures'"
            :model-value="snapshotValue(field.key)"
            type="textarea"
            :rows="4"
            readonly
            aria-label="风险管控措施"
          />
          <span v-else>{{ snapshotValue(field.key) }}</span>
        </el-form-item>
      </div>
    </div>
  </section>

  <section class="form-section">
    <header class="section-head">
      <el-icon class="section-icon"><Document /></el-icon>
      <div class="section-head-main">
        <h2 class="section-title">作业资料</h2>
        <p class="section-desc">按危险作业申报要求补齐人员资质说明与方案、证明文件。</p>
      </div>
    </header>
    <div class="section-body">
      <div class="field-grid">
        <el-form-item label="作业人员及特种作业资质说明" required class="field-span-2">
          <el-input
            v-model="form.personnel_qual_desc"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            :readonly="readonly"
            placeholder="请填写作业人员及特种作业资质情况"
            aria-label="作业人员及特种作业资质说明"
          />
        </el-form-item>
        <el-form-item label="专项施工方案" required class="field-span-2">
          <AttachmentUpload
            v-model="form.scheme_files"
            preset="file"
            :min="1"
            :max="9"
            :readonly="readonly"
            name-prefix="专项施工方案"
          />
        </el-form-item>
        <el-form-item label="安全技术交底" class="field-span-2">
          <AttachmentUpload
            v-model="form.briefing_files"
            preset="file"
            :min="0"
            :max="9"
            :readonly="readonly"
            name-prefix="安全技术交底"
          />
        </el-form-item>
        <el-form-item label="人员资质证明" required class="field-span-2">
          <AttachmentUpload
            v-model="form.cert_files"
            preset="file"
            :min="1"
            :max="9"
            :readonly="readonly"
            name-prefix="人员资质证明"
          />
        </el-form-item>
        <el-form-item label="备注" class="field-span-2">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            :readonly="readonly"
            placeholder="选填"
            aria-label="备注"
          />
        </el-form-item>
      </div>
    </div>
  </section>

  <section class="form-section">
    <header class="section-head">
      <el-icon class="section-icon"><Document /></el-icon>
      <div class="section-head-main">
        <h2 class="section-title">审批人</h2>
        <p class="section-desc">提交后由所选监理在个人中心待办办理。</p>
      </div>
    </header>
    <div class="section-body">
      <el-form-item v-if="!readonly" label="监理审批人" required>
        <el-select
          :model-value="form.supervisor_approver_user_id"
          placeholder="请选择监理审批人"
          filterable
          clearable
          style="width: 100%"
          aria-label="请选择监理审批人"
          @update:model-value="emit('supervisor-change', $event)"
        >
          <el-option
            v-for="u in listMatSupervisorApprovers(projectId)"
            :key="u.user_id"
            :label="formatMatSupervisorApproverLabel(u)"
            :value="u.user_id"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else label="监理审批人">
        <span>{{ formatSupervisorDisplay(form) }}</span>
      </el-form-item>
    </div>
  </section>
</template>
