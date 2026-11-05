<script setup>
import { ref, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
const props = defineProps({
  label: { type: String, required: true },
  collapsible: { type: Boolean, default: true },
  initiallyExpanded: { type: Boolean, default: true },
  showBody: { type: Boolean, default: true },
  expandOnError: { type: Boolean, default: false },
  expandWhen: { type: Boolean, default: false }
})
const expanded = ref(props.initiallyExpanded)
watch(() => props.expandOnError, hasError => { if (hasError) expanded.value = true })
watch(() => props.expandWhen, shouldExpand => { if (shouldExpand) expanded.value = true })
function toggle() { if (!props.expandOnError) expanded.value = !expanded.value }
</script>
<template>
  <section class="daily-read-field" :class="{ 'is-collapsed': !expanded }" :aria-label="label">
    <div class="daily-read-field-header" @click="collapsible && toggle()">
      <button v-if="collapsible" type="button" class="daily-read-field-toggle" :aria-expanded="expanded" @click.stop="toggle">
        <span class="daily-read-field-title" role="heading" aria-level="3">{{ label }}</span>
        <span class="daily-read-field-summary"><slot name="summary" /></span>
      </button>
      <div v-else class="daily-read-field-toggle daily-read-field-static">
        <span class="daily-read-field-title" role="heading" aria-level="3">{{ label }}</span>
        <span class="daily-read-field-summary"><slot name="summary" /></span>
      </div>
      <span v-if="$slots.actions" class="daily-read-field-actions" @click.stop><slot name="actions" /></span>
      <el-icon v-if="collapsible" aria-hidden="true" class="daily-read-field-chevron" :class="{ 'is-expanded': expanded }"><ArrowDown /></el-icon>
    </div>
    <div v-if="showBody" v-show="!collapsible || expanded" class="daily-read-field-body"><slot /></div>
  </section>
</template>
<style scoped>
.daily-read-field { width: 100%; max-width: 100%; box-sizing: border-box; min-width: 0; border: 1px solid var(--ap-border); border-radius: 6px; background: var(--ap-card); overflow: hidden; font-size: 14px; }
.daily-read-field-header { display: flex; align-items: center; min-height: 44px; background: var(--ap-bg-soft); }
.daily-read-field-toggle { display: flex; align-items: center; width: 100%; flex: 1; min-width: 0; min-height: 44px; gap: 10px; padding: 10px 14px; border: 0; text-align: left; color: var(--ap-text); background: transparent; font: inherit; cursor: pointer; }
.daily-read-field-static { cursor: default; }
.daily-read-field-toggle:focus-visible { outline: 2px solid var(--ap-primary); outline-offset: -2px; }
.daily-read-field-title { margin: 0; font-size: 14px; font-weight: 600; line-height: 22px; flex: 0 1 auto; overflow-wrap: anywhere; }
.daily-read-field-summary { display: inline-flex; margin-left: auto; min-width: 0; align-items: center; gap: 6px; font-size: 13px; color: var(--ap-text-secondary); }
.daily-read-field-actions { flex: 0 0 auto; display: inline-flex; align-items: center; padding-right: 8px; }
.daily-read-field-chevron { flex: 0 0 auto; margin: 0 14px 0 0; cursor: pointer; font-size: 14px; color: var(--ap-text-secondary); transition: transform .18s ease; }
.daily-read-field-chevron.is-expanded { transform: rotate(180deg); }
.daily-read-field-body { width: 100%; box-sizing: border-box; padding: 12px 14px 14px; min-width: 0; line-height: 1.65; }
.daily-read-field-body:empty { display: none; }
@media (prefers-reduced-motion: reduce) { .daily-read-field-chevron { transition: none; } }
</style>
