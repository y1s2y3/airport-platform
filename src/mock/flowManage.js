/**
 * 流程管理（指挥部 · 流程管理）
 *
 * 业务口径（用户 2026-10-14 确认的字段提案）：
 * - 本模块是平台基础配置能力，指挥部层级维护，共 4 张表：流程组件 / 流程表单 / 消息分类 / 消息模板
 * - 流程组件：流程设计器可拖拽使用的控件库，供流程表单与流程配置引用
 * - 流程表单：流程绑定的业务表单模板（草稿 → 已发布 → 已停用）
 * - 消息分类：通知消息的分类字典；被消息模板引用时不允许删除
 * - 消息模板：各分类下的通知模板正文，标题/正文支持 ${变量} 占位；所属分类只能选启用中的分类
 * - 「所属流程分类」候选值为演示候选值（质量管理 / 安全管理 / 进度管理 / 材料设备 / 行政办公），
 *   待正式工程给出正式流程分类口径后替换
 * - 全部数据仅存内存，不做真实后端请求
 */
import { ref } from 'vue'
import { nowStr } from '../utils/datetime.js'

/* ============================================================================
 * 公共：启用 / 停用
 * ==========================================================================*/

export function enabledLabel(value) {
  return value ? '启用' : '停用'
}

export function enabledTagType(value) {
  return value ? 'success' : 'info'
}

/** 数组型字段（适用端 / 消息渠道）在列表中的展示口径：空值统一 -- */
export function joinOptions(list) {
  const arr = Array.isArray(list) ? list.filter(Boolean) : []
  return arr.length ? arr.join('、') : '--'
}

/** 编码唯一性校验（同表内不可重复，编辑时排除自身） */
function codeExists(records, field, code, excludeId) {
  const target = String(code || '').trim().toLowerCase()
  return records.some((item) => item.id !== excludeId && String(item[field] || '').trim().toLowerCase() === target)
}

/* ============================================================================
 * 1. 流程组件
 * ==========================================================================*/

/** 组件分类候选值 */
export const FLOW_COMPONENT_CATEGORY_OPTIONS = ['基础控件', '业务控件', '附件控件', '布局控件']

/** 适用端候选值 */
export const FLOW_CLIENT_OPTIONS = ['Web', 'App']

const initialFlowComponents = [
  {
    id: 'fc-001',
    component_name: '单行文本',
    component_code: 'input_text',
    category: '基础控件',
    clients: ['Web', 'App'],
    config_desc: '可配置最大长度、是否必填、占位提示与正则校验',
    enabled: true,
    sort_no: 10,
    remark: '最常用的基础录入控件',
    updated_at: '2026-10-13 09:20:00',
  },
  {
    id: 'fc-002',
    component_name: '多行文本',
    component_code: 'textarea_text',
    category: '基础控件',
    clients: ['Web', 'App'],
    config_desc: '可配置显示行数、最大长度与是否允许换行',
    enabled: true,
    sort_no: 20,
    remark: '',
    updated_at: '2026-10-13 09:20:00',
  },
  {
    id: 'fc-003',
    component_name: '日期选择',
    component_code: 'date_picker',
    category: '基础控件',
    clients: ['Web', 'App'],
    config_desc: '可配置日期格式、可选范围与是否精确到时分',
    enabled: true,
    sort_no: 30,
    remark: '',
    updated_at: '2026-10-13 09:21:00',
  },
  {
    id: 'fc-004',
    component_name: '项目人员选择',
    component_code: 'project_member_select',
    category: '业务控件',
    clients: ['Web', 'App'],
    config_desc: '按当前项目人员名册选择，展示「姓名（组织-岗位）」',
    enabled: true,
    sort_no: 40,
    remark: '与实名制名册联动（演示为静态候选）',
    updated_at: '2026-10-13 10:05:00',
  },
  {
    id: 'fc-005',
    component_name: '分包单位选择',
    component_code: 'subcontractor_select',
    category: '业务控件',
    clients: ['Web'],
    config_desc: '按基础数据管理-分包单位名册选择',
    enabled: true,
    sort_no: 50,
    remark: '',
    updated_at: '2026-10-13 10:06:00',
  },
  {
    id: 'fc-006',
    component_name: '附件上传',
    component_code: 'attachment_upload',
    category: '附件控件',
    clients: ['Web', 'App'],
    config_desc: '可配置附件格式、单个大小上限与个数（按系统附件上传清单档位）',
    enabled: true,
    sort_no: 60,
    remark: '',
    updated_at: '2026-10-13 10:12:00',
  },
  {
    id: 'fc-007',
    component_name: '分区块',
    component_code: 'section_block',
    category: '布局控件',
    clients: ['Web'],
    config_desc: '承载分区块标题与说明，用于长表单分区',
    enabled: false,
    sort_no: 70,
    remark: '暂未在流程设计器中开放',
    updated_at: '2026-10-13 10:15:00',
  },
]

