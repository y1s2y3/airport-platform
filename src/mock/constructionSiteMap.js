/** 深圳宝安国际机场周边 Mock 地图范围（仅 Demo 示意图坐标换算） */
export const MOCK_MAP_BOUNDS = {
  west: 113.78,
  east: 113.86,
  south: 22.61,
  north: 22.67,
}

const { west, east, south, north } = MOCK_MAP_BOUNDS

export function percentToLngLat(xPercent, yPercent) {
  const lng = west + ((east - west) * xPercent) / 100
  const lat = north - ((north - south) * yPercent) / 100
  return {
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
  }
}

export function lngLatToPercent(lng, lat) {
  const lngNum = Number(lng)
  const latNum = Number(lat)
  if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) {
    return null
  }
  const x = ((lngNum - west) / (east - west)) * 100
  const y = ((north - latNum) / (north - south)) * 100
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  }
}

export function formatConstructionSiteCoords(lng, lat) {
  const lngNum = Number(lng)
  const latNum = Number(lat)
  if (!Number.isFinite(lngNum) || !Number.isFinite(latNum)) return ''
  return `经度 ${lngNum.toFixed(6)}，纬度 ${latNum.toFixed(6)}`
}

export function parseCoordInput(value) {
  const num = Number(String(value ?? '').trim())
  return Number.isFinite(num) ? num : null
}

/** Mock 示意图区域，用于选点后自动带出地点名称 */
const MOCK_MAP_ZONES = [
  { name: 'T2航站区施工区域', x: 38, y: 42, radius: 14 },
  { name: 'T1航站区施工区域', x: 22, y: 58, radius: 14 },
  { name: '东航站区施工区域', x: 78, y: 28, radius: 14 },
  { name: '三跑道施工区域', x: 82, y: 72, radius: 16 },
  { name: '深圳机场扩建工程施工区域', x: 50, y: 50, radius: 100 },
]

export function resolveMockSiteName(lng, lat) {
  const pos = lngLatToPercent(lng, lat)
  if (!pos) return '深圳机场扩建工程施工区域'
  let hit = null
  let minDist = Infinity
  for (const zone of MOCK_MAP_ZONES) {
    const dx = pos.x - zone.x
    const dy = pos.y - zone.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= zone.radius && dist < minDist) {
      hit = zone
      minDist = dist
    }
  }
  return hit?.name || '深圳机场扩建工程施工区域'
}
