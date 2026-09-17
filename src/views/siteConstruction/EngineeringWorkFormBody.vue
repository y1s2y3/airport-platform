<script setup>
import { computed } from 'vue'
import { Document, FolderOpened } from '@element-plus/icons-vue'
import AttachmentUpload from '../../components/common/AttachmentUpload.vue'
import {
  emptyCell,
  formatSupervisorDisplay,
  getEngineeringWorkItems,
  listMatSupervisorApprovers,
  formatMatSupervisorApproverLabel,
} from '../../mock/engineeringWork.js'

const props = defineProps({
  form: { type: Object, required: true },
  readonly: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
})

const emit = defineEmits(['pick-work', 'remove-work', 'supervisor-change'])

const workItems = computed(() => getEngineeringWorkItems(props.form))
</script>

<template>
  <section class="form-section">
    <header class="section-head">
      <el-icon class="section-icon"><FolderOpened /></el-icon>
      <div class="section-head-main">
        <h2 class="section-title">
          关联危险作业
          <el-tag v-if="workItems.length" size="small" effect="plain" class="works-count-tag">
            共 {{ workItems.length }} 项
          </el-tag>
        </h2>
        <p class="section-desc">
          {{
            readonly
              ? '本申报单关联的多条每日危险作业（摘要）。'
              : '可多选本项目「每日施工作业」中的危险作业；审批中或已通过的不可再选。'
          }}
        </p>
      </div>
    </header>
    <div class="section-body">
      <el-form-item v-if="!readonly" label="危险作业" required class="field-span-2">
        <div class="pick-row">
          <span class="pick-summary">
            {{ workItems.length ? `已选 ${workItems.length} 项` : '尚未选择危险作业' }}
          </span>
          <el-button type="primary" @click="emit('pick-work')">选择</el-button>
        </div>
      </el-form-item>
      <el-table
        v-if="workItems.length"
        :data="workItems"
        border
        stripe
        size="small"
        class="works-table"
        empty-text="暂未选择"
      >
        <el-table-column label="施工日期" width="110">
          <template #default="{ row }">{{ emptyCell(row.reportDate) }}</template>
        </el-table-column>
        <el-table-column label="作业类别" width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.dangerWorkCategory) }}</template>
        </el-table-column>
        <el-table-column label="施工区域" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.workArea) }}</template>
        </el-table-column>
        <el-table-column label="当日施工具体内容" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.workContent) }}</template>
        </el-table-column>
        <el-table-column label="作业开始时间" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="作业结束时间" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.endTime) }}</template>
        </el-table-column>
        <el-table-column label="施工单位" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.contractor) }}</template>
        </el-table-column>
        <el-table-column v-if="!readonly" label="操作" width="72" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link @click="emit('remove-work', row.id)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p v-else class="empty-inline">{{ readonly ? '暂无关联危险作业' : '请点击「选择」添加危险作业' }}</p>
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
