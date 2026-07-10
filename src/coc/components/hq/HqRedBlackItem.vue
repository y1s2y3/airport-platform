<script setup>
import { computed } from 'vue'
import redBlackNameBg from '../../assets/hq/red-black-name-bg.svg?url'
import { VIDEO_MONITOR_THUMB_URL } from '../../config/videoAssets.js'

const props = defineProps({
  name: { type: String, required: true },
  image: { type: String, default: '' },
  imageHue: { type: Number, default: 145 },
  type: {
    type: String,
    default: 'red',
    validator: (v) => ['red', 'black'].includes(v),
  },
})

const nameBgStyle = {
  backgroundImage: `url(${redBlackNameBg})`,
}

const stampText = '2025/09/23 星期五 2:15:53'

const photoSrc = computed(() => {
  if (!props.image || props.image.startsWith('data:image/svg+xml')) {
    return VIDEO_MONITOR_THUMB_URL
  }
  return props.image
})
</script>

<template>
  <div class="hq-rb-item" :class="`is-${type}`">
    <div class="hq-rb-item__media">
      <img :src="photoSrc" alt="" class="hq-rb-item__photo" draggable="false" />
      <span class="hq-rb-item__stamp">{{ stampText }}</span>
    </div>
    <div class="hq-rb-item__name-wrap" :style="nameBgStyle">
      <p class="hq-rb-item__name" :title="name">{{ name }}</p>
    </div>
  </div>
</template>

<style scoped>
.hq-rb-item {
  position: relative;
  width: 100%;
  aspect-ratio: 132 / 84;
  overflow: hidden;
  border-radius: 2px;
  background: #0a1220;
}

.hq-rb-item__media {
  position: absolute;
  inset: 0 0 21px;
  overflow: hidden;
}

.hq-rb-item__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hq-rb-item__stamp {
  position: absolute;
  top: 3px;
  right: 4px;
  max-width: calc(100% - 8px);
  font-size: calc(8px + var(--coc-font-boost));
  font-weight: 500;
  color: #fff;
  line-height: 1.15;
  text-align: right;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hq-rb-item__name-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  height: 21px;
  box-sizing: border-box;
  background-color: rgba(32, 39, 56, 0.8);
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: 100% 100%;
  pointer-events: none;
}

.hq-rb-item__name {
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  box-sizing: border-box;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hq-rb-item.is-red .hq-rb-item__name {
  color: #ff8a80;
}
</style>
