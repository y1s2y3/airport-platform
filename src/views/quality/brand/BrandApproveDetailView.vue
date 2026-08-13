<script setup>
import './brand-page.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getApplicationDetail,
  getInactiveSelectedHint,
  MATERIAL_TYPE,
  NODE_LABEL,
  pmApprove,
  STATUS_LABEL,
  statusTagType,
  supervisorApprove,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'

const route = useRoute()
const router = useRouter()
const tick = ref(0)
const opinion = ref('')
const selectedId = ref('')
const materialPick = ref('')

const detail = computed(() => {
  void tick.value
  return getApplicationDetail(String(route.query.id || ''))
})

const inactiveHints = computed(() => {
  if (!detail.value) return []
  return getInactiveSelectedHint(detail.value.app.application_id)
})

const isSupervisor = computed(
  () => detail.value?.app.status === 'in_approval' && detail.value?.app.current_node === 'supervisor',
)
const isPm = computed(
  () => detail.value?.app.status === 'in_approval' && detail.value?.app.current_node === 'pm',
)

async function doSupervisor(action) {
  const r = supervisorApprove(detail.value.app.application_id, { action, opinion: opinion.value })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(action === 'agree' ? '已同意，流转至项目经理' : '已退回施工')
  tick.value += 1
  if (action === 'reject') router.push('/qm/brand/approve')
}

async function doPm(action) {
  if (action === 'agree') {
    if (!selectedId.value) return ElMessage.warning('请选定恰好 1 个入选品牌')
    const hit = detail.value.candidates.find((c) => c.candidate_id === selectedId.value)
    if (hit?.brand_lib_id && inactiveHints.value.some((c) => c.candidate_id === hit.candidate_id)) {
      try {
        await ElMessageBox.confirm(
          '该备选关联的品牌库品牌已停用。若仍入选，将新建一条启用品牌（允许与停用记录同名+同厂家并存）。是否继续？',
          '品牌已停用提示',
          { type: 'warning' },
        )
      } catch {
        return
      }
    }
  }
  const r = pmApprove(detail.value.app.application_id, {
    action,
    opinion: opinion.value,
    selectedCandidateId: selectedId.value,
    resolveMaterialId: materialPick.value || undefined,
  })
  if (!r.ok) {
    if (r.needChooseMaterial) {
      materialPick.value = r.materials[0]?.material_id || ''
      return ElMessage.warning(r.msg)
    }
    return ElMessage.error(r.msg)
  }
  ElMessage.success(action === 'agree' ? '终审通过，已入库' : '已退回施工')
  router.push('/qm/brand/approve')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审审批</div>
      <h1 class="page-title">报审审批</h1>
    </div>

    <el-empty v-if="!detail" description="未找到报审单" />
    <template v-else>
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="报审编号">{{ detail.app.application_id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.app.status)">
            {{ STATUS_LABEL[detail.app.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="材料/设备">{{ detail.app.material_name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ MATERIAL_TYPE[detail.app.material_type] }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ NODE_LABEL[detail.app.current_node] }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.app.submit_time }}</el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="inactiveHints.length"
        type="warning"
        :closable="false"
        show-icon
        class="mb"
        :title="`以下库选备选对应品牌已停用：${inactiveHints.map((c) => c.brand_name).join('、')}。终审若仍入选将新建启用品牌。`"
      />

      <h3 class="sec">本单规格</h3>
      <el-table :data="detail.specs" border size="small" class="mb">
        <el-table-column prop="spec_model" label="规格型号" />
        <el-table-column prop="material_spec_id" label="企业规格ID" />
      </el-table>

      <h3 class="sec">备选品牌{{ isPm ? '（请选定入选）' : '' }}</h3>
      <div
        v-for="(row, idx) in detail.candidates"
        :key="row.candidate_id"
        class="cand-card"
      >
        <div class="cand-card-head">
          <el-radio v-if="isPm" v-model="selectedId" :value="row.candidate_id">
            备选 {{ idx + 1 }} · 入选
          </el-radio>
          <span v-else class="cand-idx">备选 {{ idx + 1 }}</span>
          <el-tag v-if="row.brand_lib_id" size="small" type="success">库选入</el-tag>
          <el-tag v-else size="small" type="info">手填</el-tag>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="品牌名称">{{ row.brand_name }}</el-descriptions-item>
          <el-descriptions-item label="生产厂家">{{ row.manufacturer }}</el-descriptions-item>
        </el-descriptions>
        <BrandCandidateAttachBlock :candidate="row" :editable="false" />
      </div>

      <el-form v-if="isSupervisor || isPm" label-width="100px">
        <el-form-item label="审批意见">
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            placeholder="退回时必填；同意可选"
            style="max-width: 520px"
          />
        </el-form-item>
        <el-form-item v-if="isSupervisor">
          <el-button type="primary" @click="doSupervisor('agree')">同意</el-button>
          <el-button type="danger" @click="doSupervisor('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
        <el-form-item v-else-if="isPm">
          <el-button type="primary" @click="doPm('agree')">同意并入库</el-button>
          <el-button type="danger" @click="doPm('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
      </el-form>
      <el-button v-else @click="router.back()">返回</el-button>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.sec {
  margin: 12px 0 8px;
  font-size: 15px;
}
.cand-card {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}
.cand-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.cand-idx {
  font-size: 13px;
  font-weight: 600;
}
</style>
