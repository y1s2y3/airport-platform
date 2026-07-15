<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { hazardImageStyle, BLACK_LIST_PROJECT_DISPLAY_NAME } from '../mock/data.js'
import {
  getLatestRedBlackBoard,
  formatRedBlackPeriod,
  RED_BLACK_BOARD_CHANGE_EVENT,
} from '../utils/redBlackBoardStorage.js'
import HqRedBlackItem from './hq/HqRedBlackItem.vue'
import HqLeaderSpeechButton from './hq/HqLeaderSpeechButton.vue'
import redBlackNameBg from '../assets/hq/red-black-name-bg.svg?url'
import redBlackLabelBg from '../assets/hq/red-black-label-bg.svg?url'

const nameBgStyle = {
  backgroundImage: `url(${redBlackNameBg})`,
  backgroundColor: 'rgba(32, 39, 56, 0.8)',
}

defineProps({
  darkTheme: { type: Boolean, default: false },
})

const emit = defineEmits(['leader-speech'])

const RED_GRID_SIZE = 3
const BLACK_GRID_SIZE = 3

const boardData = ref(getLatestRedBlackBoard())
const detailItem = ref(null)

const redList = computed(() => boardData.value.red)
const blackList = computed(() => boardData.value.black)
const periodLabel = computed(() => formatRedBlackPeriod(boardData.value.period))

const redGridItems = computed(() => redList.value.slice(0, RED_GRID_SIZE))
const blackGridItems = computed(() => blackList.value.slice(0, BLACK_GRID_SIZE))

const detailBoardLabel = computed(() => (detailItem.value?.boardType === 'red' ? '红榜' : '黑榜'))

const detailDisplayName = computed(() => {
  if (!detailItem.value) return ''
  if (detailItem.value.boardType === 'black') return blackItemName(detailItem.value)
  return detailItem.value.shortName
})

function reload() {
  boardData.value = getLatestRedBlackBoard()
}

function thumbStyle(hue) {
  return hazardImageStyle(hue)
}

function handleLeaderSpeech() {
  emit('leader-speech')
}

function blackItemName(item) {
  return BLACK_LIST_PROJECT_DISPLAY_NAME || item.shortName
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
      <HqLeaderSpeechButton
        v-if="darkTheme"
        class="leader-btn leader-btn--hq"
        @click="handleLeaderSpeech"
      />
      <el-button
        v-else
        type="primary"
        class="action-btn leader-btn"
        @click="handleLeaderSpeech"
      >
        领导讲话
      </el-button>
    </div>

    <div class="panel-card red-black-panel">
      <div v-if="!darkTheme" class="panel-title compact title-left">
        <span>项目红黑榜</span>
        <span v-if="periodLabel" class="period-tag">{{ periodLabel }}</span>
      </div>
      <div class="panel-body rb-body">
        <div class="rb-stack">
          <section class="rb-row red-row" :class="{ 'rb-row--hq': darkTheme }">
            <div class="rb-vertical-label red" :class="{ 'rb-vertical-label--hq': darkTheme }">
              <img
                v-if="darkTheme"
                class="rb-vertical-label__bg"
                :src="redBlackLabelBg"
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <span class="rb-vertical-label__text">红榜</span>
            </div>
            <div class="rb-grid rb-grid-red" :class="{ 'rb-grid-red--hq': darkTheme }">
              <template v-if="darkTheme">
                <HqRedBlackItem
                  v-for="item in redGridItems"
                  :key="item.id"
                  class="rb-item-clickable"
                  type="red"
                  :name="item.shortName"
                  :image="item.image"
                  :image-hue="item.imageHue"
                  @click="openDetail(item, 'red')"
                />
              </template>
              <template v-else>
                <div
                  v-for="item in redGridItems"
                  :key="item.id"
                  class="rb-cell rb-item-clickable"
                  @click="openDetail(item, 'red')"
                >
                  <div class="rb-project-name" :style="nameBgStyle" :title="item.fullName">{{ item.shortName }}</div>
                  <div class="rb-thumb red-thumb">
                    <img v-if="item.image" :src="item.image" alt="" class="thumb-img" />
                    <div v-else class="thumb-fallback" :style="thumbStyle(item.imageHue)" />
                  </div>
                </div>
              </template>
            </div>
          </section>

          <section class="rb-row black-row" :class="{ 'rb-row--hq': darkTheme }">
            <div class="rb-vertical-label black" :class="{ 'rb-vertical-label--hq': darkTheme }">
              <img
                v-if="darkTheme"
                class="rb-vertical-label__bg"
                :src="redBlackLabelBg"
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <span class="rb-vertical-label__text">黑榜</span>
            </div>
            <div class="rb-grid rb-grid-black" :class="{ 'rb-grid-black--hq': darkTheme }">
              <template v-if="darkTheme">
                <HqRedBlackItem
                  v-for="item in blackGridItems"
                  :key="item.id"
                  class="rb-item-clickable"
                  type="black"
                  :name="blackItemName(item)"
                  :image="item.image"
                  :image-hue="item.imageHue"
                  @click="openDetail(item, 'black')"
                />
              </template>
              <template v-else>
                <div
                  v-for="item in blackGridItems"
                  :key="item.id"
                  class="rb-cell rb-item-clickable"
                  @click="openDetail(item, 'black')"
                >
                  <div class="rb-project-name" :style="nameBgStyle" :title="item.fullName">{{ blackItemName(item) }}</div>
                  <div class="rb-thumb black-thumb">
                    <img v-if="item.image" :src="item.image" alt="" class="thumb-img" />
                    <div v-else class="thumb-fallback" :style="thumbStyle(item.imageHue)" />
                  </div>
                </div>
              </template>
            </div>
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
              <span class="detail-title">{{ detailDisplayName }} · 详情</span>
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
                <span>{{ detailDisplayName || '—' }}</span>
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
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  margin: 0;
}

