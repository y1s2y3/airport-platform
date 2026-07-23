/**
 * 质量验评 · 表单库 / 类型绑表 — 字段对齐 data-model-for-验评.md V1.16
 */
import { reactive } from 'vue'

/** FORM_TEMPLATE */
export const formTemplates = reactive([
  {
    id: 'ft-batch-rebar',
    template_code: 'C01-REBAR-01',
    template_name: '钢筋工程检验批质量验收记录',
    apply_level: 1,
    source_kind: 1,
    specialty: '主体结构',
    standard_ref: '省统表·钢筋检验批',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['工程名称', '验收部位', '施工依据'] },
  },
  {
    id: 'ft-batch-concrete',
    template_code: 'C01-CONC-01',
    template_name: '混凝土工程检验批质量验收记录',
    apply_level: 1,
    source_kind: 1,
    specialty: '主体结构',
    standard_ref: '省统表·混凝土检验批',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['工程名称', '浇筑部位', '强度等级'] },
  },
  {
    id: 'ft-batch-rebar-connect',
    template_code: 'C01-REBAR-02',
    template_name: '钢筋连接检验批质量验收记录',
    apply_level: 1,
    source_kind: 1,
    specialty: '主体结构',
    standard_ref: '省统表·钢筋连接',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['连接方式', '抽检数量'] },
  },
  {
    id: 'ft-item-record',
    template_code: 'C01-ITEM-01',
    template_name: '分项工程质量验收记录',
    apply_level: 2,
    source_kind: 1,
    specialty: '主体结构',
    standard_ref: '省统表·分项验收',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['分项工程名称', '检验批数量'] },
  },
  {
    id: 'ft-subdiv-custom',
    template_code: 'PRJ-SUBDIV-01',
    template_name: '子分部工程质量验收记录（自建）',
    apply_level: 3,
    source_kind: 2,
    specialty: '主体结构',
    standard_ref: '',
    version_no: 'V1',
    status: 1,
    form_schema: { fields: ['子分部名称', '验收结论'] },
  },
  {
    id: 'ft-div-record',
    template_code: 'C01-DIV-01',
    template_name: '分部工程质量验收记录',
    apply_level: 4,
    source_kind: 1,
    specialty: '主体结构',
    standard_ref: '省统表·分部验收',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['分部工程名称', '观感质量'] },
  },
  {
    id: 'ft-unit-record',
    template_code: 'C00-UNIT-01',
    template_name: '单位工程质量竣工验收记录',
    apply_level: 5,
    source_kind: 1,
    specialty: '通用',
    standard_ref: '省统表·单位验收',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['单位工程名称', '综合验收结论'] },
  },
  {
    id: 'ft-special-fire',
    template_code: 'SP-FIRE-01',
    template_name: '消防专项验收记录',
    apply_level: 6,
    source_kind: 2,
    specialty: '智能消防',
    standard_ref: '',
    version_no: 'V1',
    status: 1,
    form_schema: { fields: ['专项名称', '法定文件清单'] },
  },
  {
    id: 'ft-complete',
    template_code: 'C00-COMP-01',
    template_name: '竣工验收记录',
    apply_level: 7,
    source_kind: 1,
    specialty: '通用',
    standard_ref: '省统表·竣工',
    version_no: '2024',
    status: 1,
    form_schema: { fields: ['工程名称', '竣工验收结论'] },
  },
])

