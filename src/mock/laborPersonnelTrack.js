import { REALNAME_ENTRY_STATUS } from '../constants/laborPersonStatus.js'
import { projectTree, getProjectLabel, getDefaultProjectId, getProjectPersonnel } from './laborRealName.js'

export { projectTree, getProjectLabel, getDefaultProjectId }

function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973
  return h
}

function buildTrackPerson(projectId, person, index) {
  const seed = hashSeed(person.id)
  const online = seed % 6 !== 0
  return {
    id: person.id,
    projectId,
    personnelNo: person.basic.personnelNo,
    name: person.basic.name,
    workType: person.unit.workType,
    unitName: person.unit.unitName,
    team: person.unit.team,
    online,
    position: {
      x: 18 + (seed % 60),
      y: 20 + ((seed * 7) % 55),
    },
    lastUpdate: online
      ? `2026-07-06 ${String(8 + (index % 10)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00`
      : '—',
  }
}

export function getProjectTrackPersonnel(projectId) {
  return getProjectPersonnel(projectId)
    .filter((p) => p.entryStatus === REALNAME_ENTRY_STATUS.ENTERED)
    .map((person, index) => buildTrackPerson(projectId, person, index))
}

function buildHistoryPoint(personId, date, index, total) {
  const seed = hashSeed(`${personId}-${date}-${index}`)
  const hour = 8 + Math.floor((index / total) * 9)
  const minute = (index * 13 + seed) % 60
  return {
    time: `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    x: 15 + ((seed + index * 11) % 65),
    y: 18 + ((seed * 3 + index * 9) % 58),
  }
}

export function getPersonnelTrackHistory(personnelId, date) {
  const total = 12 + (hashSeed(`${personnelId}-${date}`) % 8)
  return Array.from({ length: total }, (_, i) => buildHistoryPoint(personnelId, date, i, total))
}
