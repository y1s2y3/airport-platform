<script setup>
/**
 * 项目用章人配置
 * 定位：维护本系统侧项目用章人，保存即下传档案系统，供档案侧签章调用；
 * 仅支持新增、删除（不支持编辑 / 停用启用）
 */
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  listSealUsers,
  removeSealUser,
  saveSealUser,
  SEAL_USER_STATUS,
} from '../../mock/qm.js'
import {
  findBrandProjectUser,
  formatBrandProjectUserLabel,
  listBrandProjectUsers,
} from '../../mock/brand.js'
import { maskPhone } from '../../utils/mask.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const keyword = ref('')
const tick = ref(0)

const projectUsers = computed(() => listBrandProjectUsers(scopeProjectId.value))

const list = computed(() => {
  void tick.value
  let rows = listSealUsers(isHqSelected.value ? '' : scopeProjectId.value)
  const kw = keyword.value.trim()
  if (kw) {
    rows = rows.filter((u) =>
      `${u.user_name}${u.post_label || ''}${u.phone || ''}${u.remark || ''}`.includes(kw),
    )
  }
  return rows
})

const dialogVisible = ref(false)
const form = reactive({
  user_id: '',
  user_name: '',
  post_label: '',
  phone: '',
  remark: '',
})

const displayPhoneMasked = computed(() => maskPhone(form.phone))

function openCreate() {
  if (isHqSelected.value) return ElMessage.warning('请先切换到具体项目')
  form.user_id = ''
  form.user_name = ''
  form.post_label = ''
  form.phone = ''
  form.remark = ''
  dialogVisible.value = true
}

function onUserChange(userId) {
  const u = findBrandProjectUser(userId) || projectUsers.value.find((x) => x.user_id === userId)
  if (!u) {
    form.user_name = ''
    form.post_label = ''
    form.phone = ''
    return
  }
  form.user_id = u.user_id
  form.user_name = u.name || ''
  form.post_label = u.post_label || ''
  form.phone = u.phone || ''
}

function onSave() {
  if (!form.user_id) return ElMessage.warning('请选择用户')
  const r = saveSealUser({
    project_id: scopeProjectId.value,
    user_id: form.user_id,
    user_name: form.user_name,
    post_label: form.post_label,
    phone: form.phone,
    remark: form.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  dialogVisible.value = false
  tick.value += 1
  ElMessage.success(`已保存并下传档案系统（${r.user.pushed_at}）`)
}

async function onRemove(row) {
  try {
    await ElMessageBox.confirm(`确认删除用章人「${row.user_name}」？删除后档案侧将不再接收其签章。`, '提示', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = removeSealUser(row.id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已删除')
}

function reset() {
  keyword.value = ''
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 项目用章人配置</div>
      <h1 class="page-title">项目用章人配置</h1>
      <p class="page-tip">
        当前：{{ isHqSelected ? '请切换到项目维护用章人' : scopeProjectLabel }} ·
        选择用户后自动带出岗位与手机号（界面脱敏，对接下传明文）；仅支持新增与删除
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="姓名/岗位/手机号/备注"
        style="width: 260px"
        :prefix-icon="Search"
        aria-label="姓名/岗位/手机号/备注"
      />
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增用章人</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="user_name" label="姓名" width="120" fixed />
      <el-table-column prop="post_label" label="岗位" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.post_label || '—' }}</template>
      </el-table-column>
      <el-table-column label="手机号" width="140">
        <template #default="{ row }">{{ maskPhone(row.phone) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
            {{ SEAL_USER_STATUS[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="pushed_at" label="最近下传时间" width="170" />
      <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="onRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增用章人" width="520px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="用户" required>
          <el-select
            v-model="form.user_id"
            filterable
            clearable
            placeholder="请选择用户"
            style="width: 100%"
            aria-label="请选择用户"
            @change="onUserChange"
          >
            <el-option
              v-for="u in projectUsers"
              :key="u.user_id"
              :label="formatBrandProjectUserLabel(u)"
              :value="u.user_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="form.post_label" readonly placeholder="选择用户后自动带出" aria-label="岗位" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input :model-value="displayPhoneMasked" readonly placeholder="选择用户后自动带出（脱敏）" aria-label="手机号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="选填，如：总监执业章"
            aria-label="备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存并下传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
