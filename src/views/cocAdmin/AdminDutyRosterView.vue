<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, View, Camera, CopyDocument, Delete } from '@element-plus/icons-vue'
import AttachmentUpload from '../../components/common/AttachmentUpload.vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { findProjectById } from '../../mock/projectBasicInfo.js'
import {
  SHIFT_GROUPS,
  SLOT_DEFS,
  WEEKDAY_LABELS,
  ensureDutyRosterSeed,
  listDutyWeeks,
  emptyDutyWeek,
  normalizeDutyWeek,
  saveDutyWeek,
  saveDutyDayPhotos,
  removeDutyWeek,
  findDutyWeek,
  cloneDutyWeekFromPrevious,
  formatWeekRange,
  toWeekStartMonday,
  addDaysYmd,
  todayYmd,
  canBackfillPhotoForDate,
  listDutyPersonOptions,
  summarizeDutyWeek,
  findSameShiftPartyConflicts,
} from '../../mock/dutyRoster.js'

defineProps({
  title: { type: String, default: '每周值班表' },
  description: { type: String, default: '' },
})

const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()

const weekFilter = ref(toWeekStartMonday(todayYmd()))
const keyword = ref('')
const list = ref([])

const formVisible = ref(false)
const formMode = ref('create')
const form = ref(emptyDutyWeek())
const activeDayTab = ref('0')

const detailVisible = ref(false)
const detail = ref(null)

const photoVisible = ref(false)
const photoForm = ref({
  weekId: '',
  date: '',
  dayPhotos: [],
  nightPhotos: [],
  weekdayLabel: '',
})

const constructionOptions = computed(() =>
  listDutyPersonOptions(form.value.projectId || laborProjectId.value, 'construction'),
)
const supervisionOptions = computed(() =>
  listDutyPersonOptions(form.value.projectId || laborProjectId.value, 'supervision'),
)

const photoDateOptions = computed(() => {
  const days = detail.value?.days || form.value?.days || []
  return days
    .filter((d) => canBackfillPhotoForDate(d.date))
    .map((d) => ({
      value: d.date,
      label: `${d.weekdayLabel || ''} ${d.date}`.trim(),
    }))
})

const isProjectMode = computed(() => !isHqSelected.value)

function resolveProjectMeta() {
  const id = laborProjectId.value
  const basic = id ? findProjectById(id) : null
  return {
    projectId: id || '',
    projectName: basic?.shortName || basic?.projectName || projectLabel.value || '',
  }
}

function reload() {
  ensureDutyRosterSeed()
  if (isHqSelected.value) {
    list.value = listDutyWeeks({
      weekStart: weekFilter.value,
      keyword: keyword.value,
    })
  } else {
    const { projectId } = resolveProjectMeta()
    list.value = projectId
      ? listDutyWeeks({ projectId, keyword: keyword.value })
      : []
  }
}

watch([isHqSelected, laborProjectId, weekFilter], () => reload())

function onWeekFilterChange(val) {
  weekFilter.value = toWeekStartMonday(val || todayYmd())
  reload()
}

/** 新增时默认周：优先本周；若已存在则顺延到最近尚未排班的一周 */
function resolveDefaultCreateWeek(projectId) {
  let ws = toWeekStartMonday(todayYmd())
  for (let i = 0; i < 52; i += 1) {
    if (!findDutyWeek(projectId, ws)) return ws
    ws = addDaysYmd(ws, 7)
  }
  return toWeekStartMonday(todayYmd())
}

function openCreate() {
  if (!isProjectMode.value) return
  const { projectId, projectName } = resolveProjectMeta()
  if (!projectId) {
    ElMessage.warning('请先在顶栏切换到具体项目')
    return
  }
  const ws = resolveDefaultCreateWeek(projectId)
  formMode.value = 'create'
  form.value = emptyDutyWeek(projectId, projectName, ws)
  activeDayTab.value = '0'
  formVisible.value = true
}

