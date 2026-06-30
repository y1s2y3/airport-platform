<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { hazardImageStyle } from '../mock/data.js'
import {
  getLatestRedBlackBoard,
  formatRedBlackPeriod,
  RED_BLACK_BOARD_CHANGE_EVENT,
} from '../utils/redBlackBoardStorage.js'

const emit = defineEmits(['leader-speech'])

const boardData = ref(getLatestRedBlackBoard())
const detailItem = ref(null)

const redList = computed(() => boardData.value.red)
const blackList = computed(() => boardData.value.black)
const periodLabel = computed(() => formatRedBlackPeriod(boardData.value.period))

const detailBoardLabel = computed(() => (detailItem.value?.boardType === 'red' ? '红榜' : '黑榜'))

function reload() {
  boardData.value = getLatestRedBlackBoard()
}

function thumbStyle(hue) {
  return hazardImageStyle(hue)
}

function handleLeaderSpeech() {
  emit('leader-speech')
}

function openDetail(item, boardType) {
  detailItem.value = { ...item, boardType }
}

function closeDetail() {
  detailItem.value = null
}

onMounted(() => {
  window.addEventListener(RED_BLACK_BOARD_CHANGE_EVENT, reload)
})

onUnmounted(() => {
  window.removeEventListener(RED_BLACK_BOARD_CHANGE_EVENT, reload)
})
</script>

<template>
  <div class="red-black-wrap">
    <div class="rb-actions">
      <el-button type="primary" class="action-btn leader-btn" @click="handleLeaderSpeech">
        领导讲话
      </el-button>
    </div>

    <div class="panel-card red-black-panel">
      <div class="panel-title compact title-left">
        <span>项目黑红榜</span>
        <span v-if="periodLabel" class="period-tag">{{ periodLabel }}</span>
      </div>
      <div class="panel-body rb-body">
        <div class="rb-columns">
          <section class="rb-column red-column">
            <header class="rb-column-head">
              <span class="rb-badge red">红榜</span>
            </header>
            <ul class="rb-list">
              <li
                v-for="item in redList"
                :key="item.id"
                class="rb-item clickable"
                @click="openDetail(item, 'red')"
              >
                <div class="rb-project-name" :title="item.fullName">{{ item.shortName }}</div>
                <div class="rb-item-content">
                  <div class="rb-thumb red-thumb">
                    <img v-if="item.image" :src="item.image" alt="" class="thumb-img" />
                    <div v-else class="thumb-fallback" :style="thumbStyle(item.imageHue)">
                      <span class="thumb-label">现场图</span>
                    </div>
                  </div>
                  <p class="rb-desc">{{ item.description }}</p>
                </div>
              </li>
              <li v-if="!redList.length" class="rb-empty">暂无红榜数据</li>
            </ul>
          </section>

          <section class="rb-column black-column">
            <header class="rb-column-head">
              <span class="rb-badge black">黑榜</span>
            </header>
            <ul class="rb-list">
              <li
                v-for="item in blackList"
                :key="item.id"
                class="rb-item clickable"
                @click="openDetail(item, 'black')"
              >
                <div class="rb-project-name" :title="item.fullName">{{ item.shortName }}</div>
                <div class="rb-item-content">
                  <div class="rb-thumb black-thumb">
                    <img v-if="item.image" :src="item.image" alt="" class="thumb-img" />
                    <div v-else class="thumb-fallback" :style="thumbStyle(item.imageHue)">
                      <span class="thumb-label">现场图</span>
                    </div>
                  </div>
                  <p class="rb-desc">{{ item.description }}</p>
                </div>
              </li>
              <li v-if="!blackList.length" class="rb-empty">暂无黑榜数据</li>
            </ul>
          </section>
        </div>
      </div>
    </div>

    <Teleport to="#coc-overlay-root">
      <div v-if="detailItem" class="rb-detail-overlay" @click.self="closeDetail">
        <div class="detail-card" :class="detailItem.boardType === 'red' ? 'red-detail' : 'black-detail'">
          <div class="detail-header">
            <div class="detail-title-wrap">
              <span class="detail-badge" :class="detailItem.boardType">{{ detailBoardLabel }}</span>
              <span class="detail-title">{{ detailItem.shortName }} · 详情</span>
            </div>
            <button type="button" class="close-btn" @click="closeDetail">
              <el-icon :size="13"><Close /></el-icon>
              关闭
            </button>
          </div>
          <div class="detail-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="dl">所属期数</span>
                <span>{{ periodLabel }}</span>
              </div>
              <div class="detail-item">
                <span class="dl">项目简称</span>
                <span>{{ detailItem.shortName || '—' }}</span>
              </div>
              <div class="detail-item full">
                <span class="dl">项目全称</span>
                <span>{{ detailItem.fullName || '—' }}</span>
              </div>
              <div v-if="detailItem.updatedAt" class="detail-item">
                <span class="dl">更新时间</span>
                <span>{{ detailItem.updatedAt }}</span>
              </div>
            </div>
            <div class="block-label">上榜说明</div>
            <div class="block-content">{{ detailItem.description || '—' }}</div>
            <div class="block-label">现场图片</div>
            <div class="detail-image-wrap">
              <img v-if="detailItem.image" :src="detailItem.image" alt="现场图" class="detail-image" />
              <div v-else class="detail-image-fallback" :style="thumbStyle(detailItem.imageHue)">
                <span>暂无图片</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.red-black-wrap {
  flex: 0 0 38%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rb-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}

