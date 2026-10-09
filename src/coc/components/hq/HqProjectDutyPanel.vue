<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  DUTY_SHIFT_DEFS,
  buildProjectDutyToday,
  todayYmd,
} from '../../mock/dutyScreenData.js'
import {
  ensureDutyJoinBaselines,
  getDutyJoinRecord,
  isDutyMeetingActive,
  onDutyJoinChange,
  setDutyJoinStatus,
} from '../../utils/dutyMeetingAttendanceStorage.js'

const props = defineProps({
  project: { type: Object, required: true },
})

const date = todayYmd()

const duty = computed(() => buildProjectDutyToday(props.project, { date }))

const shiftColumns = computed(() =>
  DUTY_SHIFT_DEFS.map((shift) => ({
    ...shift,
    people: shift.key === 'day' ? duty.value.dayPeople : duty.value.nightPeople,
  })),
)

/* ---------------- 参会状态：在场默认已参会，可手动切换，会议结束前不随考勤变化 ---------------- */
const joinStates = ref({})

function personOnSite(person) {
  return person.attendance?.statusKey === 'onSite'
}

function syncJoinStates() {
  const current = duty.value
  const sessionActive = isDutyMeetingActive(date)
  const next = {}
  for (const person of [...current.dayPeople, ...current.nightPeople]) {
    const hit = getDutyJoinRecord(date, current.projectId, person.userId)
    // 人工标注始终有效；自动基线仅在会议进行中生效，其余按考勤（在场）更新
    const effective = hit && (hit.manual || sessionActive) ? hit : null
    next[person.userId] = {
      joined: effective ? Boolean(effective.joined) : personOnSite(person),
      manual: Boolean(effective?.manual),
    }
  }
  joinStates.value = next
}

/** 会议进行中：把首次出现的值班人员落基线冻结（结束会议后清除，恢复按考勤） */
function seedJoinBaselines() {
  if (!isDutyMeetingActive(date)) return
  const current = duty.value
  ensureDutyJoinBaselines(
    date,
    [...current.dayPeople, ...current.nightPeople].map((person) => ({
      projectId: current.projectId,
      projectName: current.projectName,
      personId: person.userId,
      name: person.name,
      phone: person.phone,
      role: person.position,
      shift: person.shiftLabel,
      onSite: personOnSite(person),
    })),
  )
}

function joinStateOf(person) {
  return joinStates.value[person.userId] || { joined: personOnSite(person), manual: false }
}

function toggleJoin(person) {
  const next = !joinStateOf(person).joined
  setDutyJoinStatus({
    date,
    projectId: duty.value.projectId,
    projectName: duty.value.projectName,
    person,
    joined: next,
  })
  syncJoinStates()
  if (next) ElMessage.success(`${person.name} 已标记为已参会`)
  else ElMessage.info(`${person.name} 已标记为未参会`)
}

watch(
  duty,
  () => {
    seedJoinBaselines()
    syncJoinStates()
  },
  { immediate: true },
)

let offJoinChange = null

/** 参会状态变化（含会议开始/结束）时同步：进行中冻结、结束后回到考勤口径 */
function handleJoinChange() {
  seedJoinBaselines()
  syncJoinStates()
}

onMounted(() => {
  offJoinChange = onDutyJoinChange(handleJoinChange)
})

onUnmounted(() => {
  if (typeof offJoinChange === 'function') offJoinChange()
})
</script>

<template>
  <div class="panel-card duty-project-panel">
    <div class="panel-title">
      <span>项目值班</span>
      <span class="panel-v2-tip">V2版本上线</span>
    </div>

    <div class="panel-body duty-project-body">
      <div class="duty-project-shifts">
        <section v-for="shift in shiftColumns" :key="shift.key" class="shift-col">
          <header class="shift-col__head">
            <span class="shift-col__label" :class="`shift-col__label--${shift.key}`">{{ shift.label }}</span>
            <span class="shift-col__count">
              <template v-if="shift.people.length">{{ shift.people.length }} 人</template>
              <template v-else>未排班</template>
            </span>
          </header>

          <div class="shift-col__list">
            <div
              v-for="person in shift.people"
              :key="`${person.slotKey}-${person.userId}`"
              class="person-card"
              :class="{ 'is-offsite': person.attendance.statusKey === 'offSite' }"
            >
              <div class="person-card__head">
                <span class="person-card__name">{{ person.name }}</span>
                <span class="person-card__badges">
                  <span class="person-card__status" :class="`is-${person.attendance.statusKey}`">
                    {{ person.attendance.status }}
                  </span>
                  <button
                    type="button"
                    class="person-card__join"
                    :class="{ 'is-joined': joinStateOf(person).joined }"
                    :title="joinStateOf(person).joined ? '点击标记为未参会' : '点击标记为已参会'"
                    :aria-pressed="joinStateOf(person).joined"
                    @click="toggleJoin(person)"
                  >
                    {{ joinStateOf(person).joined ? '已参会' : '未参会' }}
                  </button>
                </span>
              </div>
              <div class="person-card__post" :title="`${person.position} · ${person.unit}`">
                {{ person.position }} · {{ person.unit }}
              </div>
              <div class="person-card__foot">
                <span class="person-card__party" :class="person.partyKey">{{ person.partyLabel }}</span>
                <!-- 仅「在场」展示考勤凭据；不在场 / 未查询到考勤均不展示原因 -->
                <span
                  v-if="person.attendance.statusKey === 'onSite'"
                  class="person-card__attend"
                  :title="`${person.phoneMasked} · ${person.attendance.detail}`"
                >
                  {{ person.attendance.detail }}
                </span>
              </div>
            </div>

            <div v-if="!shift.people.length" class="shift-empty">
              <span class="shift-empty__hint">该项目当日{{ shift.label }}未安排值班人员</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.duty-project-panel {
  height: 100%;
}

