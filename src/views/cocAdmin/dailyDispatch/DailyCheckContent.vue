<script setup>
import { computed } from 'vue'
import { checkText, checkPreview, checkImages, problemText, personnelText, personImages, personFilled, text } from '../../../utils/dailyDispatchCheckRules.js'
import DailyCheckImages from './DailyCheckImages.vue'
import DailyCheckStatus from './DailyCheckStatus.vue'
import DailyReadField from './DailyReadField.vue'
import DailyReadProblems from './DailyReadProblems.vue'
const props = defineProps({ value: Object, person: Boolean, personnel: Boolean, compact: Boolean, detail: Boolean, label: String, showImages: { type: Boolean, default: true }, showStatus: { type: Boolean, default: true } })
const check = computed(() => props.person ? personFilled(props.value) ? props.value?.check : undefined : props.value)
const legacy = computed(() => props.person && props.value?.schemaVersion !== 4)
const normalDescription = computed(() => props.personnel ? '' : text(check.value?.normalText))
const contentText = computed(() => props.personnel ? personnelText(check.value) : checkText(check.value))
const preview = computed(() => checkPreview(check.value))
const detailProblems = computed(() => (check.value?.problems || []).filter(problem => problemText(problem) || problem?.images?.length))
const problemCount = computed(() => (check.value?.problems || []).filter(problemText).length)
const images = computed(() => props.person ? personFilled(props.value) || legacy.value ? personImages(props.value) : [] : checkImages(check.value))
const hasDetailBody = computed(() => {
  if (legacy.value) return !!(props.value?.text?.trim() || images.value.length)
  if (check.value?.type === 'normal') return !!(normalDescription.value || images.value.length)
  if (check.value?.type === 'problem') return !!detailProblems.value.length
  if (props.personnel && check.value?.type === 'ok') return false
  return !!(contentText.value || images.value.length)
})
</script>
<template>
  <div class="daily-check-content" :class="{ 'is-compact': compact, 'is-detail': detail }" :data-state="legacy ? 'legacy' : check?.type || 'empty'">
    <DailyReadField v-if="detail" :label="label" :initially-expanded="hasDetailBody" :collapsible="hasDetailBody" :show-body="hasDetailBody">
      <template #summary>
        <template v-if="legacy"><span v-if="!value?.text?.trim() && !images.length" class="daily-result-empty">--</span></template>
        <DailyCheckStatus v-else-if="check?.type === 'normal'" status="normal" />
        <DailyCheckStatus v-else-if="check?.type === 'problem'" status="problem" :count="problemCount" />
        <DailyCheckStatus v-else-if="check?.type === 'other'" status="other" />
        <span v-else-if="personnel && check?.type === 'ok'" class="daily-result-legacy">{{ contentText }}</span><span v-else-if="!contentText && !images.length" class="daily-result-empty">--</span>
      </template>
      <p v-if="legacy && value?.text?.trim()" class="daily-result-other">{{ value.text }}</p>
      <p v-else-if="!legacy && check?.type !== 'normal' && check?.type !== 'problem' && !(personnel && check?.type === 'ok') && contentText" class="daily-result-other">{{ contentText }}</p>
      <p v-if="!legacy && check?.type === 'normal' && normalDescription" class="daily-result-body">{{ normalDescription }}</p>
      <DailyReadProblems v-if="check?.type === 'problem' && detailProblems.length" :problems="detailProblems" />
      <span v-else-if="check?.type === 'problem'" class="daily-result-empty">--</span>
      <DailyCheckImages v-if="check?.type !== 'problem' && images.length" :model-value="images" readonly />
    </DailyReadField>
    <template v-else><template v-if="legacy"><p :class="[value?.text?.trim() ? 'daily-result-other' : 'daily-result-empty', { 'daily-result-preview': compact }]">{{ value?.text || '--' }}</p><DailyCheckImages v-if="!compact && images.length" :model-value="images" readonly /></template>
    <template v-else-if="check?.type === 'normal'">
      <DailyCheckStatus v-if="showStatus" status="normal" />
      <p v-if="normalDescription" class="daily-result-body" :class="{ 'daily-result-preview': compact }">{{ normalDescription }}</p>
      <DailyCheckImages v-if="!compact && check.normalImages?.length" :model-value="check.normalImages" readonly />
    </template>
    <template v-else-if="check?.type === 'problem'">
      <DailyCheckStatus v-if="showStatus" status="problem" />
      <template v-if="compact"><p v-for="(line, index) in preview.lines" :key="index" class="daily-result-body daily-result-preview">{{ line }}</p><span v-if="!preview.lines.length" class="daily-result-empty">--</span><span v-if="preview.remaining" class="daily-result-remaining">另有{{ preview.remaining }}项…</span></template>
      <template v-else><DailyReadProblems v-if="detailProblems.length" :problems="detailProblems" /><span v-else class="daily-result-empty">--</span></template>
    </template>
    <template v-else><DailyCheckStatus v-if="showStatus && check?.type === 'other'" status="other" /><p :class="[contentText ? 'daily-result-other' : 'daily-result-empty', { 'daily-result-preview': compact }]">{{ contentText || '--' }}</p><DailyCheckImages v-if="!compact && check?.type === 'other' && check.otherImages?.length" :model-value="check.otherImages" readonly /></template>
    <DailyCheckImages v-if="compact && showImages && images.length" :model-value="images" :preview-limit="2" readonly compact /></template>
  </div>
</template>
<style scoped>
.daily-check-content { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; width: 100%; min-width: 0; color: var(--ap-text); }
.daily-check-content p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.daily-result-body { color: var(--ap-text); }
.daily-result-other { color: var(--ap-text); }
.daily-result-remaining { color: var(--ap-text-secondary); }
.daily-result-empty { color: var(--ap-text-muted); }
.daily-result-images { color: var(--ap-primary); font-size: 14px; font-weight: 400; line-height: 1.6; white-space: nowrap; }
.daily-check-content.is-compact { gap: 2px; line-height: 1.6; font-size: 14px; }
.daily-check-content.is-compact .daily-result-preview { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; text-align: left; }
.daily-check-content.is-compact .daily-result-images { margin-top: 2px; }
.daily-check-content.is-detail { width: 100%; align-self: stretch; gap: 0; font-size: 14px; font-weight: 400; line-height: 22px; text-align: left; }
.daily-check-content.is-detail p { font-size: 14px; font-weight: 400; line-height: 22px; text-align: left; }
.daily-check-content.is-detail .daily-result-other { color: var(--ap-text); }
.daily-check-content.is-detail .daily-result-body { font-size: 14px; line-height: 22px; }
</style>
