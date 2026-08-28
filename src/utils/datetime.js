/**
 * 统一日期时间工具。
 * 全项目 mock 需要「当前时间戳」时一律 import 本文件的 nowStr，禁止各模块各自实现 nowStr / nowStamp。
 */

/** 返回当前时间 YYYY-MM-DD HH:mm:ss（补零） */
export function nowStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