.duty-project-body {
  display: flex;
  flex-direction: column;
  padding: 8px 14px 10px !important;
  min-height: 0;
  overflow: hidden;
}

.duty-project-shifts {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  position: relative;
}

/* 白班 / 夜班 两栏之间的竖向分割线（居中于栏间距，不占布局空间） */
.duty-project-shifts::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(
    180deg,
    rgba(94, 238, 255, 0.08) 0%,
    rgba(94, 238, 255, 0.46) 14%,
    rgba(94, 238, 255, 0.46) 86%,
    rgba(94, 238, 255, 0.08) 100%
  );
  pointer-events: none;
}

.shift-col {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.shift-col__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.shift-col__label {
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  color: #5eeeff;
  letter-spacing: 1px;
}

.shift-col__label--night {
  color: #f6c575;
}

.shift-col__count {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
}

.shift-col__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  grid-auto-rows: min-content;
  gap: 5px;
  align-content: start;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--coc-hq-scrollbar-thumb-solid) var(--coc-hq-scrollbar-track);
}

.shift-col__list::-webkit-scrollbar {
  width: var(--coc-hq-scrollbar-size, 5px);
  height: var(--coc-hq-scrollbar-size, 5px);
}

.shift-col__list::-webkit-scrollbar-track {
  background: var(--coc-hq-scrollbar-track, rgba(255, 255, 255, 0.05));
}

.shift-col__list::-webkit-scrollbar-thumb {
  background: var(--coc-hq-scrollbar-thumb-solid, rgba(94, 238, 255, 0.58));
  border-radius: 3px;
}

.person-card {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 9px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(94, 238, 255, 0.22);
  min-width: 0;
}

.person-card.is-offsite {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.person-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.person-card__name {
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  line-height: 1.2;
  white-space: nowrap;
}

.person-card__badges {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.person-card__status {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 9px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  border: 1px solid transparent;
}

/* 参会标签：可点击切换（在场默认已参会，会议结束前不随考勤更新） */
.person-card__join {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 9px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
  color: var(--coc-text-muted);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}

.person-card__join:hover {
  color: #fff;
  border-color: rgba(94, 238, 255, 0.6);
  background: rgba(94, 238, 255, 0.16);
}

.person-card__join.is-joined {
  color: #5eeeff;
  background: rgba(94, 238, 255, 0.14);
  border-color: rgba(94, 238, 255, 0.42);
}

.person-card__join.is-joined:hover {
  color: #f6c575;
  border-color: rgba(246, 197, 117, 0.6);
  background: rgba(246, 197, 117, 0.14);
}

.person-card__join:focus-visible {
  outline: 2px solid rgba(94, 238, 255, 0.8);
  outline-offset: 1px;
}

.person-card__status.is-onSite {
  color: #5eeeff;
  background: rgba(94, 238, 255, 0.14);
  border-color: rgba(94, 238, 255, 0.42);
}

.person-card__status.is-offSite {
  color: #a8abb2;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.person-card__status.is-noRecord {
  color: #f6c575;
  background: rgba(246, 197, 117, 0.12);
  border-color: rgba(246, 197, 117, 0.36);
}

.person-card__post {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-card__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.person-card__party {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 4px;
  font-size: calc(10px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.5;
}

.person-card__party.duty-party--construction {
  color: #5eeeff;
  background: rgba(94, 238, 255, 0.12);
}

.person-card__party.duty-party--supervision {
  color: #f6c575;
  background: rgba(246, 197, 117, 0.14);
}

.person-card__attend {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.shift-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 8px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 8px;
}

.shift-empty__hint {
  font-size: calc(11px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}
</style>
