<script setup>
import redBlackItemBg from '../../assets/hq/red-black-item-bg.svg?url'
import { hazardImageStyle } from '../../mock/data.js'

defineProps({
  name: { type: String, required: true },
  image: { type: String, default: '' },
  imageHue: { type: Number, default: 145 },
  type: {
    type: String,
    default: 'red',
    validator: (v) => ['red', 'black'].includes(v),
  },
})
</script>

<template>
  <div class="hq-rb-item" :class="`is-${type}`">
    <div class="hq-rb-item__media">
      <img v-if="image" :src="image" alt="" class="hq-rb-item__photo" draggable="false" />
      <div v-else class="hq-rb-item__fallback" :style="hazardImageStyle(imageHue)" />
    </div>
    <img
      class="hq-rb-item__frame"
      :src="redBlackItemBg"
      width="132"
      height="84"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <p class="hq-rb-item__name" :title="name">{{ name }}</p>
  </div>
</template>

<style scoped>
.hq-rb-item {
  position: relative;
  width: 100%;
  aspect-ratio: 132 / 84;
  line-height: 0;
}

.hq-rb-item__media {
  position: absolute;
  inset: 2px 2px 22px;
  overflow: hidden;
  border-radius: 1px;
}

.hq-rb-item__photo,
.hq-rb-item__fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hq-rb-item__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
}

.hq-rb-item__name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22px;
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
  pointer-events: none;
}

.hq-rb-item.is-red .hq-rb-item__name {
  color: #ff8a80;
}
</style>
