/** 联系人字符串解析与格式化（姓名 / 电话） */

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
  const glued = text.match(/^(.+?)(\d{11})$/)
  if (glued) {
    return { name: glued[1].trim(), phone: glued[2] }
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
