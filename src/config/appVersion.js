/**
 * 应用版本与更新说明
 * - 格式：v1.0.2.x（x 从 0 起，每次 GitHub Pages 成功发布后 +1）
 * - 由 scripts/bump-pages-version.mjs 在发布流水线中递增 patch
 */

export const APP_VERSION_BASE = '1.0.2'

/** GitHub Pages 发布序号（从 0 开始；仓库内为「下一版」序号） */
export const APP_VERSION_PATCH = 3

export const APP_VERSION = `v${APP_VERSION_BASE}.${APP_VERSION_PATCH}`

/**
 * 更新说明（新版本写在数组前面）
 * highlights 宜短句，便于页头问号弹窗快速阅读
 */
export const VERSION_CHANGELOG = [
  {
    version: 'v1.0.2.2',
    date: '2026-07-27',
    highlights: [
      '品牌报审：台账/报审申请/品牌库与材料规格库；审批统一走个人中心待办',
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
