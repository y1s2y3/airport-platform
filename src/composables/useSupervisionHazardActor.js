import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'coc-supervision-hazard-actor'

export const SUPERVISION_HAZARD_ACTOR_OPTIONS = [
  { value: '施工方', label: '施工方', operator: '施工方用户' },
  { value: '监理', label: '监理', operator: '监理用户' },
]

export function useSupervisionHazardActor() {
  const actorRole = ref(localStorage.getItem(STORAGE_KEY) || '施工方')

  watch(actorRole, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
  })

  const actorOption = computed(
    () => SUPERVISION_HAZARD_ACTOR_OPTIONS.find((item) => item.value === actorRole.value),
  )
  const operatorName = computed(() => actorOption.value?.operator || '未知用户')
  const isContractor = computed(() => actorRole.value === '施工方')
  const isSupervisor = computed(() => actorRole.value === '监理')

  return {
    actorRole,
    operatorName,
    isContractor,
    isSupervisor,
    SUPERVISION_HAZARD_ACTOR_OPTIONS,
  }
}
