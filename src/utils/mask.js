/** 证件号 / 手机号脱敏（全模块统一出口） */

export function maskIdCard(id) {
  if (!id || id.length < 8) return id
  return `${id.slice(0, 6)}********${id.slice(-4)}`
}

export function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '—'
  if (phone.length === 11) return `${phone.slice(0, 3)}****${phone.slice(-4)}`
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`
}
