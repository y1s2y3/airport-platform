/**
 * 样板管理 Mock — 对齐 prd-sample-v1
 * 材料定样 / 关键工序样板：监理 → 项目经理
 */
import { reactive } from 'vue'
import { getProjectLabel } from './laborRealName.js'
import {
  createSampleSupervisorTodo,
  createSamplePmTodo,
  discardSampleTodos,
  finishSampleOpenTodos,
} from './personalCenter.js'

export const STATUS_LABEL = {
  in_approval: '审批中',
  approved: '已通过',
  rejected: '已驳回',
}

export const NODE_LABEL = {
  none: '—',
  supervisor: '待监理审',
  pm: '待项目经理审',
}

/** 审批记录节点（历史轨迹用，非「待审」文案） */
export const APPROVAL_NODE_LABEL = {
  applicant: '施工提交',
  supervisor: '监理审批',
  pm: '项目经理终审',
}

export const ACTION_LABEL = {
  submit: '提交',
  resubmit: '重提',
  agree: '同意',
  reject: '退回',
}

export function actionTagType(action) {
  if (action === 'agree' || action === 'submit' || action === 'resubmit') return 'success'
  if (action === 'reject') return 'danger'
  return 'warning'
}

export const BIZ_TYPE_LABEL = {
  material: '材料定样',
  process: '工序样板',
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'in_approval') return 'warning'
  return ''
}

function timestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

