<script setup>
/**
 * 表单填报 · 二级页（菜单右侧主内容区打开，侧栏仍高亮「表单填报」）
 */
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formTemplates, resolveTemplateName, wbsNodes } from '../../mock/qm.js'

const route = useRoute()
const router = useRouter()

const FORM_CATALOG = {
  'f-soil': {
    id: 'f-soil',
    name: '素土、灰土地基检验批质量验收记录表',
    sgFilledNo: 'TSFTZ-QH-A-DM-4-2-001',
  },
  'f-compact': {
    id: 'f-compact',
    name: '强夯地基检验批质量验收记录表',
    sgFilledNo: '',
  },
  'f-rebar': {
    id: 'f-rebar',
    name: '钢筋工程检验批质量验收记录表',
    sgFilledNo: 'REBAR-2026-003',
  },
  'f-concrete': {
    id: 'f-concrete',
    name: '混凝土结构检验批质量验收记录表',
    sgFilledNo: '',
  },
}

const currentForm = computed(() => {
  const id = String(route.query.formId || 'f-soil')
  if (FORM_CATALOG[id]) return FORM_CATALOG[id]
  const tpl = formTemplates.find((t) => t.id === id)
  return {
    id,
    name: tpl?.template_name || resolveTemplateName(id) || String(route.query.formName || '验收记录表'),
    sgFilledNo: '',
  }
})

const selectedNode = computed(() => {
  const id = String(route.query.nodeId || '')
  return wbsNodes.find((n) => n.id === id) || null
})

const returnPath = computed(() => {
  const raw = String(route.query.returnTo || '').trim()
  return raw || '/qm/inspect/form-fill'
})

const inspectItems = reactive([
  { cat: '主控项目', name: '地基承载力', req: '符合设计要求', sampleMin: '3', sampleActual: '3', record: '检测合格', result: '合格' },
  { cat: '主控项目', name: '配合比', req: '符合设计要求', sampleMin: '2', sampleActual: '2', record: '按配合比施工', result: '合格' },
  { cat: '主控项目', name: '压实系数', req: '≥0.95', sampleMin: '6', sampleActual: '6', record: '0.96~0.98', result: '合格' },
  { cat: '一般项目', name: '石灰粒径', req: '≤5mm', sampleMin: '4', sampleActual: '4', record: '≤4mm', result: '合格' },
  { cat: '一般项目', name: '土料有机质含量', req: '≤5%', sampleMin: '3', sampleActual: '3', record: '3.2%', result: '合格' },
  { cat: '一般项目', name: '虚铺厚度', req: '≤250mm', sampleMin: '5', sampleActual: '5', record: '200~230mm', result: '合格' },
])