export const flowComponentList = ref(initialFlowComponents.map((item) => ({ ...item, clients: [...item.clients] })))

let flowComponentIdSeq = initialFlowComponents.length + 100

export function listFlowComponents() {
  return flowComponentList.value
}

export function createEmptyFlowComponent() {
  return {
    component_name: '',
    component_code: '',
    category: '',
    clients: ['Web', 'App'],
    config_desc: '',
    enabled: true,
    sort_no: 0,
    remark: '',
  }
}

export function cloneFlowComponent(record) {
  return { ...record, clients: [...(record.clients || [])] }
}

export function saveFlowComponent(payload, id) {
  const data = {
    component_name: String(payload.component_name || '').trim(),
    component_code: String(payload.component_code || '').trim(),
    category: payload.category || '',
    clients: Array.isArray(payload.clients) ? payload.clients.filter(Boolean) : [],
    config_desc: String(payload.config_desc || '').trim(),
    enabled: payload.enabled !== false,
    sort_no: Number(payload.sort_no) || 0,
    remark: String(payload.remark || '').trim(),
    updated_at: nowStr(),
  }
  if (!data.clients.length) return { ok: false, msg: '请至少选择一个适用端' }
  if (codeExists(flowComponentList.value, 'component_code', data.component_code, id)) {
    return { ok: false, msg: '组件编码已存在，请更换' }
  }
  if (id) {
    const idx = flowComponentList.value.findIndex((item) => item.id === id)
    if (idx < 0) return { ok: false, msg: '该组件不存在' }
    flowComponentList.value[idx] = { ...flowComponentList.value[idx], ...data, id }
    return { ok: true, data: flowComponentList.value[idx] }
  }
  const created = { ...data, id: `fc-${++flowComponentIdSeq}` }
  flowComponentList.value.unshift(created)
  return { ok: true, data: created }
}

export function removeFlowComponent(id) {
  const idx = flowComponentList.value.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, msg: '该组件不存在' }
  flowComponentList.value.splice(idx, 1)
  return { ok: true }
}

/* ============================================================================
 * 2. 流程表单
 * ==========================================================================*/

/** 所属流程分类（演示候选值，待正式工程给出口径） */
export const FLOW_FORM_CATEGORY_OPTIONS = ['质量管理', '安全管理', '进度管理', '材料设备', '行政办公']

/** 表单类型 */
export const FLOW_FORM_TYPE_OPTIONS = ['动态表单', '自定义页面']

/** 表单状态 */
export const FLOW_FORM_STATUS_OPTIONS = ['草稿', '已发布', '已停用']

export function formStatusTagType(status) {
  if (status === '已发布') return 'success'
  if (status === '已停用') return 'danger'
  return 'info'
}