const store = reactive({
  seq: { m: 3, p: 3, ar: 8 },
  materials: [
    {
      application_id: 'MS-001',
      project_id: 'p-000',
      material_name: '外墙真石漆',
      use_part: 'T3 航站楼外立面',
      sample_spec: {
        material_spec: '砂壁状真石漆 A12；涂层厚度≥1.5mm',
        supplier: '亚士创能科技股份有限公司',
        effect_images: ['真石漆样板-正面.jpg', '真石漆样板-侧面.jpg'],
      },
      compare_items: [
        {
          material_name: '水包水多彩涂料',
          material_spec: '水包水多彩涂料 B07',
          supplier: '立邦涂料（中国）有限公司',
          effect_images: ['比选-立邦.jpg'],
        },
        {
          material_name: '质感涂料',
          material_spec: '质感涂料 C03',
          supplier: '三棵树涂料股份有限公司',
          effect_images: ['比选-三棵树.jpg'],
        },
      ],
      compare_record: '比选两家后选定亚士漆色卡 A12。',
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-10 09:20:00',
      finish_time: '2026-07-12 16:40:00',
      remark: '',
    },
    {
      application_id: 'MS-002',
      project_id: 'p-000',
      material_name: '室内地砖 800×800',
      use_part: '商业区公区',
      sample_spec: {
        material_spec: '通体瓷砖 800×800；吸水率≤0.5%',
        supplier: '某陶瓷集团',
        effect_images: ['地砖样板.jpg'],
      },
      compare_items: [
        {
          material_name: '抛光砖',
          material_spec: '抛光砖 800×800',
          supplier: '某建材商贸',
          effect_images: ['地砖比选-抛光.jpg'],
        },
      ],
      compare_record: '两款对比，耐磨与色差达标，选定通体瓷砖。',
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-25 11:05:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'MS-003',
      project_id: 'p-001',
      material_name: '铝单板幕墙',
      use_part: '连廊立面',
      sample_spec: {
        material_spec: '氟碳喷涂铝单板 2.5mm；色号 RAL9006',
        supplier: '某幕墙材料厂',
        effect_images: ['铝单板-1.jpg'],
      },
      compare_items: [],
      compare_record: '色差与平整度已现场确认。',
      status: 'in_approval',
      current_node: 'pm',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-20 14:10:00',
      finish_time: '',
      remark: '',
    },
  ],
  processes: [
    {
      application_id: 'PS-001',
      project_id: 'p-000',
      process_name: '清水混凝土柱样板',
      use_part: '地下一层结构区',
      briefing_content: '模板拼缝、拆模时机、养护要求；样板标准照片见影像资料。',
      photo_files: ['清水柱-正面.jpg', '清水柱-节点.jpg'],
      video_files: ['交底讲解.mp4'],
      media_files: [
        { name: '清水柱-正面.jpg', kind: 'image' },
        { name: '清水柱-节点.jpg', kind: 'image' },
        { name: '交底讲解.mp4', kind: 'video' },
      ],
      doc_files: ['清水混凝土样板说明.pdf'],
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-08 10:00:00',
      finish_time: '2026-07-09 17:30:00',
      remark: '',
    },
    {
      application_id: 'PS-002',
      project_id: 'p-000',
      process_name: '防水卷材铺贴样板',
      use_part: '屋面防水层',
      briefing_content: '搭接宽度、热熔顺序、节点加强。',
      photo_files: ['防水样板.jpg'],
      video_files: [],
      media_files: [{ name: '防水样板.jpg', kind: 'image' }],
      doc_files: ['防水节点做法.docx'],
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-26 09:40:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'PS-003',
      project_id: 'p-001',
      process_name: '砌体样板墙',
      use_part: '办公区隔墙',
      briefing_content: '灰缝厚度、拉结筋、洞口加强。',
      photo_files: ['砌体墙.jpg'],
      video_files: ['砌体交底.mp4'],
      media_files: [
        { name: '砌体墙.jpg', kind: 'image' },
        { name: '砌体交底.mp4', kind: 'video' },
      ],
      doc_files: [],
      status: 'in_approval',
      current_node: 'pm',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-22 15:20:00',
      finish_time: '',
      remark: '',
    },
  ],
  approvals: [
    {
      record_id: 'AR-001',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'applicant',
      action: 'submit',
      opinion: '直接提交',
      operator_name: '施工-王工',
      operate_time: '2026-07-10 09:20:00',
    },
    {
      record_id: 'AR-002',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '样板合格',
      operator_name: '监理用户',
      operate_time: '2026-07-11 10:00:00',
    },
    {
      record_id: 'AR-003',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'pm',
      action: 'agree',
      opinion: '同意定样',
      operator_name: '项目经理',
      operate_time: '2026-07-12 16:40:00',
    },
    {
      record_id: 'AR-004',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'applicant',
      action: 'submit',
      opinion: '直接提交',
      operator_name: '施工-王工',
      operate_time: '2026-07-08 10:00:00',
    },
    {
      record_id: 'AR-005',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '交底完整',
      operator_name: '监理用户',
      operate_time: '2026-07-09 09:00:00',
    },
    {
      record_id: 'AR-006',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'pm',
      action: 'agree',
      opinion: '终审通过',
      operator_name: '项目经理',
      operate_time: '2026-07-09 17:30:00',
    },
    {
      record_id: 'AR-007',
      biz_type: 'material',
      application_id: 'MS-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意',
      operator_name: '监理用户',
      operate_time: '2026-07-21 11:00:00',
    },
    {
      record_id: 'AR-008',
      biz_type: 'process',
      application_id: 'PS-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意',
      operator_name: '监理用户',
      operate_time: '2026-07-23 10:00:00',
    },
  ],
})

function pushApproval(row) {
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    ...row,
    operate_time: row.operate_time || timestamp(),
  })
}

function buildTodoPayload(bizType, app) {
  const isMaterial = bizType === 'material'
  return {
    bizType,
    applicationId: app.application_id,
    title: isMaterial ? app.material_name : app.process_name,
    usePart: app.use_part || '',
    projectId: app.project_id,
    projectLabel: getProjectLabel(app.project_id) || app.project_id,
    applicantName: app.applicant_name,
    applyTime: app.submit_time,
    briefing: isMaterial
      ? app.compare_record ||
        (app.sample_spec
          ? `定版：${app.sample_spec.material_spec || ''} / ${app.sample_spec.supplier || ''}`
          : '')
      : app.briefing_content,
  }
}

