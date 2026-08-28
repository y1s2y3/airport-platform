/** 联系人字符串解析与格式化（姓名 / 电话；禁止粘连存储） */

/** 是否为「姓名+11位手机号」粘连格式（不允许） */
export function isGluedContactFormat(raw) {
  const text = String(raw || '').trim()
  if (!text || /\//.test(text)) return false
  return /^(.+?)(\d{11})$/.test(text)
}

/** 存储串是否合规：须含「 / 」分隔且姓名、电话均可解析 */
export function isValidContactStorageFormat(raw) {
  const text = String(raw || '').trim()
  if (!text) return true
  if (isGluedContactFormat(text)) return false
  if (!/\s*\/\s*/.test(text)) return false
  const { name, phone } = parseOneContact(text)
  return Boolean(name && phone)
}

export function parseOneContact(raw) {
  const text = String(raw || '').trim()
  if (!text) return { name: '', phone: '' }
  const slashParts = text.split(/\s*\/\s*/)
  if (slashParts.length >= 2) {
    const phone = slashParts[slashParts.length - 1].trim()
    if (/\d{7,}/.test(phone)) {
      return {
        name: slashParts.slice(0, -1).join(' / ').trim(),
        phone,
      }
    }
  }
  return { name: text, phone: '' }
}

export function parseContacts(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  return text
    .split(/[；;、，,\n]+/)
    .map((part) => parseOneContact(part))
    .filter((item) => item.name || item.phone)
}

export function formatContact(name, phone) {
  const nextName = String(name || '').trim()
  const nextPhone = String(phone || '').trim()
  if (!nextName && !nextPhone) return ''
  if (!nextPhone) return nextName
  if (!nextName) return nextPhone
  return `${nextName} / ${nextPhone}`
}
