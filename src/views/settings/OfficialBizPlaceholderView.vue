<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => route.meta?.title || '')
</script>

<template>
  <section class="official-biz-page">
    <header class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
    </header>
    <div class="official-biz-card">
      <p class="official-biz-text">具体业务见正式工程</p>
    </div>
  </section>
</template>

<style scoped>
.official-biz-page {
  min-height: 100%;
}

.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.official-biz-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  background: #fff;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
}

.official-biz-text {
  margin: 0;
  font-size: 16px;
  color: var(--ap-text-secondary, #606266);
}
</style>
