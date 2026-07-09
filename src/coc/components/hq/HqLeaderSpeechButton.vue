<script setup>
import leaderSpeechBtnBg from '../../assets/hq/leader-speech-btn-bg.svg?url'

defineEmits(['click'])
</script>

<template>
  <button type="button" class="hq-leader-speech" @click="$emit('click')">
    <img
      class="hq-leader-speech__bg"
      :src="leaderSpeechBtnBg"
      width="504"
      height="32"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <span class="hq-leader-speech__label">领导讲话</span>
  </button>
</template>

<style scoped>
.hq-leader-speech {
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  aspect-ratio: 504 / 32;
  line-height: 0;
  transition: filter 0.15s, transform 0.15s;
}

.hq-leader-speech:hover {
  filter: brightness(1.08);
}

.hq-leader-speech:active {
  transform: translateY(1px);
}

.hq-leader-speech:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.65);
  outline-offset: 2px;
}

.hq-leader-speech__bg {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  pointer-events: none;
}

.hq-leader-speech__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