/** 新增选周：已有值班表的周在日历中禁用 */
function disabledCreateWeekDate(date) {
  if (formMode.value !== 'create') return false
  const { projectId } = resolveProjectMeta()
  if (!projectId) return false
  return !!findDutyWeek(projectId, toWeekStartMonday(date))
}

function openEdit(row) {
  if (!isProjectMode.value) return
  formMode.value = 'edit'
  form.value = normalizeDutyWeek(row)
  activeDayTab.value = '0'
  formVisible.value = true
}

function openDetail(row) {
  detail.value = summarizeDutyWeek(row)
  detailVisible.value = true
}

function openPhotoBackfill(row) {
  if (!isProjectMode.value) return
  const week = summarizeDutyWeek(row)
  const candidates = (week.days || []).filter((d) => canBackfillPhotoForDate(d.date))
  if (!candidates.length) {
    ElMessage.warning('本周暂无可补录日期（仅可补录今天及更早）')
    return
  }
  const preferred =
    candidates.find((d) => d.date === todayYmd()) || candidates[candidates.length - 1]
  photoForm.value = {
    weekId: week.id,
    date: preferred.date,
    dayPhotos: [...(preferred.dayPhotos || [])],
    nightPhotos: [...(preferred.nightPhotos || [])],
    weekdayLabel: preferred.weekdayLabel || '',
  }
  detail.value = week
  photoVisible.value = true
}

function onPhotoDateChange(date) {
  const week = detail.value
  const day = (week?.days || []).find((d) => d.date === date)
  photoForm.value.dayPhotos = [...(day?.dayPhotos || [])]
  photoForm.value.nightPhotos = [...(day?.nightPhotos || [])]
  photoForm.value.weekdayLabel = day?.weekdayLabel || ''
}

async function copyLastWeek() {
  const { projectId } = resolveProjectMeta()
  const ws = form.value.weekStart
  const res = cloneDutyWeekFromPrevious(projectId, ws)
  if (!res.ok) {
    ElMessage.warning(res.msg || '复制失败')
    return
  }
  form.value = {
    ...form.value,
    days: res.data.days,
  }
  ElMessage.success(`已复制上周（${res.fromWeekStart}）排班，照片需另行补录`)
}

function onFormWeekChange(val) {
  if (!val) return
  const ws = toWeekStartMonday(val)
  const { projectId, projectName } = resolveProjectMeta()
  if (formMode.value === 'create' && findDutyWeek(projectId, ws)) {
    ElMessage.warning('该周值班表已存在，请另选一周或直接修改')
    return
  }
  const keepPeople = form.value.days
  const nextDays = emptyDutyWeek(projectId, projectName, ws).days.map((d, i) => ({
    ...d,
    constructionDay: keepPeople[i]?.constructionDay || [],
    constructionNight: keepPeople[i]?.constructionNight || [],
    supervisionDay: keepPeople[i]?.supervisionDay || [],
    supervisionNight: keepPeople[i]?.supervisionNight || [],
    dayPhotos: [],
    nightPhotos: [],
  }))
  form.value = {
    ...form.value,
    weekStart: ws,
    weekEnd: emptyDutyWeek(projectId, projectName, ws).weekEnd,
    days: nextDays,
  }
  activeDayTab.value = '0'
}

function personIdsOf(day, key) {
  return (day[key] || []).map((p) => p.userId)
}

function setPersonIds(day, key, party, ids) {
  const pool = listDutyPersonOptions(form.value.projectId, party)
  const map = new Map(pool.map((p) => [p.userId, p]))
  const selected = (ids || []).map((id) => map.get(id)).filter(Boolean).slice(0, 9)
  day[key] = selected
}

/**
 * 同班次内「施工 / 监理」互斥：同一人已被另一角色选中时置灰不可选（跨班次允许同一人）
 */