const initialFlowForms = [
  {
    id: 'ff-001',
    form_name: '材料设备进场申请单',
    form_code: 'FORM_MAT_ENTRY',
    category: '材料设备',
    form_type: '动态表单',
    version: 'V1.2',
    status: '已发布',
    definition: '材料设备进场审批流程',
    remark: '项目层级发起，监理审批',
    updated_at: '2026-10-13 09:30:00',
  },
  {
    id: 'ff-002',
    form_name: '品牌报审单',
    form_code: 'FORM_BRAND_APPLY',
    category: '质量管理',
    form_type: '动态表单',
    version: 'V1.1',
    status: '已发布',
    definition: '品牌报审审批流程',
    remark: '',
    updated_at: '2026-10-13 09:32:00',
  },
  {
    id: 'ff-003',
    form_name: '实体工程验收单',
    form_code: 'FORM_QM_ENTITY',
    category: '质量管理',
    form_type: '自定义页面',
    version: 'V2.0',
    status: '已发布',
    definition: '质量验评审批流程',
    remark: '与质量验评模块深度集成',
    updated_at: '2026-10-13 09:40:00',
  },
  {
    id: 'ff-004',
    form_name: '隐患排查整改单',
    form_code: 'FORM_HAZARD_RECTIFY',
    category: '安全管理',
    form_type: '动态表单',
    version: 'V1.3',
    status: '已发布',
    definition: '隐患整改闭环流程',
    remark: '',
    updated_at: '2026-10-13 09:45:00',
  },
  {
    id: 'ff-005',
    form_name: '危大工程辨识单',
    form_code: 'FORM_MAJOR_HAZARD',
    category: '安全管理',
    form_type: '动态表单',
    version: 'V1.0',
    status: '草稿',
    definition: '',
    remark: '待监理确认字段后发布',
    updated_at: '2026-10-13 09:50:00',
  },
  {
    id: 'ff-006',
    form_name: '每日施工作业申报单',
    form_code: 'FORM_DAILY_WORK',
    category: '进度管理',
    form_type: '动态表单',
    version: 'V1.1',
    status: '已发布',
    definition: '每日施工作业申报流程',
    remark: '',
    updated_at: '2026-10-13 09:55:00',
  },
  {
    id: 'ff-007',
    form_name: '特种作业人员报审单',
    form_code: 'FORM_SPECIAL_WORKER',
    category: '行政办公',
    form_type: '动态表单',
    version: 'V1.0',
    status: '已停用',
    definition: '特种作业人员报审流程',
    remark: '已由实名制模块承接',
    updated_at: '2026-10-13 10:00:00',
  },
]

export const flowFormList = ref(initialFlowForms.map((item) => ({ ...item })))

let flowFormIdSeq = initialFlowForms.length + 100

export function listFlowForms() {
  return flowFormList.value
}

export function createEmptyFlowForm() {
  return {
    form_name: '',
    form_code: '',
    category: '',
    form_type: '动态表单',
    version: 'V1.0',
    status: '草稿',
    definition: '',
    remark: '',
  }
}

export function cloneFlowForm(record) {
  return { ...record }
}

export function saveFlowForm(payload, id) {
  const data = {
    form_name: String(payload.form_name || '').trim(),
    form_code: String(payload.form_code || '').trim(),
    category: payload.category || '',
    form_type: payload.form_type || '动态表单',
    version: String(payload.version || '').trim(),
    status: payload.status || '草稿',
    definition: String(payload.definition || '').trim(),
    remark: String(payload.remark || '').trim(),
    updated_at: nowStr(),
  }
  if (!FLOW_FORM_CATEGORY_OPTIONS.includes(data.category)) return { ok: false, msg: '请选择所属流程分类' }
  if (!FLOW_FORM_TYPE_OPTIONS.includes(data.form_type)) return { ok: false, msg: '请选择表单类型' }
  if (!FLOW_FORM_STATUS_OPTIONS.includes(data.status)) return { ok: false, msg: '请选择表单状态' }
  if (codeExists(flowFormList.value, 'form_code', data.form_code, id)) {
    return { ok: false, msg: '表单编号已存在，请更换' }
  }
  if (id) {
    const idx = flowFormList.value.findIndex((item) => item.id === id)
    if (idx < 0) return { ok: false, msg: '该表单不存在' }
    flowFormList.value[idx] = { ...flowFormList.value[idx], ...data, id }
    return { ok: true, data: flowFormList.value[idx] }
  }
  const created = { ...data, id: `ff-${++flowFormIdSeq}` }
  flowFormList.value.unshift(created)
  return { ok: true, data: created }
}

export function removeFlowForm(id) {
  const idx = flowFormList.value.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, msg: '该表单不存在' }
  flowFormList.value.splice(idx, 1)
  return { ok: true }
}

