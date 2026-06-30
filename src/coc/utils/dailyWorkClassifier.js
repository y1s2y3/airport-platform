const NOT_DANGER_KEYWORDS = ['不涉及危险作业', '不涉及', '/', '—', '-', '无']

/** 是否纳入高风险（危险）作业清单 */
export function isDangerWorkRecord(record) {
  const category = String(record?.dangerWorkCategory || '').trim()
  if (!category) return false
  return !NOT_DANGER_KEYWORDS.some((k) => category === k || category.includes(k))
}

/** 是否纳入危大工程清单 */
export function isMajorProjectRecord(record) {
  const category = String(record?.majorProjectCategory || '').trim()
  if (!category) return false
  return !NOT_DANGER_KEYWORDS.some((k) => category === k)
}

export function classifyDailyWorkRecord(record) {
  const danger = isDangerWorkRecord(record)
  const major = isMajorProjectRecord(record)
  let bucket = 'normal'
  if (danger && major) bucket = 'both'
  else if (danger) bucket = 'danger'
  else if (major) bucket = 'major'
  return { danger, major, bucket }
}

const CATEGORY_TYPE_MAP = {
  动火: '动火',
  动火作业: '动火',
  高处: '高处',
  高处作业: '高处',
  动土: '深基坑',
  动土作业: '深基坑',
  吊装: '起重吊装',
  吊装作业: '起重吊装',
  有限空间: '有限空间',
  有限空间作业: '有限空间',
  夜间: '夜间作业',
  夜间作业: '夜间作业',
  临时用电: '临时用电',
  临时用电作业: '临时用电',
}

export function mapDangerCategoryToType(category) {
  const text = String(category || '').trim()
  for (const [key, type] of Object.entries(CATEGORY_TYPE_MAP)) {
    if (text.includes(key)) return type
  }
  return '其他'
}

export function formatTimeRange(start, end) {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (!s && !e) return '—'
  const pickTime = (v) => {
    const m = v.match(/(\d{1,2}:\d{2})/)
    return m ? m[1] : v.slice(11, 16) || v
  }
  if (s && e) return `${pickTime(s)}-${pickTime(e)}`
  return s || e
}

export function bucketLabel(bucket) {
  return {
    danger: '高风险作业',
    major: '危大工程',
    both: '危险作业+危大',
    normal: '一般施工',
  }[bucket] || '一般施工'
}