/** FORM_ITEM_DEF */
export const formItemDefs = reactive([
  {
    id: 'def-1',
    template_id: 'ft-batch-rebar',
    seq_no: 1,
    item_category: 1,
    item_name: '钢筋品种、级别、规格和数量',
    standard_desc: '符合设计要求',
    check_method: '对照设计图纸检查',
    check_freq: '全数检查',
    need_photo: 1,
    enable_auto_judge: 0,
  },
  {
    id: 'def-2',
    template_id: 'ft-batch-rebar',
    seq_no: 2,
    item_category: 2,
    item_name: '钢筋接头位置',
    standard_desc: '宜设置在受力较小处',
    check_method: '观察、尺量',
    check_freq: '抽查',
    need_photo: 0,
    enable_auto_judge: 0,
  },
  {
    id: 'def-3',
    template_id: 'ft-batch-rebar',
    seq_no: 3,
    item_category: 3,
    item_name: '钢筋绑扎外观观感',
    standard_desc: '横平竖直、绑扎牢固',
    check_method: '观察',
    check_freq: '全数',
    need_photo: 1,
    enable_auto_judge: 0,
  },
  {
    id: 'def-r2-1',
    template_id: 'ft-batch-rebar-connect',
    seq_no: 1,
    item_category: 1,
    item_name: '钢筋连接方式',
    standard_desc: '符合设计要求',
    check_method: '核查',
    check_freq: '全数',
    need_photo: 1,
    enable_auto_judge: 0,
  },
  {
    id: 'def-r2-2',
    template_id: 'ft-batch-rebar-connect',
    seq_no: 2,
    item_category: 2,
    item_name: '接头位置',
    standard_desc: '宜设在受力较小处',
    check_method: '观察、尺量',
    check_freq: '抽查',
    need_photo: 0,
    enable_auto_judge: 0,
  },
  {
    id: 'def-c1',
    template_id: 'ft-batch-concrete',
    seq_no: 1,
    item_category: 1,
    item_name: '混凝土强度等级及配合比',
    standard_desc: '符合设计要求',
    check_method: '核查配合比通知单',
    check_freq: '每检验批',
    need_photo: 1,
    enable_auto_judge: 0,
  },
  {
    id: 'def-c2',
    template_id: 'ft-batch-concrete',
    seq_no: 2,
    item_category: 2,
    item_name: '混凝土浇筑连续性',
    standard_desc: '无冷缝',
    check_method: '观察',
    check_freq: '全过程',
    need_photo: 0,
    enable_auto_judge: 0,
  },
  {
    id: 'def-i1',
    template_id: 'ft-item-record',
    seq_no: 1,
    item_category: 1,
    item_name: '检验批质量验收资料完整性',
    standard_desc: '资料齐全有效',
    check_method: '核查',
    check_freq: '全数',
    need_photo: 0,
    enable_auto_judge: 0,
  },
  {
    id: 'def-d1',
    template_id: 'ft-div-record',
    seq_no: 1,
    item_category: 1,
    item_name: '分部质量控制资料',
    standard_desc: '完整',
    check_method: '核查',
    check_freq: '全数',
    need_photo: 0,
    enable_auto_judge: 0,
  },
])

/**
 * 默认资料配置：结构节点类型 → 验收单模板（指挥部预置，项目建树时可引用）
 * node_type: 1单位工程 2子单位 3分部 4子分部 5分项 6检验批
 */
export const defaultMaterialBinds = reactive([
  {
    id: 'dmb-1',
    node_type: 1,
    form_template_id: 'ft-unit-record',
    sort_no: 1,
  },
  {
    id: 'dmb-2',
    node_type: 3,
    form_template_id: 'ft-div-record',
    sort_no: 1,
  },
  {
    id: 'dmb-3',
    node_type: 4,
    form_template_id: 'ft-subdiv-custom',
    sort_no: 1,
  },
  {
    id: 'dmb-4',
    node_type: 5,
    form_template_id: 'ft-item-record',
    sort_no: 1,
  },
  {
    id: 'dmb-5',
    node_type: 6,
    form_template_id: 'ft-batch-rebar',
    sort_no: 1,
  },
  {
    id: 'dmb-6',
    node_type: 6,
    form_template_id: 'ft-batch-concrete',
    sort_no: 2,
  },
])

/** 节点类型 → 模板 apply_level 推荐映射（导入时优先筛选） */
export const NODE_TYPE_APPLY_LEVEL = {
  1: 5,
  2: 8,
  3: 4,
  4: 3,
  5: 2,
  6: 1,
}

/** BATCH_TYPE_FORM — 类型 1:N 表单 */
export const batchTypeForms = reactive([
  {
    id: 'btf-1',
    batch_type_id: 'bt-rebar',
    form_template_id: 'ft-batch-rebar',
    sort_no: 1,
    is_primary: 1,
  },
  {
    id: 'btf-1b',
    batch_type_id: 'bt-rebar',
    form_template_id: 'ft-batch-rebar-connect',
    sort_no: 2,
    is_primary: 0,
  },
  {
    id: 'btf-2',
    batch_type_id: 'bt-concrete',
    form_template_id: 'ft-batch-concrete',
    sort_no: 1,
    is_primary: 1,
  },
])

export const TEMPLATE_STATUS = { 0: '草稿', 1: '启用', 2: '停用' }
export const SOURCE_KIND = { 1: '省统表预置', 2: '项目自建' }
export const APPLY_LEVEL = {
  1: '检验批',
  2: '分项',
  3: '子分部',
  4: '分部',
  5: '单位',
  6: '专项',
  7: '竣工',
  8: '子单位',
  9: '通用',
}

export function resolveTemplateName(id) {
  if (!id) return '—'
  return formTemplates.find((t) => t.id === id)?.template_name || id
}

export function getEnabledFormsByBatchType(batch_type_id) {
  const links = batchTypeForms
    .filter((l) => l.batch_type_id === batch_type_id)
    .sort((a, b) => a.sort_no - b.sort_no)
  return links
    .map((l) => formTemplates.find((t) => t.id === l.form_template_id && t.status === 1))
    .filter(Boolean)
}

export function getItemDefsByTemplate(template_id) {
  return formItemDefs
    .filter((d) => d.template_id === template_id)
    .sort((a, b) => a.seq_no - b.seq_no)
}