/* ============================================================================
 * 3. 消息分类
 * ==========================================================================*/

/** 消息渠道候选值 */
export const MESSAGE_CHANNEL_OPTIONS = ['站内信', '短信', 'App推送']

const initialMessageClassifies = [
  {
    id: 'mc-001',
    classify_name: '待办提醒',
    classify_code: 'TODO_REMIND',
    channels: ['站内信', 'App推送'],
    enabled: true,
    sort_no: 10,
    remark: '审批待办到达时通知办理人',
    updated_at: '2026-10-13 10:20:00',
  },
  {
    id: 'mc-002',
    classify_name: '审批结果通知',
    classify_code: 'APPROVE_RESULT',
    channels: ['站内信', 'App推送'],
    enabled: true,
    sort_no: 20,
    remark: '审批通过 / 驳回后通知发起人',
    updated_at: '2026-10-13 10:21:00',
  },
  {
    id: 'mc-003',
    classify_name: '预警告警',
    classify_code: 'ALERT_WARNING',
    channels: ['站内信', '短信', 'App推送'],
    enabled: true,
    sort_no: 30,
    remark: '监测预警与设备离线告警',
    updated_at: '2026-10-13 10:22:00',
  },
  {
    id: 'mc-004',
    classify_name: '逾期催办',
    classify_code: 'OVERDUE_URGE',
    channels: ['站内信', '短信'],
    enabled: true,
    sort_no: 40,
    remark: '任务或整改超期时催办',
    updated_at: '2026-10-13 10:23:00',
  },
  {
    id: 'mc-005',
    classify_name: '系统公告',
    classify_code: 'SYSTEM_NOTICE',
    channels: ['站内信'],
    enabled: true,
    sort_no: 50,
    remark: '平台维护、停机公告',
    updated_at: '2026-10-13 10:24:00',
  },
  {
    id: 'mc-006',
    classify_name: '版本更新通知',
    classify_code: 'VERSION_UPDATE',
    channels: ['App推送'],
    enabled: false,
    sort_no: 60,
    remark: '暂不启用，版本通知改由系统管理统一发布',
    updated_at: '2026-10-13 10:25:00',
  },
]

export const messageClassifyList = ref(initialMessageClassifies.map((item) => ({ ...item, channels: [...item.channels] })))

let messageClassifyIdSeq = initialMessageClassifies.length + 100

export function listMessageClassifies() {
  return messageClassifyList.value
}

/** 启用中的分类（供模板定义选择） */
export function listEnabledMessageClassifies() {
  return messageClassifyList.value.filter((item) => item.enabled)
}

export function getMessageClassifyByCode(code) {
  return messageClassifyList.value.find((item) => item.classify_code === code) || null
}

export function createEmptyMessageClassify() {
  return {
    classify_name: '',
    classify_code: '',
    channels: ['站内信'],
    enabled: true,
    sort_no: 0,
    remark: '',
  }
}

export function cloneMessageClassify(record) {
  return { ...record, channels: [...(record.channels || [])] }
}

export function saveMessageClassify(payload, id) {
  const data = {
    classify_name: String(payload.classify_name || '').trim(),
    classify_code: String(payload.classify_code || '').trim(),
    channels: Array.isArray(payload.channels) ? payload.channels.filter(Boolean) : [],
    enabled: payload.enabled !== false,
    sort_no: Number(payload.sort_no) || 0,
    remark: String(payload.remark || '').trim(),
    updated_at: nowStr(),
  }
  if (!data.channels.length) return { ok: false, msg: '请至少选择一个消息渠道' }
  if (codeExists(messageClassifyList.value, 'classify_code', data.classify_code, id)) {
    return { ok: false, msg: '分类编码已存在，请更换' }
  }
  if (id) {
    const idx = messageClassifyList.value.findIndex((item) => item.id === id)
    if (idx < 0) return { ok: false, msg: '该消息分类不存在' }
    messageClassifyList.value[idx] = { ...messageClassifyList.value[idx], ...data, id }
    return { ok: true, data: messageClassifyList.value[idx] }
  }
  const created = { ...data, id: `mc-${++messageClassifyIdSeq}` }
  messageClassifyList.value.unshift(created)
  return { ok: true, data: created }
}

