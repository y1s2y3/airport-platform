<script setup>
import { ref, watch } from 'vue'
import videoFilterAllRaw from '../../assets/hq/video-filter-all.svg?raw'
import videoFilterKey from '../../assets/hq/video-filter-key.svg?url'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (v) => ['all', 'key'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

/** 默认折叠：只显示「全部」；点击后展开露出「重点」 */
const expanded = ref(false)

watch(
  () => props.modelValue,
  (value) => {
    if (value === 'key') expanded.value = true
  },
  { immediate: true },
)

function select(id) {
  emit('update:modelValue', id)
}

function onAllClick() {
  if (!expanded.value) {
    expanded.value = true
    select('all')
    return
  }
  select('all')
}

function onKeyClick() {
  expanded.value = true
  select('key')
}
</script>

<template>
  <div
    class="hq-video-filter"
    :class="{ 'is-expanded': expanded, 'is-key': modelValue === 'key' }"
    role="tablist"
    aria-label="视频筛选"
  >
    <!-- 默认折叠：仅「全部」芯片（合成图左段，不显示「重点」） -->
    <button
      v-if="!expanded"
      type="button"
      role="tab"
      class="hq-video-filter__collapsed"
      aria-selected="true"
      aria-label="全部"
      @click="onAllClick"
    >
      <div
        class="hq-video-filter__collapsed-art"
        v-html="videoFilterAllRaw"
        aria-hidden="true"
      />
    </button>

    <!-- 展开 + 全部选中：71×31 完整合成条 -->
    <div v-else-if="modelValue === 'all'" class="hq-video-filter__strip">
      <div
        class="hq-video-filter__strip-art"
        v-html="videoFilterAllRaw"
        aria-hidden="true"
      />
      <button
        type="button"
        role="tab"
        class="hq-video-filter__hit hq-video-filter__hit--all"
        aria-selected="true"
        aria-label="全部"
        @click="onAllClick"
      />
      <button
        type="button"
        role="tab"
        class="hq-video-filter__hit hq-video-filter__hit--key"
        aria-selected="false"
        aria-label="重点"
        @click="onKeyClick"
      />
    </div>

    <!-- 展开 + 重点选中：弱化「全部」+ 62×22 重点按钮 -->
    <div v-else class="hq-video-filter__key-row">
      <button
        type="button"
        role="tab"
        class="hq-video-filter__plain"
        aria-selected="false"
        aria-label="全部"
        @click="onAllClick"
      >
        全部
      </button>
      <button
        type="button"
        role="tab"
        class="hq-video-filter__key-chip"
        aria-selected="true"
        aria-label="重点"
        @click="onKeyClick"
      >
        <img
          :src="videoFilterKey"
          width="62"
          height="22"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.hq-video-filter {
  flex-shrink: 0;
  line-height: 0;
}

/* 折叠态：裁切合成图左段，只露出「全部」 */
.hq-video-filter__collapsed {
  position: relative;
  width: 38px;
  min-width: 38px;
  height: 31px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.hq-video-filter__collapsed-art {
  display: block;
  width: 71px;
  height: 31px;
  pointer-events: none;
  user-select: none;
}

.hq-video-filter__collapsed-art :deep(svg) {
  display: block;
  width: 71px;
  height: 31px;
}

.hq-video-filter__strip {
  position: relative;
  width: 71px;
  min-width: 71px;
  max-width: 71px;
  height: 31px;
  overflow: visible;
}

.hq-video-filter__strip-art {
  display: block;
  width: 71px;
  height: 31px;
  pointer-events: none;
  user-select: none;
}

.hq-video-filter__strip-art :deep(svg) {
  display: block;
  width: 71px;
  min-width: 71px;
  max-width: none;
  height: 31px;
}

.hq-video-filter__hit {
  position: absolute;
  top: 0;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.hq-video-filter__hit--all {
  left: 0;
  width: 54%;
}

.hq-video-filter__hit--key {
  right: 0;
  width: 46%;
}

.hq-video-filter__key-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 31px;
}

.hq-video-filter__plain {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 500;
  line-height: 1;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  white-space: nowrap;
}

.hq-video-filter__plain:hover {
  color: rgba(255, 255, 255, 0.82);
}

.hq-video-filter__key-chip {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  flex-shrink: 0;
}

.hq-video-filter__key-chip img {
  display: block;
  width: 62px;
  min-width: 62px;
  max-width: none;
  height: 22px;
  user-select: none;
  pointer-events: none;
}

.hq-video-filter__collapsed:focus-visible,
.hq-video-filter__hit:focus-visible,
.hq-video-filter__plain:focus-visible,
.hq-video-filter__key-chip:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.65);
  outline-offset: 1px;
}
</style>
