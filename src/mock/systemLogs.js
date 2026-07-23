/** 登录终端类型 */
export const loginTerminalOptions = [
  { label: '全部', value: '' },
  { label: 'Web端', value: 'Web端' },
  { label: 'App端', value: 'App端' },
]

/** 登录日志所属组织（筛选用） */
export const loginOrgOptions = [
  { label: '全部', value: '' },
  { label: '研究院', value: '研究院' },
  { label: '工程建设一体化平台/深圳机场指挥部/职能部门/规划建设部', value: '规划建设部' },
  { label: '工程建设一体化平台/深圳机场指挥部/职能部门/办公室', value: '办公室' },
  { label: '工程建设一体化平台/深圳机场指挥部/公司领导', value: '公司领导' },
]

const sampleUsers = [
  { name: '韦工', phone: '18111113333', loginAccount: 'weizong', orgName: '研究院' },
  { name: '杨光', phone: '13761838134', loginAccount: '202401', orgName: '研究院' },
  { name: '郭超', phone: '13666666666', loginAccount: 'admin', orgName: '研究院' },
  { name: '刘付生', phone: '13899999999', loginAccount: 'liufs', orgName: '规划建设部' },
  { name: '李畅', phone: '14469074474', loginAccount: 'qianglong', orgName: '规划建设部' },
  { name: '刘文强', phone: '13800131201', loginAccount: 'liuwenqiang', orgName: '公司领导' },
  { name: '姚远东', phone: '13900133302', loginAccount: 'yaoyuandong', orgName: '规划建设部' },
  { name: '陈静', phone: '13600138890', loginAccount: 'chenjing', orgName: '办公室' },
  { name: '视频中心用户', phone: '13888888888', loginAccount: 'videoAdmin', orgName: '规划建设部' },
]

const ipPool = [
  '183.14.133.38',
  '183.14.133.201',
  '183.14.133.56',
  '10.12.8.45',
  '10.12.9.102',
  '172.16.3.28',
  '58.248.112.66',
]

