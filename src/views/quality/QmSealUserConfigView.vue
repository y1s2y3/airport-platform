<script setup>
/**
 * 项目用章人配置（V2.3.1 §8.2 菜单）
 * 定位：维护本系统侧项目用章人，保存即下传档案系统（Q17），供档案侧签章调用；
 * 边界：真实 CA 证书由档案系统/CA 机构管理，本页仅登记证书编号与人员对应关系
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
  toggleSealUserStatus,
} from '../../mock/qm.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const keyword = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  let rows = listSealUsers(isHqSelected.value ? '' : scopeProjectId.value)
  const kw = keyword.value.trim()
  if (kw) {
    rows = rows.filter((u) => `${u.user_name}${u.org_name}${u.cert_no}${u.phone}`.includes(kw))
  }
  return rows
})

const dialogVisible = ref(false)
const editingId = ref('')
const form = reactive({
  user_name: '',
  org_name: '',
  cert_no: '',
  phone: '',
  remark: '',
})

function openCreate() {
  if (isHqSelected.value) return ElMessage.warning('请先切换到具体项目')
  editingId.value = ''
  form.user_name = ''
  form.org_name = ''
  form.cert_no = ''
  form.phone = ''
  form.remark = ''
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.user_name = row.user_name
  form.org_name = row.org_name
  form.cert_no = row.cert_no
  form.phone = row.phone
  form.remark = row.remark
  dialogVisible.value = true
}

function onSave() {
  const r = saveSealUser(
    {
      project_id: scopeProjectId.value,
      user_name: form.user_name,
      org_name: form.org_name,
      cert_no: form.cert_no,
      phone: form.phone,
      remark: form.remark,
    },
    editingId.value,
  )
  if (!r.ok) return ElMessage.error(r.msg)
  dialogVisible.value = false
  tick.value += 1
  ElMessage.success(`已保存并下传档案系统（${r.user.pushed_at}）`)
}

async function onToggle(row) {
  const action = row.status === 1 ? '停用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确认${action}用章人「${row.user_name}」？${action}结果将同步下传档案系统。`,
      '提示',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const r = toggleSealUserStatus(row)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success(`已${action}并同步档案系统`)
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
        保存即下传档案系统（档案侧签章时按证书编号调用）；真实 CA 证书由档案系统/CA 机构管理
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="姓名/单位/证书编号/手机号"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增用章人</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="user_name" label="姓名" width="120" fixed />
      <el-table-column prop="org_name" label="所属单位" min-width="200" show-overflow-tooltip />
      <el-table-column prop="cert_no" label="CA证书编号" min-width="170" show-overflow-tooltip />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
            {{ SEAL_USER_STATUS[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="pushed_at" label="最近下传时间" width="170" />
      <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="onToggle(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" @click="onRemove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑用章人' : '新增用章人'"
      width="520px"
      destroy-on-close
    >
      <el-form label-width="110px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.user_name" placeholder="用章人姓名" />
        </el-form-item>
        <el-form-item label="所属单位">
          <el-input v-model="form.org_name" placeholder="如：中建某局深圳机场项目部" />
        </el-form-item>
        <el-form-item label="CA证书编号" required>
          <el-input v-model="form.cert_no" placeholder="档案系统/CA 机构颁发的证书编号" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="选填" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="如：总监执业章" />
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
