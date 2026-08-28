<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import AiDisposeDialog from '../../components/ai/AiDisposeDialog.vue'
import { AI_CATEGORY_META, getAiAlertById } from '../../mock/aiApp.js'
import './ai-app.css'

const route = useRoute()
const router = useRouter()
const disposeVisible = ref(false)
const alert = computed(() => getAiAlertById(String(route.params.id || '')))
const meta = computed(() => AI_CATEGORY_META[alert.value?.category] || AI_CATEGORY_META.unsafe)

function goBack() {
  router.push(`/ai-app/${meta.value.routeSegment}`)
}
</script>

<template>
  <div class="ai-page page-card">
    <template v-if="alert">
      <div class="ai-page-header">
        <div>
          <div class="ai-page-breadcrumb">AI 应用 / {{ meta.label }} / 预警查看</div>
          <h1 class="ai-page-title">预警查看</h1>
          <p class="ai-page-tip">预警编号：{{ alert.alertNo }}</p>
        </div>
        <div style="display: flex; gap: 8px">
          <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
          <el-button v-if="alert.status === '未处置'" type="primary" @click="disposeVisible = true">处置</el-button>
        </div>
      </div>

      <div class="ai-detail-grid">
        <div class="ai-panel">
          <div class="ai-panel-title">预警截图</div>
          <div class="ai-snapshot large">
            <span class="ai-snapshot-label">{{ alert.alertType }} · {{ alert.camera }}</span>
          </div>
        </div>

        <div class="ai-panel">
          <div class="ai-panel-title">预警信息</div>
          <div class="ai-info-list detail-info-list">
            <div class="ai-info-item">
              <div class="ai-info-label">预警类型</div>
              <div class="ai-info-value">{{ alert.alertType }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">预警状态</div>
              <div class="ai-info-value">
                <span class="ai-status-tag" :class="alert.status === '未处置' ? 'unhandled' : 'handled'">{{ alert.status }}</span>
              </div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">预警时间</div>
              <div class="ai-info-value">{{ alert.occurredAt }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">处置人</div>
              <div class="ai-info-value">{{ alert.handler }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">所属项目</div>
              <div class="ai-info-value">{{ alert.projectName }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">发生位置</div>
              <div class="ai-info-value">{{ alert.location }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">摄像头名称</div>
              <div class="ai-info-value">{{ alert.camera }}</div>
            </div>
            <div class="ai-info-item">
              <div class="ai-info-label">预警编号</div>
              <div class="ai-info-value">{{ alert.alertNo }}</div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">预警内容</div>
            <div class="ai-note-box">{{ alert.content }}</div>
          </div>
        </div>
      </div>

      <div v-if="alert.status === '已处置'" class="ai-panel">
        <div class="ai-panel-title">处置信息</div>
        <div class="ai-info-list">
          <div class="ai-info-item">
            <div class="ai-info-label">处置结果</div>
            <div class="ai-info-value">
              <span class="ai-result-tag" :class="alert.disposition === '误报' ? 'false-alarm' : 'processed'">{{ alert.disposition }}</span>
            </div>
          </div>
          <div class="ai-info-item">
            <div class="ai-info-label">处置人</div>
            <div class="ai-info-value">{{ alert.disposedBy }}</div>
          </div>
          <div class="ai-info-item">
            <div class="ai-info-label">处置时间</div>
            <div class="ai-info-value">{{ alert.disposedAt }}</div>
          </div>
          <div class="ai-info-item">
            <div class="ai-info-label">预警状态</div>
            <div class="ai-info-value"><span class="ai-status-tag handled">已处置</span></div>
          </div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">处置说明</div>
          <div class="ai-note-box">{{ alert.disposalNote }}</div>
        </div>
        <div v-if="alert.disposalAttachments?.length" class="detail-section">
          <div class="detail-section-title">处置附件</div>
          <div class="ai-note-box">
            <div v-for="file in alert.disposalAttachments" :key="file.name">{{ file.name }}</div>
          </div>
        </div>
      </div>

      <AiDisposeDialog v-model="disposeVisible" :alert="alert" />
    </template>

    <el-empty v-else description="未找到对应预警记录">
      <el-button type="primary" @click="router.push('/workbench')">返回工作台</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.detail-info-list {
  grid-template-columns: 1fr;
}

.detail-info-list .ai-info-item {
  border-right: 0;
}

.detail-section {
  margin-top: 18px;
}

.detail-section-title {
  margin-bottom: 10px;
  color: var(--ap-text);
  font-size: 14px;
  font-weight: 600;
}
</style>
