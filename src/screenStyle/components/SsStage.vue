<script setup>
import aerialBg from '../assets/airport-aerial.jpg'

/**
 * 中间「模型」舞台：项目航站区航拍图（已做深色化处理）+ 模型浮标卡
 *
 * 底图沿用 COC 大屏的深色体系：图片上叠深蓝蒙层、青色光晕、网格与暗角，
 * 浮标卡采用 COC 面板卡（.panel-card 风格）的等比缩小版，随切页切换点位内容。
 */
defineProps({
  markers: { type: Array, default: () => [] },
  activeKey: { type: String, default: '' },
})
</script>

<template>
  <div class="ss-stage">
    <img class="ss-stage__bg" :src="aerialBg" alt="" aria-hidden="true" draggable="false" />
    <div class="ss-stage__tint" aria-hidden="true" />
    <div class="ss-stage__glow" aria-hidden="true" />
    <div class="ss-stage__grid" aria-hidden="true" />
    <div class="ss-stage__scan" aria-hidden="true" />
    <div class="ss-stage__vignette" aria-hidden="true" />

    <div class="ss-markers">
      <div
        v-for="marker in markers"
        :key="`${activeKey}-${marker.id}`"
        class="ss-marker"
        :class="`is-${marker.tone}`"
        :style="{ left: `${marker.x}%`, top: `${marker.y}%` }"
      >
        <span class="ss-marker__pulse" aria-hidden="true" />
        <div class="ss-marker__card">
          <div class="ss-marker__head">
            <span class="ss-marker__name">{{ marker.label }}</span>
            <span class="ss-marker__value">{{ marker.value }}</span>
          </div>
          <div v-if="marker.rows && marker.rows.length" class="ss-marker__body">
            <div v-for="row in marker.rows" :key="row[0]" class="ss-marker__row">
              <span>{{ row[0] }}</span>
              <b>{{ row[1] }}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
