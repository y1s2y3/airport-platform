<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  APPLY_LEVEL,
  formTemplates,
  getDefaultMaterialsByNodeType,
  importDefaultMaterial,
  NODE_TYPE_APPLY_LEVEL,
  removeDefaultMaterial,
  SOURCE_KIND,
  TEMPLATE_STATUS,
  WBS_TREE_NODE_TYPE_LABEL,
} from '../../mock/qm.js'

/** 左侧结构树类型：单位工程 → … → 检验批 */
const structureTree = [
  {
    id: 1,
    label: '单位工程',
    children: [
      {
        id: 2,
        label: '子单位工程',
        children: [
          {
            id: 3,
            label: '分部',
            children: [
              {
                id: 4,
                label: '子分部',
                children: [
                  {
                    id: 5,
                    label: '分项',
                    children: [{ id: 6, label: '检验批' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

const currentNodeType = ref(1)
const importVisible = ref(false)
const selectedTplIds = ref([])

const currentLabel = computed(
  () => WBS_TREE_NODE_TYPE_LABEL[currentNodeType.value] || '—',
)

const binds = computed(() => getDefaultMaterialsByNodeType(currentNodeType.value))

const bindRows = computed(() =>
  binds.value.map((b) => {
    const tpl = formTemplates.find((t) => t.id === b.form_template_id)
    return {
      ...b,
      template_code: tpl?.template_code || '—',
      template_name: tpl?.template_name || b.form_template_id,
      apply_level: tpl?.apply_level,
      source_kind: tpl?.source_kind,
      status: tpl?.status,
      version_no: tpl?.version_no || '—',
    }
  }),
)

/** 可导入：启用中且尚未绑定到当前节点类型 */
const importCandidates = computed(() => {
  const bound = new Set(binds.value.map((b) => b.form_template_id))
  const prefer = NODE_TYPE_APPLY_LEVEL[currentNodeType.value]
  return formTemplates
    .filter((t) => t.status === 1 && !bound.has(t.id))
    .slice()
    .sort((a, b) => {
      const ap = a.apply_level === prefer ? 0 : 1
      const bp = b.apply_level === prefer ? 0 : 1
      if (ap !== bp) return ap - bp
      return String(a.template_code).localeCompare(String(b.template_code))
    })
})

function onTreeClick(data) {
  if (data?.id) currentNodeType.value = data.id
}

function openImport() {
  selectedTplIds.value = []
  importVisible.value = true
}

function confirmImport() {
  if (!selectedTplIds.value.length) return ElMessage.warning('请选择要导入的模板')
  let ok = 0
  let lastErr = ''
  selectedTplIds.value.forEach((id) => {
    const r = importDefaultMaterial(currentNodeType.value, id)
    if (r.ok) ok += 1
    else lastErr = r.msg
  })
  if (!ok) return ElMessage.error(lastErr || '导入失败')
  ElMessage.success(`已从模板库导入 ${ok} 个`)
  importVisible.value = false
}

function onRemove(id) {
  const r = removeDefaultMaterial(id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已移除')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 默认资料配置</div>
      <h1 class="page-title">默认资料配置</h1>
      <p class="page-tip">
        按结构树类型配置默认验收资料；右侧为已关联模板，可从验收单模板库导入。
      </p>
    </div>

    <div class="layout">
      <aside class="tree-panel">
        <div class="panel-title">结构树类型</div>
        <el-tree
          :data="structureTree"
          node-key="id"
          default-expand-all
          highlight-current
          :current-node-key="currentNodeType"
          :expand-on-click-node="false"
          @node-click="onTreeClick"
        />
      </aside>

      <section class="list-panel">
        <div class="panel-head">
          <h3>{{ currentLabel }} · 默认模板（{{ bindRows.length }}）</h3>
          <el-button type="primary" :icon="Plus" @click="openImport">从模板库导入</el-button>
        </div>
        <el-table :data="bindRows" border stripe empty-text="暂无模板，请从模板库导入">
          <el-table-column prop="sort_no" label="序号" width="70" />
          <el-table-column prop="template_code" label="模板编码" width="140" />
          <el-table-column prop="template_name" label="模板名称" min-width="200" />
          <el-table-column label="适用层级" width="100">
            <template #default="{ row }">{{ APPLY_LEVEL[row.apply_level] || '—' }}</template>
          </el-table-column>
          <el-table-column label="来源" width="110">
            <template #default="{ row }">{{ SOURCE_KIND[row.source_kind] || '—' }}</template>
          </el-table-column>
          <el-table-column prop="version_no" label="版本" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
                {{ TEMPLATE_STATUS[row.status] || '—' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="onRemove(row.id)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog v-model="importVisible" title="从验收单模板库导入" width="720px" destroy-on-close>
      <p class="dialog-tip">
        当前节点类型：{{ currentLabel }} · 优先展示匹配层级模板，可多选导入
      </p>
      <el-table
        :data="importCandidates"
        border
        max-height="420"
        empty-text="无更多可导入模板"
        @selection-change="(rows) => (selectedTplIds = rows.map((r) => r.id))"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="template_code" label="模板编码" width="130" />
        <el-table-column prop="template_name" label="模板名称" min-width="180" />
        <el-table-column label="适用层级" width="100">
          <template #default="{ row }">{{ APPLY_LEVEL[row.apply_level] }}</template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">{{ SOURCE_KIND[row.source_kind] }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">导入选中</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.layout { display: grid; grid-template-columns: 260px 1fr; gap: 16px; min-height: 480px; }
.tree-panel, .list-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
}
.panel-title { font-weight: 600; margin-bottom: 12px; }
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-head h3 { margin: 0; font-size: 15px; }
.dialog-tip { margin: 0 0 12px; font-size: 13px; color: #606266; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
</style>
