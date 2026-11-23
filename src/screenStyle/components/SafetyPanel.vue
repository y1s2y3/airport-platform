<script setup>
defineProps({ title: { type: String, required: true } })
defineEmits(['details'])
</script>

<template>
  <section class="hd-panel" :aria-label="title">
    <header class="hd-panel-head">
      <h2>{{ title }}</h2>
      <button type="button" class="hd-view" :aria-label="'查看' + title" @click="$emit('details')">查看</button>
    </header>
    <div class="hd-panel-body"><slot /></div>
  </section>
</template>
