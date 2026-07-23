<script setup>
import laborKpiCardBg from '../../assets/hq/labor-kpi-card-bg.svg?url'

defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  unit: { type: String, default: '' },
  tone: {
    type: String,
    default: '',
    validator: (v) => ['', 'accent', 'ok', 'warn'].includes(v),
  },
})
</script>

<template>
  <div class="hq-labor-kpi">
    <img
      class="hq-labor-kpi__bg"
      :src="laborKpiCardBg"
      width="225"
      height="68"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <div class="hq-labor-kpi__content">
      <span class="hq-labor-kpi__label">{{ label }}</span>
      <span class="hq-labor-kpi__value" :class="tone ? `is-${tone}` : undefined">
        <span class="hq-labor-kpi__number">{{ value }}</span>
        <span v-if="unit" class="hq-labor-kpi__unit">{{ unit }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.hq-labor-kpi {
  position: relative;
  width: 100%;
  aspect-ratio: 225 / 68;
  line-height: normal;
}

.hq-labor-kpi__bg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  pointer-events: none;
  z-index: 0;
}

.hq-labor-kpi__content {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  grid-template-rows: 34% 1fr;
  align-items: center;
  justify-items: center;
  box-sizing: border-box;
  padding: 0 10px 7px;
  pointer-events: none;
}

.hq-labor-kpi__label {
  align-self: end;
  padding-bottom: 2px;
  color: #fff;
  font-family: 'Alimama FangYuanTi VF', 'PingFang SC', sans-serif;
  font-size: 15.008px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  white-space: nowrap;
}

.hq-labor-kpi__value {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  gap: 2px;
  width: 100%;
  white-space: nowrap;
  transform: translateY(2px);
}

.hq-labor-kpi__number {
  color: #fff;
  font-family: 'D-DIN-PRO', 'DIN Pro', 'D-DIN', sans-serif;
  font-size: 30.015px;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
}

.hq-labor-kpi__value.is-warn .hq-labor-kpi__number {
  color: #ff5252;
}

.hq-labor-kpi__unit {
  color: #fff;
  font-family: 'Alimama FangYuanTi VF', 'PingFang SC', sans-serif;
  font-size: 15.008px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}
</style>
