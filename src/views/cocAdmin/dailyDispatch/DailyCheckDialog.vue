<script setup>
defineOptions({ inheritAttrs: false })
defineProps({ modelValue: Boolean, title: { type: String, default: '' }, width: { type: [String, Number], default: '860px' } })
defineEmits(['update:modelValue'])
</script>

<template>
  <el-dialog v-bind="$attrs" :model-value="modelValue" :title="title" :width="width" align-center append-to-body class="daily-dispatch-dialog" :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </el-dialog>
</template>

<style>
/* Only dialogs owned by this feature; the rest of the platform keeps its existing rules. */
.daily-dispatch-dialog.el-dialog { display: flex; flex-direction: column; margin: auto; max-width: min(1200px, calc(100vw - 48px)); max-height: min(750px, calc(100dvh - 48px)); overflow: hidden; }
.daily-dispatch-dialog > .el-dialog__header, .daily-dispatch-dialog > .el-dialog__footer { flex: 0 0 auto; }
.daily-dispatch-dialog > .el-dialog__header { padding-right: 32px; overflow-wrap: anywhere; }
.daily-dispatch-dialog > .el-dialog__body { flex: 0 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; }
.daily-dispatch-dialog .el-form-item__content { min-width: 0; }
.daily-dispatch-dialog .el-select, .daily-dispatch-dialog .el-input, .daily-dispatch-dialog .el-textarea { max-width: 100%; min-width: 0; }
/* Keep inline layout: MessageBox centers the panel against its overlay pseudo-element. */
.daily-dispatch-confirm.el-message-box { width: 440px; max-width: calc(100vw - 48px); max-height: min(750px, calc(100dvh - 48px)); display: inline-flex; flex-direction: column; }
.daily-dispatch-confirm > .el-message-box__header, .daily-dispatch-confirm > .el-message-box__btns { flex: 0 0 auto; }
.daily-dispatch-confirm > .el-message-box__content { min-height: 0; overflow-y: auto; overflow-wrap: anywhere; }
.daily-dispatch-select-popper.el-popper { max-width: calc(100vw - 48px); }
.daily-dispatch-select-popper .el-select-dropdown__wrap { max-height: 240px; }
.daily-dispatch-select-popper .el-select-dropdown__item { height: auto; min-height: 34px; line-height: 1.5; padding-top: 8px; padding-bottom: 8px; white-space: normal; overflow-wrap: anywhere; }
</style>
