<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

const redList = computed(() => boardData.value.red)
const blackList = computed(() => boardData.value.black)
const periodLabel = computed(() => formatRedBlackPeriod(boardData.value.period))

const redGridItems = computed(() => redList.value.slice(0, RED_GRID_SIZE))
const blackGridItems = computed(() => blackList.value.slice(0, BLACK_GRID_SIZE))

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
                  type="red"
                  :name="item.shortName"
                  :image="item.image"
                  :image-hue="item.imageHue"
                />
              </template>
              <template v-else>
                <div
                  v-for="item in redGridItems"
                  :key="item.id"
                  class="rb-cell"
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
                  type="black"
                  :name="blackItemName(item)"
                  :image="item.image"
                  :image-hue="item.imageHue"
                />
              </template>
              <template v-else>
                <div
                  v-for="item in blackGridItems"
                  :key="item.id"
                  class="rb-cell"
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
</style>