function crossPartySlotDef(def) {
  return SLOT_DEFS.find((s) => s.shift === def.shift && s.party !== def.party)
}

function isCrossPartyTaken(day, def, userId) {
  const other = crossPartySlotDef(def)
  return other ? personIdsOf(day, other.key).includes(userId) : false
}

function conflictText(conflict) {
  return `${conflict.weekdayLabel}${conflict.shiftLabel}「${conflict.person.name}」已作为施工值班，同一班次内不能同时作为监理值班`
}

function submitForm() {
  const payload = normalizeDutyWeek(form.value)
  const conflict = findSameShiftPartyConflicts(payload)[0]
  if (conflict) {
    const idx = payload.days.findIndex((d) => d.date === conflict.date)
    if (idx >= 0) activeDayTab.value = String(idx)
    ElMessage.warning(conflictText(conflict))
    return
  }
  const res = saveDutyWeek(payload, {
    mode: formMode.value === 'create' ? 'create' : 'edit',
    updatedBy: isProjectMode.value ? '项目值班员' : '指挥部',
  })
  if (!res.ok) {
    ElMessage.error(res.msg || '保存失败')
    return
  }
  ElMessage.success(formMode.value === 'create' ? '已新增并生效' : '已保存并生效')
  formVisible.value = false
  reload()
}

function submitPhotos() {
  const res = saveDutyDayPhotos(
    {
      weekId: photoForm.value.weekId,
      date: photoForm.value.date,
      dayPhotos: photoForm.value.dayPhotos,
      nightPhotos: photoForm.value.nightPhotos,
    },
    { updatedBy: '项目值班员' },
  )
  if (!res.ok) {
    ElMessage.error(res.msg || '补录失败')
    return
  }
  ElMessage.success('白班/夜班照片已补录')
  photoVisible.value = false
  reload()
  if (detailVisible.value) detail.value = res.data
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除 ${row.projectName}「${formatWeekRange(row.weekStart)}」值班表？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeDutyWeek(row.id)
  if (!res.ok) {
    ElMessage.error(res.msg || '删除失败')
    return
  }
  ElMessage.success('已删除')
  reload()
}

/** 详情：多人逐行展示，空则 -- */
function personLabelsOf(day, key) {
  const arr = day?.[key] || []
  return arr.map((p) => p.optionLabel || p.name).filter(Boolean)
}

function shiftPhotosOf(day, shift) {
  return shift === 'night' ? day?.nightPhotos || [] : day?.dayPhotos || []
}

function photoCountText(list) {
  const n = list?.length || 0
  return n ? `${n} 张` : '--'
}

/** 详情窄栏最多展示 4 张小图，其余以 +N 提示（点开大图仍可翻页查看全部） */
const DETAIL_PHOTO_LIMIT = 4

function extraPhotoCount(list) {
  return Math.max(0, (list?.length || 0) - DETAIL_PHOTO_LIMIT)
}

onMounted(reload)
</script>

