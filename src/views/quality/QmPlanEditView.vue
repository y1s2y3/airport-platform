<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  buildWbsTree,
  createPlan,
  findPlan,
  PLAN_TYPE,
  updatePlan,
  wbsNodeTypeTagType,
  wbsNodes,
} from '../../mock/qm.js'

const route = useRoute()
const router = useRouter()
const { scopeProjectId, isHqSelected } = useQmProjectScope()

const form = reactive({
  id: '',
  plan_name: '',
  plan_type: 1,
  wbs_node_id: '',
  content: '',
  plan_date: '',
  contractor_org_id: 'org-sg-01',
  supervisor_org_id: 'org-jl-01',
  remark: '',
})

const anchorTree = computed(() => {
  const pid = !isHqSelected.value && scopeProjectId.value ? scopeProjectId.value : undefined
  return buildWbsTree(pid)
})

const selectedAnchorLabel = computed(() => {
  const n = wbsNodes.find((x) => x.id === form.wbs_node_id)
  if (!n) return ''
  return n.node_name
})

watch(
  () => route.query.id,
  (id) => {
    if (!id) return
    const plan = findPlan(id)
    if (!plan) return
    Object.assign(form, {
      id: plan.id,
      plan_name: plan.plan_name,
      plan_type: plan.plan_type,
      wbs_node_id: plan.wbs_node_id,
      content: plan.content,
      plan_date: plan.plan_date,
      contractor_org_id: plan.contractor_org_id,
      supervisor_org_id: plan.supervisor_org_id,
      remark: plan.remark || '',
    })
  },
  { immediate: true },
)

function submit() {
  if (!form.wbs_node_id) return ElMessage.warning('请选择关联目录树节点')
  const anchor = wbsNodes.find((n) => n.id === form.wbs_node_id)
  if (form.id) {
    const plan = findPlan(form.id)
    const r = updatePlan(plan, {
      ...form,
      force_change: plan.status >= 1,
    })
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(plan.status >= 1 ? '已变更并留痕' : '已保存')
  } else {
    const r = createPlan({
      ...form,
      project_id: scopeProjectId.value || anchor?.project_id,
    })
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(`已创建 ${r.plan.plan_no}，待监理复核`)
  }
  router.push('/qm/inspect/plans')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 验收计划 / 编制</div>
      <h1 class="page-title">{{ form.id ? '编辑/变更计划' : '编制验收计划' }}</h1>
    </div>
    <el-form label-width="120px" style="max-width: 640px">
      <el-form-item label="计划名称" required>
        <el-input v-model="form.plan_name" />
      </el-form-item>
      <el-form-item label="计划类型" required>
        <el-select v-model="form.plan_type" style="width: 100%">
          <el-option v-for="(label, val) in PLAN_TYPE" :key="val" :label="label" :value="Number(val)" />
        </el-select>
      </el-form-item>
      <el-form-item label="关联目录树" required>
        <el-tree-select
          v-model="form.wbs_node_id"
          :data="anchorTree"
          node-key="id"
          :props="{ label: 'label', children: 'children', value: 'id' }"
          check-strictly
          filterable
          default-expand-all
          clearable
          placeholder="从验评目录树选择关联节点"
          style="width: 100%"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <el-tag size="small" :type="wbsNodeTypeTagType(data.node_type)" effect="plain" class="type-tag">
                {{ data.type_label }}
              </el-tag>
              <span>{{ data.label }}</span>
            </span>
          </template>
        </el-tree-select>
        <p v-if="selectedAnchorLabel" class="anchor-hint">已选：{{ selectedAnchorLabel }}</p>
      </el-form-item>
      <el-form-item label="验收内容" required>
        <el-input v-model="form.content" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="计划完成日期" required>
        <el-date-picker v-model="form.plan_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submit">提交</el-button>
        <el-button @click="router.push('/qm/inspect/plans')">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.type-tag { flex-shrink: 0; }
.anchor-hint { margin: 6px 0 0; font-size: 12px; color: #909399; }
</style>
