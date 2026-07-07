import { projectTree, getProjectLabel } from './laborRealName.js'

export { projectTree, getProjectLabel }

export const laborDeviceTypeOptions = ['考勤机设备', 'GPS定位设备']

const locations = ['东门', '西门', '生活区', '施工区A', '施工区B', '材料堆场', '1号门', '2号门']

const devicesByProject = {}

function seedDevices(projectId) {
  const seed = Number(projectId.replace(/\D/g, '')) || 0
  const list = []
  const attendanceCount = 3 + (seed % 3)
  const gpsCount = 4 + (seed % 4)

  for (let i = 0; i < attendanceCount; i += 1) {
    list.push({
      id: `${projectId}-att-${i + 1}`,
      projectId,
      name: `考勤机-${i + 1}`,
      deviceType: '考勤机设备',
      deviceNo: `ATT-${projectId}-${String(i + 1).padStart(3, '0')}`,
      location: locations[i % locations.length],
      online: i % 4 !== 0,
      bindPersonnel: i % 2 === 0 ? '' : `RN-${projectId.toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      updatedAt: `2026-07-05 ${String(9 + i).padStart(2, '0')}:20:00`,
    })
  }

  for (let i = 0; i < gpsCount; i += 1) {
    list.push({
      id: `${projectId}-gps-${i + 1}`,
      projectId,
      name: `GPS定位-${i + 1}`,
      deviceType: 'GPS定位设备',
      deviceNo: `GPS-${projectId}-${String(i + 1).padStart(3, '0')}`,
      location: locations[(i + 2) % locations.length],
      online: i % 5 !== 0,
      bindPersonnel: `RN-${projectId.toUpperCase()}-${String(i + 2).padStart(4, '0')}`,
      updatedAt: `2026-07-05 ${String(10 + i).padStart(2, '0')}:15:00`,
    })
  }

  devicesByProject[projectId] = list
  return list
}

export function getProjectLaborDevices(projectId) {
  if (!devicesByProject[projectId]) seedDevices(projectId)
  return devicesByProject[projectId].map((row) => ({ ...row }))
}

export function emptyLaborDeviceForm(source = {}) {
  return {
    name: source.name || '',
    deviceType: source.deviceType || '考勤机设备',
    deviceNo: source.deviceNo || '',
    location: source.location || '',
    online: source.online ?? true,
    bindPersonnel: source.bindPersonnel || '',
  }
}
