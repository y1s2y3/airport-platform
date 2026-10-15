/**
 * 建管 APP 版本检查（原型 Mock）
 *
 * 演示口径：
 * - 固定返回「存在可更新版本」＝当前版本号 patch +1（发布递增后自动跟随，不会出现倒挂）
 * - 更新内容为下一版的计划说明；不请求真实版本服务
 * - 下载更新为模拟：正式环境应下载安装包或跳转应用商店
 */
import { APP_VERSION, APP_VERSION_BASE, APP_VERSION_PATCH } from '../config/appVersion.js'

export const DEMO_LATEST_VERSION = `v${APP_VERSION_BASE}.${APP_VERSION_PATCH + 1}`
export const DEMO_LATEST_RELEASE_DATE = '2026-10-13'
export const DEMO_PACKAGE_NAME = `建管APP-${DEMO_LATEST_VERSION}.apk`
export const DEMO_PACKAGE_SIZE = '28.6 MB'

/** 下一版更新内容 */
export const DEMO_LATEST_RELEASE_NOTES = [
  'Web 端新增平台登录页（账号登录 + 记住账号）',
  '顶栏用户名下拉支持「修改密码」「退出登录」，修改密码后需用新密码重新登录',
  'Web 端与建管 APP 登录页下线「忘记密码」入口，登录密码改由管理员在「系统管理 → 用户管理」中重置',
  '「我的」页新增「版本检查」「密码修改」入口',
  '补齐 APP 内巡检、整改子页路由，点击子页不再跳出 APP',
]

/**
 * 检查更新
 * @returns {{ ok: boolean, hasUpdate: boolean, currentVersion: string, latestVersion: string,
 *   releaseDate: string, releaseNotes: string[], packageName: string, packageSize: string }}
 */
export function checkAppUpdate() {
  return {
    ok: true,
    hasUpdate: true,
    currentVersion: APP_VERSION,
    latestVersion: DEMO_LATEST_VERSION,
    releaseDate: DEMO_LATEST_RELEASE_DATE,
    releaseNotes: [...DEMO_LATEST_RELEASE_NOTES],
    packageName: DEMO_PACKAGE_NAME,
    packageSize: DEMO_PACKAGE_SIZE,
  }
}
