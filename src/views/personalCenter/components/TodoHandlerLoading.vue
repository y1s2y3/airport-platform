<script setup>
/** 个人中心待办 Handler 异步加载占位 */
</script>

<template>
  <section class="block block--panel handler-loading">
    <el-skeleton animated :rows="5" />
  </section>
</template>

<style scoped>
.handler-loading {
  padding: 20px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
}
</style>
