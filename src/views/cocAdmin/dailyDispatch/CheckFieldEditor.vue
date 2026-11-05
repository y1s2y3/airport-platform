<script setup>
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { clone, emptyCheck } from '../../../utils/dailyDispatchCheckRules.js'
import DailyCheckImages from './DailyCheckImages.vue'
const props = defineProps({ modelValue: { type: Object, default: emptyCheck }, kind: { type: String, default: 'check' }, label: { type: String, default: '检查情况' }, person: Boolean, section: { type: String, default: 'all' }, errors: { type: Object, default: () => ({}) } })
const emit = defineEmits(['update:modelValue'])
const value = computed(() => props.modelValue || emptyCheck())
function update(key, next) { emit('update:modelValue', { ...clone(value.value), [key]: next }) }
function setType(type) {
  const next = { ...emptyCheck(), ...clone(value.value), type: type || '' }
  if (type === 'problem' && !next.problems?.length) next.problems = [{ text: '', images: [] }]
  emit('update:modelValue', next)
}
function addProblem() {
  if ((value.value.problems || []).length >= 10) return
  update('problems', [...(value.value.problems || []), { text: '', images: [] }])
}
function problem(index, key, next) { const items = clone(value.value.problems || []); items[index] = { ...items[index], [key]: next }; update('problems', items) }
</script>
<template>
  <div class="dispatch-check-field" :class="{ 'is-normal': value.type === 'normal', 'is-project-person': person }">
    <el-select v-if="section !== 'details'" :model-value="value.type" clearable placeholder="请选择" :aria-label="label" @update:model-value="setType">
      <el-option label="正常" value="normal" /><el-option v-if="kind !== 'personnel'" label="发现问题" value="problem" /><el-option label="其他" value="other" />
    </el-select>
    <p v-if="section !== 'details' && errors.type" class="daily-field-error" role="alert">{{ errors.type }}</p>
    <template v-if="section !== 'type' && value.type === 'normal' && person">
      <el-input :model-value="value.normalText" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" aria-label="正常检查说明" @update:model-value="update('normalText', $event)" />
      <p v-if="errors.text" class="daily-field-error" role="alert">{{ errors.text }}</p>
    </template>
    <template v-if="section !== 'type' && value.type === 'problem' && kind !== 'personnel'">
      <p v-if="errors.problems" class="daily-field-error" role="alert">{{ errors.problems }}</p>
      <div v-for="(item, i) in value.problems" :key="i" class="dispatch-problem-input">
        <div class="daily-problem-heading"><label><span class="daily-required">*</span> 问题{{ i + 1 }}</label><el-button :icon="Delete" link type="danger" :aria-label="`删除${label}问题${i + 1}`" @click="update('problems', value.problems.filter((_, n) => n !== i))">删除</el-button></div>
        <div class="dispatch-problem-content">
          <div class="daily-problem-description">
            <el-input :model-value="item.text" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" maxlength="500" show-word-limit :placeholder="`请输入问题${i + 1}的具体描述`" :aria-label="`${label}问题${i + 1}`" @update:model-value="problem(i, 'text', $event)" />
            <p v-if="errors[`problem-${i}`]" class="daily-field-error" role="alert">{{ errors[`problem-${i}`] }}</p>
          </div>
          <div class="daily-problem-uploads" :aria-label="`问题${i + 1}图片`">
            <label class="daily-image-label"><span class="daily-required">*</span> 问题图片</label>
            <DailyCheckImages required :model-value="item.images || []" @update:model-value="problem(i, 'images', $event)" />
            <p v-if="errors[`images-${i}`]" class="daily-field-error" role="alert">{{ errors[`images-${i}`] }}</p>
          </div>
        </div>
      </div>
      <el-tooltip content="最多添加10条问题" :disabled="value.problems.length < 10" placement="top"><span class="daily-add-problem"><el-button :icon="Plus" link type="primary" :disabled="value.problems.length >= 10" @click="addProblem">新增问题</el-button></span></el-tooltip>
      <p v-if="person && errors.images" class="daily-field-error" role="alert">{{ errors.images }}</p>
    </template>
    <template v-if="section !== 'type' && value.type === 'other'">
      <el-input :model-value="kind === 'personnel' ? value.text : value.other" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" :maxlength="kind === 'personnel' ? 100 : 500" show-word-limit placeholder="请输入具体情况" :aria-label="`${label}具体情况`" @update:model-value="update(kind === 'personnel' ? 'text' : 'other', $event)" />
      <p v-if="errors.text" class="daily-field-error" role="alert">{{ errors.text }}</p>
    </template>
  </div>
</template>
<style scoped>
.dispatch-check-field { display: flex; flex-direction: column; gap: 8px; width: 100%; min-width: 0; }
.dispatch-check-field .el-select { width: 100%; }
.dispatch-problem-input { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--ap-border); border-radius: 4px; min-width: 0; }
.daily-problem-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dispatch-problem-content { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.daily-problem-description, .daily-problem-uploads { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.is-project-person .dispatch-problem-content { display: flex; flex-direction: column; gap: 8px; }
.is-project-person .dispatch-problem-input { padding: 16px; gap: 12px; border-radius: 6px; }
@container daily-project-layout (max-width: 700px) { .is-project-person .dispatch-problem-content { grid-template-columns: minmax(0, 1fr); gap: 12px; } }
.daily-image-label { font-size: 13px; color: var(--ap-text-secondary); }
.daily-field-error { margin: 0; font-size: 12px; color: var(--el-color-danger); }
.daily-add-problem { display: inline-flex; align-self: flex-start; max-width: 100%; }
.daily-required, .daily-image-label span { color: var(--el-color-danger); }
.is-project-person .dispatch-problem-input { background: var(--ap-bg-soft); }
.is-project-person .daily-problem-heading > label { font-size: 14px; font-weight: 500; color: var(--ap-text); }
</style>
