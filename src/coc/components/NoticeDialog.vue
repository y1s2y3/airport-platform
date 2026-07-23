<script setup>
import { ref } from 'vue'
import { Document, Check, Connection } from '@element-plus/icons-vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  notice: { type: Object, required: true },
})

const emit = defineEmits(['update:visible', 'submit'])

const submitted = ref(false)

function handleClose() {
  submitted.value = false
  emit('update:visible', false)
}

function handleSubmit() {
  submitted.value = true
  emit('submit')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="安全质量任务单"
    width="720px"
    :close-on-click-modal="false"
    class="notice-dialog"
    @update:model-value="emit('update:visible', $event)"
    @close="handleClose"
  >
    <div class="notice-form" :class="{ submitted }">
      <div class="notice-header">
        <div class="notice-logo">
          <el-icon :size="19" color="#c97b63"><Document /></el-icon>
        </div>
        <div>
          <h3>深圳机场扩建工程 · 安全质量任务单</h3>
          <p>Shenzhen Airport Expansion Project · Notice Form</p>
        </div>
        <div class="notice-no">{{ notice.id }}</div>
      </div>

      <div class="form-grid">
        <div class="form-item full">
          <label>项目名称</label>
          <div class="value">{{ notice.project }}</div>
        </div>
        <div class="form-item">
          <label>问题类型</label>
          <div class="value">
            <el-tag :type="notice.type === '安全' ? 'danger' : 'warning'" size="large">{{ notice.type }}</el-tag>
          </div>
        </div>
        <div class="form-item">
          <label>整改期限</label>
          <div class="value highlight">{{ notice.deadline }}</div>
        </div>
        <div class="form-item full">
          <label>问题描述</label>
          <div class="value desc">{{ notice.description }}</div>
        </div>
        <div class="form-item">
          <label>责任单位</label>
          <div class="value">{{ notice.unit }}</div>
        </div>
        <div class="form-item">
          <label>下发时间</label>
          <div class="value">{{ notice.issueTime }}</div>
        </div>
        <div class="form-item">
          <label>签发人</label>
          <div class="value">{{ notice.issuer }}</div>
        </div>
      </div>

      <div v-if="submitted" class="success-banner">
        <el-icon :size="13" color="#67c23a"><Check /></el-icon>
        任务单已下发，问题已进入安全质量风险闭环流程
      </div>
    </div>

    <template #footer>
      <el-button size="large" @click="handleClose">关闭</el-button>
      <el-button v-if="!submitted" type="primary" size="large" class="submit-btn" @click="handleSubmit">
        确认下发
      </el-button>
      <el-button v-else type="success" size="large" @click="handleClose">
        <el-icon><Connection /></el-icon>
        查看闭环（Demo提示）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.notice-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 2px solid #c97b63;
  margin-bottom: 24px;
}

.notice-header h3 {
  font-size: calc(13px + var(--coc-font-boost));
  color: #303133;
}

.notice-header p {
  font-size: calc(10px + var(--coc-font-boost));
  color: #909399;
  margin-top: 4px;
}

.notice-no {
  margin-left: auto;
  font-size: calc(11px + var(--coc-font-boost));
  color: #c97b63;
  font-weight: 600;
  background: rgba(201, 123, 99, 0.1);
  padding: 8px 16px;
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-item.full {
  grid-column: span 2;
}

.form-item label {
  display: block;
  font-size: calc(10px + var(--coc-font-boost));
  color: #909399;
  margin-bottom: 8px;
}

.form-item .value {
  font-size: calc(11px + var(--coc-font-boost));
  color: #303133;
  padding: 12px 16px;
  background: #faf8f6;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.form-item .value.highlight {
  color: #c97b63;
  font-weight: 600;
}

.form-item .value.desc {
  line-height: 1.6;
}

.success-banner {
  margin-top: 20px;
  padding: 16px;
  background: rgba(103, 194, 58, 0.1);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 8px;
  color: #67c23a;
  font-size: calc(11px + var(--coc-font-boost));
  display: flex;
  align-items: center;
  gap: 8px;
}

.submit-btn {
  --el-button-bg-color: #c97b63;
  --el-button-border-color: #c97b63;
}
</style>