<template>
  <div class="panel-card admin-page duty-roster-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-date-picker
          v-if="isHqSelected"
          :model-value="weekFilter"
          type="week"
          format="YYYY 第 ww 周"
          value-format="YYYY-MM-DD"
          placeholder="选择周次"
          style="width: 180px"
          @update:model-value="onWeekFilterChange"
        />
        <el-input
          v-model="keyword"
          clearable
          :placeholder="isHqSelected ? '项目名称' : '周次关键词'"
          style="width: 180px"
          @clear="reload"
          @keyup.enter="reload"
        />
        <el-button @click="reload">查询</el-button>
        <el-button
          v-if="isProjectMode"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          新增值班表
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="info"
      :closable="false"
      show-icon
      class="mode-tip"
      title="指挥部汇总只读：按周查看各项目值班安排与已补录白班/夜班照片，不可编辑。"
    />
    <el-alert
      v-else
      type="info"
      :closable="false"
      show-icon
      class="mode-tip"
      :title="`当前项目：${projectLabel || '--'}。排班保存即生效；白班/夜班照片可分别补录今天及更早（各 image 0～9 张）。`"
    />

    <el-table :data="list" stripe border empty-text="暂无值班表">
      <el-table-column v-if="isHqSelected" prop="projectName" label="项目" min-width="140" show-overflow-tooltip />
      <el-table-column label="周次" min-width="200">
        <template #default="{ row }">{{ formatWeekRange(row.weekStart) }}</template>
      </el-table-column>
      <el-table-column label="已排班次" width="110" align="center">
        <template #default="{ row }">{{ row.filledSlotCount }}/{{ row.totalSlotCount }}</template>
      </el-table-column>
      <el-table-column label="施工人次" width="100" align="center">
        <template #default="{ row }">{{ row.constructionCount }}</template>
      </el-table-column>
      <el-table-column label="监理人次" width="100" align="center">
        <template #default="{ row }">{{ row.supervisionCount }}</template>
      </el-table-column>
      <el-table-column label="已补录照片天数" width="130" align="center">
        <template #default="{ row }">{{ row.photoDayCount }}</template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
      </el-table-column>
      <el-table-column label="操作" :width="isProjectMode ? 280 : 100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <template v-if="isProjectMode">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">修改</el-button>
            <el-button link type="warning" :icon="Camera" @click="openPhotoBackfill(row)">补录照片</el-button>
            <el-button link type="danger" :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 修改：侧抽屉 -->
    <el-drawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新增值班表' : '修改值班排班'"
      size="640px"
      destroy-on-close
    >
      <el-form label-width="96px" class="duty-form">
        <el-form-item label="项目">
          <span>{{ form.projectName || '--' }}</span>
        </el-form-item>
        <el-form-item label="选择周次" required>
          <el-date-picker
            :model-value="form.weekStart"
            type="week"
            format="YYYY 第 ww 周"
            value-format="YYYY-MM-DD"
            placeholder="请在日历中选择周"
            :disabled="formMode === 'edit'"
            :disabled-date="disabledCreateWeekDate"
            :clearable="false"
            style="width: 100%"
            @update:model-value="onFormWeekChange"
          />
          <div class="field-hint">
            区间：{{ formatWeekRange(form.weekStart) }}
            <template v-if="formMode === 'create'">；可任选未来或历史周，已排班的周不可选</template>
          </div>
        </el-form-item>
        <el-form-item label="快捷">
          <el-button :icon="CopyDocument" @click="copyLastWeek">复制上周排班</el-button>
          <span class="field-hint inline">不含照片；0 人表示无施工/本班无安排；同一班次内施工与监理不可选同一人（跨班次允许）</span>
        </el-form-item>

        <el-tabs v-model="activeDayTab" type="card" class="day-tabs">
          <el-tab-pane
            v-for="(day, idx) in form.days"
            :key="day.date"
            :label="`${WEEKDAY_LABELS[idx]} ${day.date.slice(5)}`"
            :name="String(idx)"
          >
            <div class="day-block">
              <div
                v-for="group in SHIFT_GROUPS"
                :key="group.shift"
                class="shift-group"
              >
                <div class="shift-group-title">{{ group.label }}</div>
                <el-form-item
                  v-for="def in group.slots"
                  :key="def.key"
                  :label="def.partyLabel"
                >
                  <el-select
                    :model-value="personIdsOf(day, def.key)"
                    multiple
                    filterable
                    collapse-tags
                    collapse-tags-tooltip
                    :max-collapse-tags="2"
                    placeholder="0～9 人，可空"
                    style="width: 100%"
                    @update:model-value="(ids) => setPersonIds(day, def.key, def.party, ids)"
                  >
                    <el-option
                      v-for="opt in def.party === 'supervision' ? supervisionOptions : constructionOptions"
                      :key="opt.userId"
                      :label="opt.optionLabel"
                      :value="opt.userId"
                      :disabled="
                        isCrossPartyTaken(day, def, opt.userId) ||
                        (personIdsOf(day, def.key).length >= 9 &&
                          !personIdsOf(day, def.key).includes(opt.userId))
                      "
                    />
                  </el-select>
                </el-form-item>
              </div>
              <el-alert
                type="info"
                :closable="false"
                title="值班照片不在此处上传；保存后通过「补录照片」分别录入白班、夜班现场照片（今天及更早）。"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <div class="drawer-actions">
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存并生效</el-button>
      </div>
    </el-drawer>

    <!-- 补录照片：区分白班 / 夜班 -->
    <el-drawer v-model="photoVisible" title="补录值班照片" size="560px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="补录日期" required>
          <el-select
            v-model="photoForm.date"
            style="width: 100%"
            @change="onPhotoDateChange"
          >
            <el-option
              v-for="opt in photoDateOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <div class="field-hint">仅可选今天及更早；白班、夜班照片分开上传，各最多 9 张。</div>
        </el-form-item>
        <div class="shift-group">
          <div class="shift-group-title">白班照片</div>
          <el-form-item label-width="0">
            <AttachmentUpload
              v-model="photoForm.dayPhotos"
              preset="image"
              :min="0"
              :max="9"
              name-prefix="白班值班照片"
            />
          </el-form-item>
        </div>
        <div class="shift-group" style="margin-top: 12px">
          <div class="shift-group-title">夜班照片</div>
          <el-form-item label-width="0">
            <AttachmentUpload
              v-model="photoForm.nightPhotos"
              preset="image"
              :min="0"
              :max="9"
              name-prefix="夜班值班照片"
            />
          </el-form-item>
        </div>
      </el-form>
      <div class="drawer-actions">
        <el-button @click="photoVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPhotos">保存补录</el-button>
      </div>
    </el-drawer>

    <!-- 详情：周矩阵 -->
    <el-drawer v-model="detailVisible" title="值班表详情" size="860px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="2" border class="detail-desc">
          <el-descriptions-item label="项目">{{ detail.projectName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="周次">{{ formatWeekRange(detail.weekStart) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detail.updatedAt || '--' }}</el-descriptions-item>
          <el-descriptions-item label="更新人">{{ detail.updatedBy || '--' }}</el-descriptions-item>
        </el-descriptions>

        <div class="matrix-wrap">
          <table class="duty-matrix">
            <thead>
              <tr>
                <th class="sticky-col sticky-shift">班次</th>
                <th class="sticky-col sticky-party">角色</th>
                <th v-for="day in detail.days" :key="day.date">
                  <div>{{ day.weekdayLabel }}</div>
                  <div class="sub">{{ day.date }}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in SHIFT_GROUPS" :key="group.shift">
                <tr
                  v-for="(def, slotIdx) in group.slots"
                  :key="def.key"
                >
                  <td
                    v-if="slotIdx === 0"
                    class="sticky-col sticky-shift shift-label"
                    :rowspan="group.slots.length + 1"
                  >
                    {{ group.label }}
                  </td>
                  <td class="sticky-col sticky-party">{{ def.partyLabel }}</td>
                  <td
                    v-for="day in detail.days"
                    :key="`${day.date}-${def.key}`"
                    class="person-cell"
                  >
                    <div v-if="personLabelsOf(day, def.key).length" class="person-lines">
                      <div
                        v-for="(label, pi) in personLabelsOf(day, def.key)"
                        :key="`${def.key}-${pi}`"
                        class="person-line"
                      >
                        {{ label }}
                      </div>
                    </div>
                    <template v-else>--</template>
                  </td>
                </tr>
                <tr>
                  <td class="sticky-col sticky-party">照片</td>
                  <td
                    v-for="day in detail.days"
                    :key="`${day.date}-${group.shift}-photo`"
                    class="photo-cell"
                  >
                    <template v-if="shiftPhotosOf(day, group.shift).length">
                      <div class="photo-group">
                        <AttachmentUpload
                          :model-value="shiftPhotosOf(day, group.shift)"
                          preset="image"
                          :min="0"
                          :max="9"
                          readonly
                          :name-prefix="`${group.label}值班照片`"
                        />
                        <span
                          v-if="extraPhotoCount(shiftPhotosOf(day, group.shift))"
                          class="photo-more"
                          :title="`另有 ${extraPhotoCount(shiftPhotosOf(day, group.shift))} 张，点击任意小图可翻页查看全部`"
                        >
                          +{{ extraPhotoCount(shiftPhotosOf(day, group.shift)) }}
                        </span>
                      </div>
                    </template>
                    <template v-else>{{ photoCountText(shiftPhotosOf(day, group.shift)) }}</template>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.duty-roster-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-tip {
  margin-bottom: 0;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ap-text-secondary, #909399);
  line-height: 1.4;
}

.field-hint.inline {
  margin-left: 8px;
}

.day-tabs {
  width: 100%;
}

.day-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.shift-group {
  padding: 12px 12px 4px;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  background: #fafafa;
}

.shift-group-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text-primary, #303133);
}

.detail-desc {
  margin-bottom: 16px;
}

.matrix-wrap {
  overflow: auto;
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
}

.duty-matrix {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
  font-size: 13px;
}

.duty-matrix th,
.duty-matrix td {
  border: 1px solid var(--ap-border, #ebeef5);
  padding: 8px 10px;
  vertical-align: top;
  text-align: left;
  background: #fff;
}

.duty-matrix th {
  background: #f5f7fa;
  font-weight: 600;
  text-align: center;
}

.duty-matrix .sub {
  font-weight: 400;
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.duty-matrix .sticky-col {
  position: sticky;
  z-index: 1;
  background: #fafafa;
  font-weight: 600;
}

.duty-matrix .sticky-shift {
  left: 0;
  min-width: 56px;
  text-align: center;
  vertical-align: middle;
}

.duty-matrix .sticky-party {
  left: 56px;
  min-width: 56px;
  text-align: center;
}

.duty-matrix .shift-label {
  background: #f0f2f5;
}

.duty-matrix td {
  min-width: 128px;
  max-width: 200px;
  word-break: break-all;
}

.duty-matrix .person-cell {
  line-height: 1.5;
}

.person-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.person-line {
  word-break: break-all;
  line-height: 1.45;
}

.duty-matrix .photo-cell {
  min-width: 140px;
}

.photo-group {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

/* 详情照片：56×56 小图，窄栏内 2 列排布（仅作用于值班表详情，不影响其它模块） */
.photo-cell :deep(.ap-attach-grid) {
  gap: 6px;
}

.photo-cell :deep(.ap-attach-item.is-thumb) {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border-radius: 6px;
}

/* 最多展示前 4 张（2×2），其余用 +N 覆盖提示 */
.photo-cell :deep(.ap-attach-item.is-thumb:nth-child(n + 5)) {
  display: none;
}

.photo-cell :deep(.ap-attach-mask) {
  min-height: 0;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.photo-cell :deep(.ap-attach-item:hover .ap-attach-mask) {
  opacity: 1;
}

.photo-cell :deep(.ap-attach-mask .ap-attach-filename) {
  font-size: 9px;
}

.photo-cell :deep(.ap-attach-placeholder) {
  gap: 2px;
  font-size: 9px;
}

.photo-cell :deep(.ap-attach-placeholder .el-icon) {
  font-size: 16px !important;
}

/* +N 覆盖在第 4 张小图上；不拦截点击（点击仍打开大图查看器并可翻页看全部） */
.photo-more {
  position: absolute;
  left: 62px;
  top: 62px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--ap-border, #ebeef5);
}
</style>