const terminalPool = ['Web端', 'Web端', 'Web端', 'App端']

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildLoginTime(dayOffset, hour, minute, second) {
  const base = new Date(2024, 9, 24)
  base.setDate(base.getDate() - dayOffset)
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

function generateLoginLogs() {
  const rows = []
  let seq = 1
  for (let day = 0; day < 27; day += 1) {
    for (let i = 0; i < 10; i += 1) {
      const user = sampleUsers[(day + i) % sampleUsers.length]
      const hour = 8 + ((i * 2 + day) % 10)
      const minute = (i * 7 + day * 3) % 60
      const second = (i * 11 + day * 5) % 60
      rows.push({
        id: `ll-${String(seq++).padStart(3, '0')}`,
        name: user.name,
        phone: user.phone,
        loginAccount: user.loginAccount,
        orgName: user.orgName,
        terminalType: terminalPool[(day + i) % terminalPool.length],
        ip: ipPool[(day + i) % ipPool.length],
        loginTime: buildLoginTime(day, hour, minute, second),
      })
    }
  }
  return rows.sort((a, b) => (a.loginTime < b.loginTime ? 1 : -1))
}

/** 登录日志 */
export const loginLogList = generateLoginLogs()

/** @deprecated 保留兼容 */
export const loginResultOptions = ['全部', '成功', '失败']

/** 操作类型选项 */
export const operationTypeOptions = ['全部', '数据字典列表', '用户登录信息', '项目结构返回树', '菜单列表', '角色授权', '用户查询', '新增', '修改', '删除', '导出']

/** 操作模块选项 */
export const operationModuleOptions = [
  '全部',
  '系统管理',
  '企业管理',
  '用户管理',
  '角色管理',
  'COC调度',
  '档案系统',
]

const operationModules = ['系统管理', '企业管理', '用户管理', '角色管理', 'COC调度']
const operationTypes = [
  '数据字典列表',
  '用户登录信息',
  '项目结构返回树',
  '菜单列表',
  '角色授权',
  '用户查询',
  '组织树查询',
  '岗位列表',
]

const operationIpPool = [
  '120.244.34.149',
  '183.14.133.38',
  '183.14.133.201',
  '10.12.8.45',
  '10.12.9.102',
  '172.16.3.28',
]

function buildOperationContent(orgName, operator, operateTime, type) {
  return `${orgName}下的${operator}于${operateTime}${type}`
}

function generateOperationLogs() {
  const rows = []
  let seq = 1
  for (let day = 0; day < 471; day += 1) {
    for (let i = 0; i < 10; i += 1) {
      const user = sampleUsers[(day + i) % sampleUsers.length]
      const module = operationModules[(day + i) % operationModules.length]
      const type = operationTypes[(day + i * 2) % operationTypes.length]
      const hour = 8 + ((i * 2 + day) % 10)
      const minute = (i * 7 + day * 3) % 60
      const second = (i * 11 + day * 5) % 60
      const operateTime = buildLoginTime(day % 90, hour, minute, second)
      rows.push({
        id: `ol-${String(seq++).padStart(5, '0')}`,
        operator: user.name === '刘文强' ? '系统管理员' : user.name,
        loginAccount: user.loginAccount,
        orgName: user.orgName === '规划建设部' ? '研究院' : user.orgName,
        operateTime,
        module,
        type,
        terminalType: terminalPool[(day + i) % terminalPool.length],
        ip: operationIpPool[(day + i) % operationIpPool.length],
        content: buildOperationContent(
          user.orgName === '规划建设部' ? '研究院' : user.orgName,
          user.name === '刘文强' ? '系统管理员' : user.name,
          operateTime,
          type,
        ),
      })
    }
  }
  return rows.sort((a, b) => (a.operateTime < b.operateTime ? 1 : -1))
}

/** 操作日志 */
export const operationLogList = generateOperationLogs()

const CURRENT_OPERATOR = '系统管理员'

export function appendOperationLog({
  module,
  type,
  content,
  operator = CURRENT_OPERATOR,
  loginAccount = 'liuwenqiang',
  orgName = '研究院',
  ip = '10.12.8.45',
  terminalType = 'Web端',
  requestUrl: _requestUrl,
  duration: _duration,
  status: _status,
}) {
  const operateTime = new Date()
    .toLocaleString('zh-CN', { hour12: false })
    .replace(/\//g, '-')
    .replace(',', '')
  operationLogList.unshift({
    id: `ol-${Date.now()}`,
    operator,
    loginAccount,
    orgName,
    operateTime,
    module,
    type,
    terminalType,
    ip,
    content: content || buildOperationContent(orgName, operator, operateTime, type),
  })
}

/** 系统日志级别 */
export const systemLogLevelOptions = [
  { label: '全部', value: '' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARN', value: 'WARN' },
  { label: 'ERROR', value: 'ERROR' },
]

const systemServices = [
  'ibuilds-consumer-adm-system',
  'ibuilds-gateway',
  'ibuilds-auth-service',
  'ibuilds-file-service',
  'ibuilds-job-service',
]

const infoMessages = [
  'Started ConsumerAdmSystemApplication in 134.74 seconds (process running for 150.344)',
  'No active profile set, falling back to 1 default profile: "default"',
  'Tomcat started on port(s): 8080 (http) with context path \'\'',
  'Initializing Spring embedded WebApplicationContext',
  'Completed initialization in 2847 ms',
  'HikariPool-1 - Start completed.',
]

const errorMessages = [
  '请求异常',
  'Connection refused: connect to redis://10.12.8.21:6379',
  'java.lang.NullPointerException: Cannot invoke method on null object',
  'Failed to execute SQL statement: duplicate key value violates unique constraint',
]

const warnMessages = [
  'Slow query detected: execution time 3200ms',
  'Retry attempt 2 for remote service call',
]

function buildSystemLogTime(dayOffset, hour, minute, second) {
  const base = new Date(2024, 9, 22)
  base.setDate(base.getDate() - dayOffset)
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

function generateSystemLogs() {
  const rows = []
  const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR']
  for (let i = 0; i < 27; i += 1) {
    const level = levels[i % levels.length]
    const service = systemServices[i % systemServices.length]
    const hour = 14 - (i % 5)
    const minute = (48 - i) % 60
    const second = (22 + i * 3) % 60
    let content = infoMessages[i % infoMessages.length]
    let stackTrace = '--'
    if (level === 'ERROR') {
      content = errorMessages[i % errorMessages.length]
      stackTrace =
        'java.lang.RuntimeException: 请求异常\n\tat com.ibuilds.system.controller.BaseController.handle(BaseController.java:86)\n\tat sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)'
    } else if (level === 'WARN') {
      content = warnMessages[i % warnMessages.length]
    }
    rows.push({
      id: `sl-${String(i + 1).padStart(3, '0')}`,
      serviceName: service,
      level,
      content,
      logTime: buildSystemLogTime(i % 7, hour < 0 ? hour + 24 : hour, minute < 0 ? minute + 60 : minute, second),
      stackTrace,
    })
  }
  return rows.sort((a, b) => (a.logTime < b.logTime ? 1 : -1))
}

/** 系统日志 */
export const systemLogList = generateSystemLogs()