export function listMaterialApps(projectId, { keyword = '', status = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return store.materials
    .filter((a) => a.project_id === projectId)
    .filter((a) => !status || a.status === status)
    .filter((a) => {
      if (!kw) return true
      return (
        a.application_id.toLowerCase().includes(kw) ||
        a.material_name.toLowerCase().includes(kw) ||
        (a.use_part || '').toLowerCase().includes(kw)
      )
    })
    .slice()
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listProcessApps(projectId, { keyword = '', status = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return store.processes
    .filter((a) => a.project_id === projectId)
    .filter((a) => !status || a.status === status)
    .filter((a) => {
      if (!kw) return true
      return (
        a.application_id.toLowerCase().includes(kw) ||
        a.process_name.toLowerCase().includes(kw) ||
        (a.use_part || '').toLowerCase().includes(kw)
      )
    })
    .slice()
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listMaterialPending(projectId, node) {
  return store.materials.filter(
    (a) =>
      a.project_id === projectId &&
      a.status === 'in_approval' &&
      (!node || a.current_node === node),
  )
}

export function listProcessPending(projectId, node) {
  return store.processes.filter(
    (a) =>
      a.project_id === projectId &&
      a.status === 'in_approval' &&
      (!node || a.current_node === node),
  )
}

export function getMaterialDetail(applicationId) {
  const app = store.materials.find((a) => a.application_id === applicationId)
  if (!app) return null
  return {
    ...app,
    project_label: getProjectLabel(app.project_id) || app.project_id,
    approvals: store.approvals.filter(
      (r) => r.biz_type === 'material' && r.application_id === applicationId,
    ),
  }
}

export function getProcessDetail(applicationId) {
  const app = store.processes.find((a) => a.application_id === applicationId)
  if (!app) return null
  return {
    ...app,
    project_label: getProjectLabel(app.project_id) || app.project_id,
    approvals: store.approvals.filter(
      (r) => r.biz_type === 'process' && r.application_id === applicationId,
    ),
  }
}

/** 台账视图：仅已通过 */
export function listLedger(projectId, { bizType = '', keyword = '', usePart = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  const part = usePart.trim().toLowerCase()
  const rows = []
  if (!bizType || bizType === 'material') {
    store.materials
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          ledger_id: `L-${a.application_id}`,
          biz_type: 'material',
          application_id: a.application_id,
          title: a.material_name,
          use_part: a.use_part,
          status: a.status,
          project_id: a.project_id,
          finish_time: a.finish_time,
        })
      })
  }
  if (!bizType || bizType === 'process') {
    store.processes
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          ledger_id: `L-${a.application_id}`,
          biz_type: 'process',
          application_id: a.application_id,
          title: a.process_name,
          use_part: a.use_part,
          status: a.status,
          project_id: a.project_id,
          finish_time: a.finish_time,
        })
      })
  }
  return rows
    .filter((r) => {
      if (part && !(r.use_part || '').toLowerCase().includes(part)) return false
      if (!kw) return true
      return (
        r.application_id.toLowerCase().includes(kw) ||
        r.title.toLowerCase().includes(kw) ||
        (r.use_part || '').toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => (a.finish_time < b.finish_time ? 1 : -1))
}

/** 验评可选：已通过定版定样（材料+工序）；支持施工部位筛选 */
export function listSelectableForInspect(
  projectId,
  { keyword = '', usePart = '', locationId = '', bizType = '' } = {},
) {
  const locId = String(locationId || '').trim()
  const part = String(usePart || '').trim().toLowerCase()
  const rows = []
  const pushMat = () => {
    store.materials
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          sample_id: a.application_id,
          sample_name: a.material_name,
          sample_category: '材料定样',
          biz_type: 'material',
          use_part: a.use_part || '',
          location_id: a.location_id || '',
          location_ids: Array.isArray(a.location_ids) ? [...a.location_ids] : [],
          brand_name: a.sample_spec?.brand_name || a.brand_name || '',
          finish_time: a.finish_time || '',
        })
      })
  }
  const pushProc = () => {
    store.processes
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          sample_id: a.application_id,
          sample_name: a.process_name,
          sample_category: '工序样板',
          biz_type: 'process',
          use_part: a.use_part || '',
          location_id: a.location_id || '',
          location_ids: Array.isArray(a.location_ids) ? [...a.location_ids] : [],
          brand_name: '',
          finish_time: a.finish_time || '',
        })
      })
  }
  if (!bizType || bizType === 'material') pushMat()
  if (!bizType || bizType === 'process') pushProc()

  const kw = String(keyword || '').trim().toLowerCase()
  return rows
    .filter((r) => {
      if (locId || part) {
        const ids = Array.isArray(r.location_ids) ? r.location_ids.map(String) : []
        if (r.location_id) ids.push(String(r.location_id))
        const idHit = locId ? ids.includes(locId) : false
        const partHit = part
          ? (r.use_part || '').toLowerCase().includes(part) ||
            part.includes((r.use_part || '').toLowerCase())
          : false
        if (!idHit && !partHit) return false
      }
      if (!kw) return true
      return (
        r.sample_id.toLowerCase().includes(kw) ||
        (r.sample_name || '').toLowerCase().includes(kw) ||
        (r.sample_category || '').toLowerCase().includes(kw) ||
        (r.use_part || '').toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => (a.finish_time < b.finish_time ? 1 : -1))
}

export function submitMaterialApp(payload) {
  const {
    project_id,
    material_name,
    use_part,
    location_id = '',
    location_ids = [],
    sample_spec = null,
    compare_items = [],
    remark = '',
    applicant_name = '当前用户',
  } = payload
  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!(material_name || '').trim()) return { ok: false, msg: '请填写材料名称' }
  const ids = Array.isArray(location_ids) ? location_ids.map(String).filter(Boolean) : []
  if (location_id && !ids.length) ids.push(String(location_id))
  const part = String(use_part || '').trim()
  if (!part && !ids.length) return { ok: false, msg: '请选择施工部位' }

  const spec = sample_spec || {}
  const material_spec = String(spec.material_spec || '').trim()
  const supplier = String(spec.supplier || '').trim()
  const effect_images = Array.isArray(spec.effect_images)
    ? spec.effect_images.map(String).filter(Boolean)
    : []
  if (!material_spec) return { ok: false, msg: '请填写定版定样的材料规格' }
  if (!supplier) return { ok: false, msg: '请填写定版定样的供应商' }
  if (!effect_images.length) return { ok: false, msg: '请至少上传 1 张定版定样效果图' }

  const compares = (Array.isArray(compare_items) ? compare_items : [])
    .map((c) => ({
      material_name: String(c.material_name || '').trim(),
      material_spec: String(c.material_spec || '').trim(),
      supplier: String(c.supplier || '').trim(),
      effect_images: Array.isArray(c.effect_images)
        ? c.effect_images.map(String).filter(Boolean)
        : [],
    }))
    .filter((c) => c.material_name && c.material_spec && c.supplier && c.effect_images.length)

  const compare_record = [
    `定版：${material_spec}（${supplier}）`,
    ...compares.map(
      (c, i) => `比选${i + 1}：${c.material_name} / ${c.material_spec}（${c.supplier}）`,
    ),
  ].join('；')

  store.seq.m += 1
  const application_id = `MS-${String(store.seq.m).padStart(3, '0')}`
  const submit_time = timestamp()
  const app = {
    application_id,
    project_id,
    material_name: material_name.trim(),
    use_part: part,
    location_id: ids[0] || String(location_id || ''),
    location_ids: ids,
    sample_spec: {
      material_spec,
      supplier,
      effect_images,
    },
    compare_items: compares,
    compare_record,
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark: remark || '',
  }
  store.materials.unshift(app)
  pushApproval({
    biz_type: 'material',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: '直接提交',
    operator_name: applicant_name,
  })
  createSampleSupervisorTodo(buildTodoPayload('material', app))
  return { ok: true, data: app }
}

