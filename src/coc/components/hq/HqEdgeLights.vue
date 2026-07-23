<script setup>
import leftLight from '../../assets/hq/edge/left-light.svg?url'
</script>

<template>
  <div class="hq-edge-lights" aria-hidden="true">
    <img
      class="hq-edge-lights__side hq-edge-lights__side--left"
      :src="leftLight"
      width="61"
      height="1065"
      alt=""
      draggable="false"
    />
    <img
      class="hq-edge-lights__side hq-edge-lights__side--right"
      :src="leftLight"
      width="61"
      height="1065"
      alt=""
      draggable="false"
    />
  </div>
</template>

<style scoped>
.hq-edge-lights {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  overflow: visible;
}

.hq-edge-lights__side {
  position: absolute;
  top: 0;
  height: 100%;
  width: 61px;
  object-fit: fill;
  user-select: none;
  pointer-events: none;
}

.hq-edge-lights__side--left {
  left: 0;
}

.hq-edge-lights__side--right {
  right: 0;
  /* 以条带中心为轴翻转，避免 right-origin 把光效翻出画布被 overflow 裁掉 */
  transform: scaleX(-1);
  transform-origin: center center;
}
</style>
