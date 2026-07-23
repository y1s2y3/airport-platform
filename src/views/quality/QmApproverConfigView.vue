<script setup>
/**
 * 审批人配置（项目级）— 按参建单位/验收组岗位分类，均支持多人
 */
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  candidatesByRole,
  getApproverRoleMeta,
  listApproverConfigGroups,
  saveApproverConfig,
} from '../../mock/qm.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const editVisible = ref(false)
const editRole = ref('')
const editForm = reactive({ user_ids: [] })
const tick = ref(0)
const activeGroups = ref([])

const groups = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApproverConfigGroups(scopeProjectId.value)
})

const editMeta = computed(() => (editRole.value ? getApproverRoleMeta(editRole.value) : null))
const editCandidates = computed(() => (editRole.value ? candidatesByRole(editRole.value) : []))

watch(
  groups,
  (list) => {
    if (!list.length) {
      activeGroups.value = []
      return
    }
    // 首次或切换项目时展开全部分类
    if (!activeGroups.value.length || !activeGroups.value.every((k) => list.some((g) => g.key === k))) {
      activeGroups.value = list.map((g) => g.key)
    }
  },
  { immediate: true },
)

watch(scopeProjectId, () => {
  tick.value += 1
  activeGroups.value = []
})

function openEdit(row) {
  if (isHqSelected.value) return ElMessage.warning('请先切换到具体项目')
  editRole.value = row.role
  editForm.user_ids = [...(row.user_ids || [])]
  editVisible.value = true
}

function onSave() {
  const r = saveApproverConfig(scopeProjectId.value, editRole.value, editForm.user_ids)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  editVisible.value = false
  const label = editMeta.value?.label || editRole.value
  ElMessage.success(`已保存「${label}」审批人`)
}

function configuredCount(group) {
  return group.rows.filter((r) => r.user_names.length).length
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 审批人配置</div>
      <h1 class="page-title">审批人配置</h1>
      <p class="page-tip">
        项目级配置 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }}
        · 按参建单位与验收组岗位分类指定人员，各岗位均支持多人
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="审批人配置仅项目级可用，请先在顶部切换到具体项目"
      class="mb"
    />

    <el-collapse v-else v-model="activeGroups" class="role-collapse">
      <el-collapse-item v-for="g in groups" :key="g.key" :name="g.key">
        <template #title>
          <div class="group-title">
            <span>{{ g.label }}</span>
            <el-tag size="small" type="info" effect="plain">
              已配 {{ configuredCount(g) }}/{{ g.rows.length }} 岗
            </el-tag>
          </div>
        </template>

        <el-table :data="g.rows" stripe border size="small" empty-text="暂无岗位">
          <el-table-column label="审批岗位" min-width="200" fixed>
            <template #default="{ row }">
              <div class="role-cell">
                <span class="role-name">{{ row.roleLabel }}</span>
                <span v-if="row.hint" class="role-hint">{{ row.hint }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="已配人员" min-width="260">
            <template #default="{ row }">
              <template v-if="row.user_names.length">
                <el-tag
                  v-for="name in row.user_names"
                  :key="name"
                  size="small"
                  class="name-tag"
                  effect="plain"
                >
                  {{ name }}
                </el-tag>
              </template>
              <span v-else class="muted">未配置</span>
            </template>
          </el-table-column>
          <el-table-column prop="updated_at" label="更新时间" width="170">
            <template #default="{ row }">{{ row.updated_at || '—' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">配置</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>

    <el-dialog
      v-model="editVisible"
      :title="`配置审批人 · ${editMeta?.label || editRole}`"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="96px">
        <el-form-item label="所属分类">
          <el-input :model-value="editMeta?.groupLabel || '—'" disabled />
        </el-form-item>
        <el-form-item label="审批岗位">
          <el-input :model-value="editMeta?.label || editRole" disabled />
          <p v-if="editMeta?.hint" class="hint under">{{ editMeta.hint }}</p>
        </el-form-item>
        <el-form-item label="人员" required>
          <el-select
            v-model="editForm.user_ids"
            multiple
            filterable
            clearable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择（可多选）"
            style="width: 100%"
          >
            <el-option
              v-for="u in editCandidates"
              :key="u.id"
              :label="`${u.name}（${u.org}）`"
              :value="u.id"
            >
              <div class="opt">
                <span>{{ u.name }}</span>
                <span class="opt-sub">{{ u.org }} · {{ u.phone }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <p class="hint">支持选择多人；签章/签署时按本岗位已配置人员办理。</p>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 12px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.mb { margin-bottom: 4px; }
.role-collapse :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 48px;
  line-height: 1.4;
  padding: 8px 0;
  font-weight: 600;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.role-cell { display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.role-name { font-weight: 500; color: #303133; }
.role-hint { font-size: 12px; color: #909399; }
.name-tag { margin: 0 6px 4px 0; }
.muted { color: #c0c4cc; font-size: 13px; }
.hint { margin: 0; font-size: 12px; color: #909399; }
.hint.under { margin-top: 4px; }
.opt { display: flex; flex-direction: column; line-height: 1.35; }
.opt-sub { font-size: 12px; color: #909399; }
</style>
