/**
 * 应用版本与更新说明
 * - 格式：v1.0.3.x（x 从 0 起，每次 GitHub Pages 成功发布后 +1）
 * - 由 scripts/bump-pages-version.mjs 在发布流水线中递增 patch
 */

export const APP_VERSION_BASE = '1.0.3'

/** GitHub Pages 发布序号（从 0 开始；仓库内为「下一版」序号） */
export const APP_VERSION_PATCH = 4

export const APP_VERSION = `v${APP_VERSION_BASE}.${APP_VERSION_PATCH}`

/**
 * 更新说明（新版本写在数组前面）
 * highlights 宜短句，便于页头问号弹窗快速阅读
 */
export const VERSION_CHANGELOG = [
  {
    version: 'v1.0.3.3',
    date: '2026-08-05',
    highlights: [
      '任务单/提示函：详情改为两列展示（编号、状态、下发时间等）；去掉查阅；仅「待下发」可编辑/作废',
      '监理会议：纪要/隐患清单上传按钮与提示文案优化；清单解析成功/失败提示更清晰',
      '调度隐患：清单详情截图/整改照片缩略图入表单；个人中心补充整改/验收待办与已办演示数据',
      '调度隐患：项目级种子（每项目待整改/待验收/已关闭各 1 条）；整改验收走个人中心待办',
      '个人中心列表去掉「业务类型」列；操作留痕不再展示提交整改的照片文件名',
    ],
  },
  {
    version: 'v1.0.3.2',
    date: '2026-08-04',
    highlights: [
      '优化处罚单详情：管理端与个人中心统一分区折叠展示上报、申诉、验收与关闭信息',
      '补充处罚单各状态演示数据（含手动关闭），便于前端对照开发',
      'COC 指挥部/项目首页隐藏巡检对讲设备栏，视频监控改为九宫格展示',
    ],
  },
  {
    version: 'v1.0.3.1',
    date: '2026-07-29',
    highlights: [
      '监理会议：纪要合并为必填「监理例会纪要」（Word/PDF）；新增必填「本周隐患清单」（xlsx 模板）',
      '监理隐患清单：取消下发与整改验收；状态仅待整改/已关闭；仅指挥部可确认关闭',
      'COC 隐患详情：新增单号类型（调度隐患/监理会议隐患）；监理会议隐患可确认关闭',
      'COC 弹层去半透明：拖拽浮层、会议浮窗、红黑榜与 Dialog 改为实色底',
      'HTML 打包默认输出单文件（后台+内嵌 COC）',
    ],
  },
  {
    version: 'v1.0.2.2',
    date: '2026-07-28',
    highlights: [
      '材料进场管理：看板/台账/申请/退场/标准库；审批走个人中心待办',
      '设备进场管理：看板/台账/申请（含开箱清单）；无定样开关与材料共用',
      '品牌报审：台账/报审申请/品牌库与材料规格库均为项目级；审批统一走个人中心待办',
      '巡检仪注册：新增必填设备账号、设备密码，并关闭浏览器自动填充',
      '领导讲话会议列表：九宫格合并为大画面；声音/全屏改到设备列表',
    ],
  },
  {
    version: 'v1.0.2.1',
    date: '2026-07-23',
    highlights: [
      '登记监理会议：召开日期下新增「项目经理/负责人参会」「项目部长/副部长参会」',
      '两字段支持手填，上传纪要后仍可自动带出并修正',
    ],
  },
  {
    version: 'v1.0.2.0',
    date: '2026-07-23',
    highlights: [
      '页头展示版本号，点击「?」可查看本版更新说明',
      '演示站改由 GitHub Pages 发布，国内网络可直接访问',
      '修复日志模块页面被 gitignore 误忽略，导致线上构建失败',
      '机械设备 / 危大工程菜单与演示能力持续完善',
    ],
  },
]

export function getChangelogByVersion(version = APP_VERSION) {
  return VERSION_CHANGELOG.find((item) => item.version === version) || VERSION_CHANGELOG[0] || null
}

/**
 * 仅返回已上线发布的更新记录。
 * 仓库内 APP_VERSION 为「下一版」序号，对应条目若已预写也不展示。
 */
export function getPublishedChangelogs() {
  return VERSION_CHANGELOG.filter((item) => item.version !== APP_VERSION)
}
