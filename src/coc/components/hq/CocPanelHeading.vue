<script setup>
defineProps({
  title: { type: String, required: true },
})
</script>

<template>
  <div class="hq-panel-heading-wrap">
    <div class="hq-panel-heading">
      <span class="hq-panel-heading__diamond" aria-hidden="true" />
      <span class="hq-panel-heading__text">{{ title }}</span>
    </div>
    <div class="hq-panel-heading__line" aria-hidden="true" />
  </div>
</template>