export function removeMessageClassify(id) {
  const idx = messageClassifyList.value.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, msg: '该消息分类不存在' }
  const target = messageClassifyList.value[idx]
  const used = messageTemplateList.value.filter((tpl) => tpl.classify_code === target.classify_code)
  if (used.length) {
    return { ok: false, msg: `该分类已被 ${used.length} 个消息模板引用，请先处理模板` }
  }
  messageClassifyList.value.splice(idx, 1)
  return { ok: true }
}

/* ============================================================================
 * 4. 消息模板
 * ==========================================================================*/

const initialMessageTemplates = [
  {
    id: 'mt-001',
    template_name: '待办到达提醒',
    template_code: 'TPL_TODO_ARRIVE',
    classify_code: 'TODO_REMIND',
    channels: ['站内信', 'App推送'],
    title_tpl: '【待办】${bizName}待您办理',
    content_tpl: '${receiverName}，您有一项待办「${bizName}」由 ${senderName} 于 ${submitTime} 提交，请及时办理。',
    variables: 'bizName：业务事项名称\nreceiverName：接收人姓名\nsenderName：提交人姓名\nsubmitTime：提交时间',
    enabled: true,
    updated_at: '2026-10-13 10:30:00',
  },
  {
    id: 'mt-002',
    template_name: '审批通过通知',
    template_code: 'TPL_APPROVE_PASS',
    classify_code: 'APPROVE_RESULT',
    channels: ['站内信', 'App推送'],
    title_tpl: '【审批通过】${bizName}',
    content_tpl: '${receiverName}，您提交的「${bizName}」已于 ${approveTime} 审批通过，审批人：${approverName}。',
    variables: 'bizName：业务事项名称\nreceiverName：接收人姓名\napproveTime：审批时间\napproverName：审批人',
    enabled: true,
    updated_at: '2026-10-13 10:31:00',
  },
  {
    id: 'mt-003',
    template_name: '审批驳回通知',
    template_code: 'TPL_APPROVE_REJECT',
    classify_code: 'APPROVE_RESULT',
    channels: ['站内信'],
    title_tpl: '【审批驳回】${bizName}',
    content_tpl: '${receiverName}，您提交的「${bizName}」于 ${approveTime} 被驳回，驳回意见：${opinion}。请修改后重新提交。',
    variables: 'bizName：业务事项名称\nreceiverName：接收人姓名\napproveTime：审批时间\nopinion：驳回意见',
    enabled: true,
    updated_at: '2026-10-13 10:32:00',
  },
  {
    id: 'mt-004',
    template_name: '设备离线告警通知',
    template_code: 'TPL_DEVICE_OFFLINE',
    classify_code: 'ALERT_WARNING',
    channels: ['站内信', '短信', 'App推送'],
    title_tpl: '【告警】${deviceName} 离线超过 ${offlineDuration}',
    content_tpl: '${projectName} 的「${deviceName}」已离线 ${offlineDuration}，请运维人员及时排查。',
    variables: 'projectName：项目名称\ndeviceName：设备名称\nofflineDuration：离线时长',
    enabled: true,
    updated_at: '2026-10-13 10:33:00',
  },
  {
    id: 'mt-005',
    template_name: '整改逾期催办',
    template_code: 'TPL_RECTIFY_OVERDUE',
    classify_code: 'OVERDUE_URGE',
    channels: ['站内信', '短信'],
    title_tpl: '【催办】${bizName} 已逾期',
    content_tpl: '${receiverName}，「${bizName}」应于 ${deadline} 前完成，目前仍未闭环，请尽快处理。',
    variables: 'bizName：业务事项名称\nreceiverName：接收人姓名\ndeadline：要求完成时间',
    enabled: true,
    updated_at: '2026-10-13 10:34:00',
  },
  {
    id: 'mt-006',
    template_name: '平台维护公告',
    template_code: 'TPL_SYSTEM_NOTICE',
    classify_code: 'SYSTEM_NOTICE',
    channels: ['站内信'],
    title_tpl: '【公告】平台维护通知',
    content_tpl: '平台将于 ${maintainTime} 进行维护，预计耗时 ${duration}，期间请勿提交业务。',
    variables: 'maintainTime：维护开始时间\nduration：预计耗时',
    enabled: false,
    updated_at: '2026-10-13 10:35:00',
  },
]

