/** 登录结果选项 */
export const loginResultOptions = ['全部', '成功', '失败']

/** 操作类型选项 */
export const operationTypeOptions = ['全部', '新增', '修改', '删除', '查询', '导出', '审批', '登录']

/** 操作模块选项 */
export const operationModuleOptions = [
  '全部',
  '系统设置',
  '用户管理',
  '角色管理',
  '质量管理',
  '安全管理',
  'COC调度',
  '档案系统',
]

/** 登录日志 */
export const loginLogList = [
  { id: 'll-001', username: 'liuwenqiang', name: '刘文强', loginTime: '2026-06-26 08:32:15', ip: '10.12.8.45', location: '广东省深圳市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
  { id: 'll-002', username: 'yaoyuandong', name: '姚远东', loginTime: '2026-06-26 08:45:02', ip: '10.12.9.102', location: '广东省深圳市', browser: 'Edge 124 / Windows 11', result: '成功', failReason: '' },
  { id: 'll-003', username: 'chenjing', name: '陈静', loginTime: '2026-06-26 09:01:33', ip: '172.16.3.28', location: '广东省深圳市', browser: 'Chrome 125 / macOS', result: '成功', failReason: '' },
  { id: 'll-004', username: 'wangjianguo', name: '王建国', loginTime: '2026-06-26 09:18:47', ip: '58.248.112.66', location: '广东省深圳市', browser: 'Chrome 124 / Android', result: '成功', failReason: '' },
  { id: 'll-005', username: 'unknown_user', name: '-', loginTime: '2026-06-26 09:22:11', ip: '203.195.88.19', location: '未知', browser: 'Firefox 126 / Windows 10', result: '失败', failReason: '用户名或密码错误' },
  { id: 'll-006', username: 'archive_admin', name: '档案管理员', loginTime: '2026-06-26 09:35:20', ip: '10.12.8.88', location: '广东省深圳市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
  { id: 'll-007', username: 'lindev', name: '林开发', loginTime: '2026-06-26 10:02:08', ip: '192.168.1.105', location: '广东省广州市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
  { id: 'll-008', username: 'zhangsj', name: '张设计', loginTime: '2026-06-26 10:15:44', ip: '10.12.11.56', location: '广东省深圳市', browser: 'Safari 17 / macOS', result: '失败', failReason: '账号已停用' },
  { id: 'll-009', username: 'liuwenqiang', name: '刘文强', loginTime: '2026-06-25 17:48:30', ip: '10.12.8.45', location: '广东省深圳市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
  { id: 'll-010', username: 'yaoyuandong', name: '姚远东', loginTime: '2026-06-25 16:22:05', ip: '10.12.9.102', location: '广东省深圳市', browser: 'Edge 124 / Windows 11', result: '成功', failReason: '' },
  { id: 'll-011', username: 'chenjing', name: '陈静', loginTime: '2026-06-25 14:10:18', ip: '172.16.3.28', location: '广东省深圳市', browser: 'Chrome 125 / macOS', result: '成功', failReason: '' },
  { id: 'll-012', username: 'test001', name: '-', loginTime: '2026-06-25 11:33:52', ip: '45.77.128.200', location: '未知', browser: 'Chrome 120 / Linux', result: '失败', failReason: '验证码错误' },
  { id: 'll-013', username: 'wangjianguo', name: '王建国', loginTime: '2026-06-24 08:55:41', ip: '58.248.112.66', location: '广东省深圳市', browser: 'Chrome 124 / Android', result: '成功', failReason: '' },
  { id: 'll-014', username: 'archive_admin', name: '档案管理员', loginTime: '2026-06-24 09:12:09', ip: '10.12.8.88', location: '广东省深圳市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
  { id: 'll-015', username: 'liuwenqiang', name: '刘文强', loginTime: '2026-06-24 18:05:22', ip: '10.12.8.45', location: '广东省深圳市', browser: 'Chrome 125 / Windows 10', result: '成功', failReason: '' },
]

/** 操作日志 */
export const operationLogList = [
  { id: 'ol-001', module: '用户管理', type: '修改', content: '修改用户「陈静」所属角色为「普通用户」', operator: '刘文强', operateTime: '2026-06-26 10:28:33', ip: '10.12.8.45', requestUrl: '/api/system/user/update', duration: 128, status: '成功' },
  { id: 'ol-002', module: '角色管理', type: '新增', content: '新增角色「监理单位」', operator: '刘文强', operateTime: '2026-06-26 10:15:02', ip: '10.12.8.45', requestUrl: '/api/system/role/create', duration: 95, status: '成功' },
  { id: 'ol-003', module: '质量管理', type: '导出', content: '导出质量检查记录（2026-06-01 ~ 2026-06-26）', operator: '姚远东', operateTime: '2026-06-26 09:52:18', ip: '10.12.9.102', requestUrl: '/api/quality/inspect/export', duration: 2340, status: '成功' },
  { id: 'ol-004', module: '安全管理', type: '新增', content: '新增劳务黑名单人员「李某」', operator: '姚远东', operateTime: '2026-06-26 09:40:55', ip: '10.12.9.102', requestUrl: '/api/safety/blacklist/create', duration: 156, status: '成功' },
  { id: 'ol-005', module: 'COC调度', type: '修改', content: '更新调度会议「6月26日晨会」参会人员', operator: '陈静', operateTime: '2026-06-26 09:22:41', ip: '172.16.3.28', requestUrl: '/api/coc/meeting/update', duration: 210, status: '成功' },
  { id: 'ol-006', module: '档案系统', type: '查询', content: '查询项目档案「T2航站楼扩建」目录', operator: '档案管理员', operateTime: '2026-06-26 09:08:17', ip: '10.12.8.88', requestUrl: '/api/archive/catalog/list', duration: 68, status: '成功' },
  { id: 'ol-007', module: '系统设置', type: '删除', content: '删除菜单「测试菜单」', operator: '刘文强', operateTime: '2026-06-25 17:35:09', ip: '10.12.8.45', requestUrl: '/api/system/menu/delete', duration: 82, status: '成功' },
  { id: 'ol-008', module: '用户管理', type: '新增', content: '新增外部单位用户「林开发」', operator: '刘文强', operateTime: '2026-06-25 16:48:22', ip: '10.12.8.45', requestUrl: '/api/system/user/create', duration: 145, status: '成功' },
  { id: 'ol-009', module: '角色管理', type: '修改', content: '调整角色「项目经理」数据权限为「指定项目」', operator: '刘文强', operateTime: '2026-06-25 15:20:33', ip: '10.12.8.45', requestUrl: '/api/system/role/update', duration: 112, status: '成功' },
  { id: 'ol-010', module: '质量管理', type: '审批', content: '审批通过质量整改单「QC-20260625-003」', operator: '姚远东', operateTime: '2026-06-25 14:55:47', ip: '10.12.9.102', requestUrl: '/api/quality/rectify/approve', duration: 189, status: '成功' },
  { id: 'ol-011', module: '安全管理', type: '导出', content: '导出考勤明细（三跑道项目）', operator: '王建国', operateTime: '2026-06-25 11:30:15', ip: '58.248.112.66', requestUrl: '/api/safety/attendance/export', duration: 3120, status: '成功' },
  { id: 'ol-012', module: 'COC调度', type: '新增', content: '发布调度任务单「DG-20260625-012」', operator: '陈静', operateTime: '2026-06-25 10:18:08', ip: '172.16.3.28', requestUrl: '/api/coc/notice/create', duration: 175, status: '成功' },
  { id: 'ol-013', module: '档案系统', type: '修改', content: '更新档案元数据「北货站施工日志」', operator: '档案管理员', operateTime: '2026-06-24 16:42:51', ip: '10.12.8.88', requestUrl: '/api/archive/metadata/update', duration: 203, status: '失败' },
  { id: 'ol-014', module: '系统设置', type: '登录', content: '用户登录系统', operator: '林开发', operateTime: '2026-06-24 10:02:08', ip: '192.168.1.105', requestUrl: '/api/auth/login', duration: 45, status: '成功' },
  { id: 'ol-015', module: '用户管理', type: '修改', content: '重置用户「张设计」登录密码', operator: '刘文强', operateTime: '2026-06-24 09:15:36', ip: '10.12.8.45', requestUrl: '/api/system/user/reset-password', duration: 98, status: '成功' },
]

const CURRENT_OPERATOR = '刘文强'

export function appendOperationLog({
  module,
  type,
  content,
  operator = CURRENT_OPERATOR,
  ip = '10.12.8.45',
  requestUrl = '',
  duration = 15,
  status = '成功',
}) {
  const operateTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  operationLogList.unshift({
    id: `ol-${Date.now()}`,
    module,
    type,
    content,
    operator,
    operateTime,
    ip,
    requestUrl,
    duration,
    status,
  })
}