export function submitProcessApp(payload) {
  const {
    project_id,
    process_name,
    use_part,
    location_id = '',
    location_ids = [],
    briefing_content,
    photo_files = [],
    video_files = [],
    media_files = [],
    doc_files = [],
    remark = '',
    applicant_name = '当前用户',
  } = payload
  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!(process_name || '').trim()) return { ok: false, msg: '请填写工序名称' }
  const ids = Array.isArray(location_ids) ? location_ids.map(String).filter(Boolean) : []
  if (location_id && !ids.length) ids.push(String(location_id))
  const part = String(use_part || '').trim()
  if (!part && !ids.length) return { ok: false, msg: '请选择施工部位' }
  if (!(briefing_content || '').trim()) return { ok: false, msg: '请填写关键工序样板说明' }

  let photos = Array.isArray(photo_files) ? photo_files.map(String).filter(Boolean) : []
  let videos = Array.isArray(video_files) ? video_files.map(String).filter(Boolean) : []
  const media = (Array.isArray(media_files) ? media_files : [])
    .map((m) => ({
      name: String(m.name || '').trim(),
      kind: m.kind === 'video' ? 'video' : 'image',
    }))
    .filter((m) => m.name)
  if (media.length) {
    photos = media.filter((m) => m.kind === 'image').map((m) => m.name)
    videos = media.filter((m) => m.kind === 'video').map((m) => m.name)
  }
  const docs = Array.isArray(doc_files) ? doc_files.map(String).filter(Boolean) : []

  store.seq.p += 1
  const application_id = `PS-${String(store.seq.p).padStart(3, '0')}`
  const submit_time = timestamp()
  const app = {
    application_id,
    project_id,
    process_name: process_name.trim(),
    use_part: part,
    location_id: ids[0] || String(location_id || ''),
    location_ids: ids,
    briefing_content: briefing_content.trim(),
    photo_files: photos,
    video_files: videos,
    media_files: media.length
      ? media
      : [
          ...photos.map((name) => ({ name, kind: 'image' })),
          ...videos.map((name) => ({ name, kind: 'video' })),
        ],
    doc_files: docs,
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark: remark || '',
  }
  store.processes.unshift(app)
  pushApproval({
    biz_type: 'process',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: '直接提交',
    operator_name: applicant_name,
  })
  createSampleSupervisorTodo(buildTodoPayload('process', app))
  return { ok: true, data: app }
}