export const messageTemplateList = ref(initialMessageTemplates.map((item) => ({ ...item, channels: [...item.channels] })))

let messageTemplateIdSeq = initialMessageTemplates.length + 100

export function listMessageTemplates() {
  return messageTemplateList.value
}

/** 分类编码 → 分类名称（模板列表展示用） */
export function classifyNameByCode(code) {
  const hit = getMessageClassifyByCode(code)
  return hit ? hit.classify_name : '--'
}

export function createEmptyMessageTemplate() {
  return {
    template_name: '',
    template_code: '',
    classify_code: '',
    channels: ['站内信'],
    title_tpl: '',
    content_tpl: '',
    variables: '',
    enabled: true,
  }
}

export function cloneMessageTemplate(record) {
  return { ...record, channels: [...(record.channels || [])] }
}

export function saveMessageTemplate(payload, id) {
  const data = {
    template_name: String(payload.template_name || '').trim(),
    template_code: String(payload.template_code || '').trim(),
    classify_code: payload.classify_code || '',
    channels: Array.isArray(payload.channels) ? payload.channels.filter(Boolean) : [],
    title_tpl: String(payload.title_tpl || '').trim(),
    content_tpl: String(payload.content_tpl || '').trim(),
    variables: String(payload.variables || '').trim(),
    enabled: payload.enabled !== false,
    updated_at: nowStr(),
  }
  const classify = getMessageClassifyByCode(data.classify_code)
  if (!classify) return { ok: false, msg: '请选择所属消息分类' }
  if (!classify.enabled) return { ok: false, msg: '该消息分类已停用，请先启用或改选其他分类' }
  if (!data.channels.length) return { ok: false, msg: '请至少选择一个消息渠道' }
  if (codeExists(messageTemplateList.value, 'template_code', data.template_code, id)) {
    return { ok: false, msg: '模板编码已存在，请更换' }
  }
  if (id) {
    const idx = messageTemplateList.value.findIndex((item) => item.id === id)
    if (idx < 0) return { ok: false, msg: '该消息模板不存在' }
    messageTemplateList.value[idx] = { ...messageTemplateList.value[idx], ...data, id }
    return { ok: true, data: messageTemplateList.value[idx] }
  }
  const created = { ...data, id: `mt-${++messageTemplateIdSeq}` }
  messageTemplateList.value.unshift(created)
  return { ok: true, data: created }
}

export function removeMessageTemplate(id) {
  const idx = messageTemplateList.value.findIndex((item) => item.id === id)
  if (idx < 0) return { ok: false, msg: '该消息模板不存在' }
  messageTemplateList.value.splice(idx, 1)
  return { ok: true }
}

/** 预览用示例变量（演示值，不请求真实数据） */
export const MESSAGE_TEMPLATE_SAMPLE_VARS = {
  bizName: '材料设备进场申请单',
  receiverName: '张伟',
  senderName: '李强',
  submitTime: '2026-10-13 09:30',
  approveTime: '2026-10-13 11:05',
  approverName: '王敏',
  opinion: '附件缺少合格证，请补充后重新提交',
  projectName: 'T1 航站区扩建工程',
  deviceName: '1#塔吊监测终端',
  offlineDuration: '2 小时',
  deadline: '2026-10-12 18:00',
  maintainTime: '2026-10-18 22:00',
  duration: '2 小时',
}

/** 渲染 ${变量} 占位符；未提供示例值的变量原样保留，便于发现漏配 */
export function renderMessageTemplate(text) {
  const raw = String(text || '')
  if (!raw) return ''
  return raw.replace(/\$\{(\w+)\}/g, (match, key) => {
    const value = MESSAGE_TEMPLATE_SAMPLE_VARS[key]
    return value === undefined ? match : value
  })
}