.leader-btn {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
}

.red-black-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: 18px;
  justify-content: flex-start;
  gap: 10px;
}

.period-tag {
  font-size: 11px;
  font-weight: 600;
  color: var(--coc-text-muted);
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(144, 147, 153, 0.12);
}

.rb-body {
  padding: 10px 12px 12px !important;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rb-columns {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.rb-column {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
}

.red-column {
  background: linear-gradient(165deg, #fffafa 0%, #fff5f4 100%);
  border: 1px solid rgba(231, 76, 60, 0.12);
}

.black-column {
  background: linear-gradient(165deg, #fafafa 0%, #f5f5f6 100%);
  border: 1px solid rgba(48, 49, 51, 0.1);
}

.rb-column-head {
  flex-shrink: 0;
}

.rb-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 4px;
  letter-spacing: 1px;
}

.rb-badge.red {
  color: #fff;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.rb-badge.black {
  color: #fff;
  background: linear-gradient(135deg, #303133, #606266);
}

.rb-list {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rb-item {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.rb-item.clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.red-column .rb-item.clickable:hover {
  border-color: rgba(231, 76, 60, 0.35);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.12);
}

.black-column .rb-item.clickable:hover {
  border-color: rgba(48, 49, 51, 0.22);
  box-shadow: 0 4px 12px rgba(48, 49, 51, 0.08);
}

.red-column .rb-item {
  border-color: rgba(231, 76, 60, 0.1);
  background: rgba(255, 255, 255, 0.88);
}

.black-column .rb-item {
  border-color: rgba(48, 49, 51, 0.08);
  background: rgba(255, 255, 255, 0.88);
}

.red-column .rb-project-name {
  color: #d3544a;
}

.black-column .rb-project-name {
  color: var(--coc-text);
}

.rb-project-name {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rb-item-content {
  display: flex;
  gap: 8px;
  align-items: stretch;
  min-height: 0;
}

.rb-thumb {
  flex: 0 0 72px;
  width: 72px;
  height: 54px;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-fallback {
  width: 100%;
  height: 100%;
  position: relative;
}

.red-thumb {
  box-shadow: inset 0 0 0 1px rgba(231, 76, 60, 0.08);
}

.black-thumb {
  box-shadow: inset 0 0 0 1px rgba(48, 49, 51, 0.08);
}

.thumb-label {
  position: absolute;
  left: 4px;
  bottom: 4px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.35);
  padding: 1px 5px;
  border-radius: 3px;
}

.rb-desc {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--coc-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rb-empty {
  padding: 20px 8px;
  text-align: center;
  font-size: 11px;
  color: var(--coc-text-muted);
}

.rb-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 120000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-card {
  width: min(92vw, 640px);
  max-height: min(88vh, 720px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
}

.detail-card.red-detail {
  border-top: 4px solid #e74c3c;
}

.detail-card.black-detail {
  border-top: 4px solid #303133;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--coc-border);
  flex-shrink: 0;
}

.detail-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.detail-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 4px;
  color: #fff;
}

.detail-badge.red {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.detail-badge.black {
  background: linear-gradient(135deg, #303133, #606266);
}

.detail-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--coc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--coc-border);
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--coc-text-secondary);
  flex-shrink: 0;
}

.close-btn:hover {
  border-color: var(--coc-accent);
  color: var(--coc-accent);
}

.detail-body {
  padding: 16px 18px 18px;
  overflow-y: auto;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin-bottom: 14px;
}

.detail-item {
  display: flex;
  gap: 10px;
  font-size: 13px;
  min-width: 0;
}

.detail-item.full {
  grid-column: 1 / -1;
}

.dl {
  color: var(--coc-text-muted);
  min-width: 64px;
  flex-shrink: 0;
}

.block-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--coc-text-secondary);
}

.block-content {
  font-size: 13px;
  line-height: 1.7;
  background: #faf8f6;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
  white-space: pre-wrap;
}

.detail-image-wrap {
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a1a;
  min-height: 180px;
}

.detail-image {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
  background: #111;
}

.detail-image-fallback {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}
</style>
