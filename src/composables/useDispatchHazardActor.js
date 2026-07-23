import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'coc-dispatch-hazard-actor'

/** 调度隐患：施工方提交整改，安质部验收（对齐监理隐患清单流程） */
export const DISPATCH_HAZARD_ACTOR_OPTIONS = [
  { value: '施工方', label: '施工方', operator: '施工方用户' },
  { value: '安质部', label: '安质部', operator: '安质部用户' },
]

export function useDispatchHazardActor() {
  const actorRole = ref(localStorage.getItem(STORAGE_KEY) || '施工方')

  watch(actorRole, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
  })

  const actorOption = computed(
    () => DISPATCH_HAZARD_ACTOR_OPTIONS.find((item) => item.value === actorRole.value),
  )
  const operatorName = computed(() => actorOption.value?.operator || '未知用户')
  const isContractor = computed(() => actorRole.value === '施工方')
  const isSafetyDept = computed(() => actorRole.value === '安质部')

  return {
    actorRole,
    operatorName,
    isContractor,
    isSafetyDept,
    DISPATCH_HAZARD_ACTOR_OPTIONS,
  }
}