function todayLabel() {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week}`
}

function goBack() {
  router.push(returnPath.value)
}

function saveForm() {
  ElMessage.success('表格已保存')
  goBack()
}
</script>

<template>
  <div class="qm-page page-card fill-edit-page">
    <div class="page-header fill-header">
      <div class="header-left">
        <div class="page-breadcrumb">
          {{ route.query.returnTo ? '质量验评 / 表单填报(深度集成) / 填写' : '质量验评 / 表单填报 / 填写' }}
        </div>
        <div class="fill-meta">
          <span>{{ todayLabel() }}</span>
          <strong>表格填报</strong>
          <span class="form-title">{{ currentForm.name }}</span>
        </div>
      </div>
      <div class="header-actions">
        <el-button size="small">打印</el-button>
        <el-button size="small">预览</el-button>
        <el-button size="small">导出PDF</el-button>
        <el-button size="small">导出Excel</el-button>
        <el-button size="small">附件(0)</el-button>
        <el-button size="small">从...复制</el-button>
        <el-button size="small">统计</el-button>
        <el-button size="small">填表说明</el-button>
        <el-button size="small">我的范例</el-button>
        <el-button type="primary" size="small" @click="saveForm">保存</el-button>
        <el-button size="small" @click="goBack">关闭</el-button>
      </div>
    </div>

    <div class="form-dlg-body">
      <aside class="form-side">
        <div class="side-block">
          <div class="side-title">检测对象</div>
          <el-form label-position="top" size="small">
            <el-form-item label="检验批部位">
              <el-input
                type="textarea"
                :rows="2"
                :model-value="selectedNode?.location_code || selectedNode?.node_name || ''"
              />
            </el-form-item>
            <el-form-item label="检验日期">
              <el-date-picker
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                :model-value="new Date().toISOString().slice(0, 10)"
              />
            </el-form-item>
            <el-form-item label="表格编号">
              <el-input :model-value="currentForm.sgFilledNo || '（保存后生成）'" disabled />
            </el-form-item>
            <el-form-item label="资料号">
              <div class="doc-nos">
                <el-input /><el-input /><el-input /><el-input />
              </div>
            </el-form-item>
          </el-form>
        </div>
        <div class="side-block">
          <div class="side-title">审核流程</div>
          <el-form label-position="top" size="small">
            <el-form-item label="专业工长">
              <el-select placeholder="请选择" style="width: 100%">
                <el-option label="张工" value="zhang" />
                <el-option label="李工" value="li" />
              </el-select>
            </el-form-item>
            <div class="side-btns">
              <el-button size="small">审核人员</el-button>
              <el-button size="small" type="primary">提交审核</el-button>
            </div>
          </el-form>
        </div>
      </aside>

      <main class="form-main">
        <el-form inline size="small" class="form-meta-row">
          <el-form-item label="项目负责人">
            <el-select placeholder="请选择" style="width: 140px"><el-option label="尹永强" value="1" /></el-select>
          </el-form-item>
          <el-form-item label="分包单位项目负责人">
            <el-select placeholder="请选择" style="width: 140px"><el-option label="阮政鹏" value="1" /></el-select>
          </el-form-item>
          <el-form-item label="分包单位">
            <el-input style="width: 200px" model-value="中国电建集团航空港建设有限公司" />
          </el-form-item>
        </el-form>
        <el-form label-width="90px" size="small">
          <el-form-item label="施工依据">
            <el-input model-value="GB 50202-2018 建筑地基基础工程施工质量验收标准" />
          </el-form-item>
          <el-form-item label="验收依据">
            <el-input model-value="GB 50202-2018 / 设计文件" />
          </el-form-item>
          <el-form-item label="检验批容量">
            <div class="capacity-row">
              <el-input type="textarea" :rows="2" model-value="本检验批对应工程部位容量按现场划分填写" />
              <el-button size="small">选择</el-button>
            </div>
            <el-checkbox>填充检验批容量至原有表格</el-checkbox>
          </el-form-item>
        </el-form>

        <el-table :data="inspectItems" border size="small" class="inspect-table">
          <el-table-column prop="cat" label="类别" width="100" />
          <el-table-column prop="name" label="验收项目" min-width="140" />
          <el-table-column prop="req" label="设计要求及规范规定" min-width="160" />
          <el-table-column label="最小/实际抽样数量" width="168" align="center">
            <template #default="{ row }">
              <div class="sample-edit">
                <el-input
                  v-model="row.sampleMin"
                  size="small"
                  placeholder="最小"
                  class="sample-input"
                />
                <span class="sample-sep">/</span>
                <el-input
                  v-model="row.sampleActual"
                  size="small"
                  placeholder="实际"
                  class="sample-input"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="record" label="检查记录" min-width="140" />
          <el-table-column prop="result" label="检查结果" width="90" />
        </el-table>

        <div class="conclusion-grid">
          <div class="conclusion-card">
            <div class="c-title">施工单位检查结果</div>
            <el-input
              type="textarea"
              :rows="3"
              model-value="主控项目全部符合设计要求，一般项目符合规范规定，本检验批质量验收合格。"
            />
            <div class="c-signs">
              <span>专业工长：________</span>
              <span>施工员/质检员：________</span>
              <span>日期：________</span>
            </div>
          </div>
          <div class="conclusion-card">
            <div class="c-title">监理单位验收结论</div>
            <el-input type="textarea" :rows="3" model-value="验收合格，同意验收。" />
            <div class="c-signs">
              <span>专业监理工程师：________</span>
              <span>日期：________</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.fill-edit-page { display: flex; flex-direction: column; gap: 12px; min-height: 100%; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.fill-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.fill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
  font-size: 13px;
}
.form-title { color: #409eff; font-weight: 600; }
.header-actions { display: flex; flex-wrap: wrap; gap: 6px; }

.form-dlg-body {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 12px;
  min-height: 560px;
}
.form-side {
  border-right: 1px solid #ebeef5;
  padding-right: 12px;
}
.side-block {
  margin-bottom: 16px;
  padding: 10px;
  background: #fafbfd;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}
.side-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.doc-nos { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.side-btns { display: flex; gap: 8px; }
.form-main { min-width: 0; }
.form-meta-row { margin-bottom: 4px; }
.capacity-row { display: flex; gap: 8px; width: 100%; align-items: flex-start; }
.capacity-row .el-textarea { flex: 1; }
.inspect-table { margin: 12px 0; }
.sample-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  justify-content: center;
}
.sample-input {
  width: 58px;
}
.sample-input :deep(.el-input__wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}
.sample-input :deep(.el-input__inner) {
  text-align: center;
}
.sample-sep {
  color: #909399;
  font-size: 13px;
  flex-shrink: 0;
}
.conclusion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.conclusion-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 10px;
  background: #fafbfd;
}
.c-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.c-signs {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

@media (max-width: 1100px) {
  .form-dlg-body { grid-template-columns: 1fr; }
  .form-side { border-right: 0; padding-right: 0; }
  .conclusion-grid { grid-template-columns: 1fr; }
}
</style>