function findApp(bizType, applicationId) {
  return bizType === 'material'
    ? store.materials.find((a) => a.application_id === applicationId)
    : store.processes.find((a) => a.application_id === applicationId)
}

export function resubmitSample(bizType, applicationId) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'rejected') {
    return { ok: false, msg: '仅已驳回可重提' }
  }
  app.status = 'in_approval'
  app.current_node = 'supervisor'
  app.submit_time = timestamp()
  app.finish_time = ''
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'resubmit',
    opinion: '重新提交',
    operator_name: '当前用户',
  })
  createSampleSupervisorTodo(buildTodoPayload(bizType, app))
  return { ok: true }
}

export function supervisorApproveSample(bizType, applicationId, { action, opinion }) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在待监理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'supervisor',
    action,
    opinion: opinion || '',
    operator_name: '监理用户',
  })
  if (action === 'agree') {
    finishSampleOpenTodos(bizType, applicationId, 'supervisor', '监理同意')
    app.current_node = 'pm'
    createSamplePmTodo(buildTodoPayload(bizType, app))
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'supervisor', '监理退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
  }
  return { ok: true }
}

export function pmApproveSample(bizType, applicationId, { action, opinion }) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'pm') {
    return { ok: false, msg: '当前不在待项目经理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'pm',
    action,
    opinion: opinion || '',
    operator_name: '项目经理',
  })
  if (action === 'agree') {
    finishSampleOpenTodos(bizType, applicationId, 'pm', '终审通过')
    discardSampleTodos(bizType, applicationId)
    app.status = 'approved'
    app.current_node = 'none'
    app.finish_time = timestamp()
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'pm', '终审退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
  }
  return { ok: true }
}
