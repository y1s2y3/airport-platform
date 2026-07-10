<script setup>
import videoFilterActiveBg from '../../assets/hq/video-filter-all-bg.svg?url'
import videoFilterInactiveBg from '../../assets/hq/video-filter-inactive-bg.svg?url'

defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (v) => ['all', 'key'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

function select(id) {
  emit('update:modelValue', id)
}
</script>

<template>
  <div
    class="hq-video-filter"
    :class="{ 'is-all': modelValue === 'all', 'is-key': modelValue === 'key' }"
    role="tablist"
    aria-label="视频筛选"
  >
    <button
      type="button"
      role="tab"
      class="hq-video-filter__btn"
      :class="{ 'is-active': modelValue === 'all' }"
      :aria-selected="modelValue === 'all'"
      aria-label="全部"
      @click="select('all')"
    >
      <img
        class="hq-video-filter__bg"
        :src="modelValue === 'all' ? videoFilterActiveBg : videoFilterInactiveBg"
        :width="modelValue === 'all' ? 71 : 62"
        :height="modelValue === 'all' ? 31 : 22"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <span class="hq-video-filter__text">全部</span>
    </button>
    <button
      type="button"
      role="tab"
      class="hq-video-filter__btn"
      :class="{ 'is-active': modelValue === 'key' }"
      :aria-selected="modelValue === 'key'"
      aria-label="重点"
      @click="select('key')"
    >
      <img
        class="hq-video-filter__bg"
        :src="modelValue === 'key' ? videoFilterActiveBg : videoFilterInactiveBg"
        :width="modelValue === 'key' ? 71 : 62"
        :height="modelValue === 'key' ? 31 : 22"
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <span class="hq-video-filter__text">重点</span>
    </button>
  </div>
</template>

<style scoped>
.hq-video-filter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.hq-video-filter__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 62px;
  min-width: 62px;
  height: 22px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 500;
  line-height: 22px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
}

.hq-video-filter__btn.is-active {
  width: 71px;
  min-width: 71px;
  height: 31px;
  line-height: 31px;
}

.hq-video-filter__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.hq-video-filter__text {
  position: relative;
  z-index: 1;
}

.hq-video-filter__btn:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.65);
  outline-offset: 1px;
}
</style>