.leader-btn {
  width: 100%;
  border: none;
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
}

.leader-btn--hq {
  flex: 1;
  height: auto;
  background: transparent;
}

.red-black-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.panel-title.compact.title-left {
  font-size: calc(18px + var(--coc-font-boost));
  justify-content: flex-start;
  gap: 10px;
}

.period-tag {
  font-size: calc(11px + var(--coc-font-boost));
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
}

.rb-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
}

.rb-row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
}

.red-row {
  background: linear-gradient(165deg, #fffafa 0%, #fff5f4 100%);
  border: 1px solid rgba(231, 76, 60, 0.12);
}

.black-row {
  background: linear-gradient(165deg, #fafafa 0%, #f5f5f6 100%);
  border: 1px solid rgba(48, 49, 51, 0.1);
}

.rb-vertical-label {
  flex: 0 0 29px;
  width: 29px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.rb-vertical-label__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.rb-vertical-label__text {
  position: relative;
  z-index: 1;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 4px;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 700;
  line-height: 1;
}

.rb-vertical-label--hq {
  align-self: stretch;
  min-height: 72px;
}

.rb-vertical-label.red .rb-vertical-label__text {
  color: #d3544a;
}

.rb-vertical-label.black .rb-vertical-label__text {
  color: #303133;
}

.rb-grid {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.rb-grid-red {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.rb-grid-black {
  display: flex;
  justify-content: space-evenly;
  align-items: stretch;
  gap: 12px;
}

.rb-grid-black .rb-cell {
  flex: 1;
  max-width: calc((100% - 24px) / 3);
}

.rb-cell {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.88);
}

.rb-item-clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.red-row .rb-cell.rb-item-clickable:hover {
  border-color: rgba(231, 76, 60, 0.35);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.12);
}

.black-row .rb-cell.rb-item-clickable:hover {
  border-color: rgba(48, 49, 51, 0.22);
  box-shadow: 0 4px 12px rgba(48, 49, 51, 0.08);
}

:deep(.hq-rb-item.rb-item-clickable:hover) {
  outline: 1px solid rgba(94, 238, 255, 0.55);
  box-shadow: 0 0 12px rgba(94, 238, 255, 0.2);
}

.red-row .rb-cell {
  border-color: rgba(231, 76, 60, 0.1);
}

.black-row .rb-cell {
  border-color: rgba(48, 49, 51, 0.08);
}

.red-row .rb-project-name {
  color: #d3544a;
}

.black-row .rb-project-name {
  color: var(--coc-text);
}

.rb-project-name {
  flex-shrink: 0;
  min-height: 21px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  box-sizing: border-box;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 700;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% 100%;
}

.rb-thumb {
  flex: 1;
  min-height: 0;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
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
}

.red-thumb {
  box-shadow: inset 0 0 0 1px rgba(231, 76, 60, 0.08);
}

.black-thumb {
  box-shadow: inset 0 0 0 1px rgba(48, 49, 51, 0.08);
}

.rb-row--hq {
  padding: 6px 8px 6px 4px;
  gap: 6px;
}

.rb-grid-red--hq,
.rb-grid-black--hq {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  align-items: stretch;
}

.rb-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 120000;
  background: rgba(0, 12, 28, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-card {
  width: min(92vw, 640px);
  max-height: min(88vh, 720px);
  background: rgba(82, 110, 131, 0.42);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(94, 238, 255, 0.28);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35), 0 0 16px rgba(94, 238, 255, 0.08);
  color: #fff;
}

.detail-card.red-detail {
  border-top: 3px solid rgba(255, 138, 128, 0.85);
}

.detail-card.black-detail {
  border-top: 3px solid rgba(94, 238, 255, 0.55);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: rgba(82, 110, 131, 0.38);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 4px;
  color: #fff;
}

.detail-badge.red {
  background: linear-gradient(135deg, rgba(245, 108, 108, 0.85), rgba(192, 57, 43, 0.9));
  border: 1px solid rgba(255, 138, 128, 0.45);
}

.detail-badge.black {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.35), rgba(16, 29, 55, 0.75));
  border: 1px solid rgba(94, 238, 255, 0.4);
  color: #5eeeff;
}

.detail-title {
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: transparent;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}

.close-btn:hover {
  border-color: rgba(94, 238, 255, 0.55);
  color: #5eeeff;
  background: rgba(64, 158, 255, 0.12);
}

.detail-body {
  padding: 16px 18px 18px;
  overflow-y: auto;
  color: rgba(255, 255, 255, 0.92);
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
  font-size: calc(13px + var(--coc-font-boost));
  min-width: 0;
  color: rgba(255, 255, 255, 0.92);
}

.detail-item.full {
  grid-column: 1 / -1;
}

.dl {
  color: rgba(255, 255, 255, 0.65);
  min-width: 64px;
  flex-shrink: 0;
}

.block-label {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.72);
}

.block-content {
  font-size: calc(13px + var(--coc-font-boost));
  line-height: 1.7;
  background: rgba(16, 29, 55, 0.55);
  border: 1px solid rgba(94, 238, 255, 0.14);
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 14px;
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.92);
}

.detail-image-wrap {
  border-radius: 10px;
  overflow: hidden;
  background: rgba(10, 18, 32, 0.75);
  border: 1px solid rgba(94, 238, 255, 0.18);
  min-height: 180px;
}

.detail-image {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  display: block;
  background: rgba(0, 0, 0, 0.35);
}

.detail-image-fallback {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.65);
  font-size: calc(13px + var(--coc-font-boost));
}
</style>
