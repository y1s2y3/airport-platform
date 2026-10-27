import { getDemoInspectionPeople, inspectionPeoplePool } from './inspectionPeople.js'
import { getHazardIssueProjectOptions } from '../utils/hazardIssueSummary.js'

export function getSamplingPeople(projectKey) {
  const project = getHazardIssueProjectOptions().find(item => item.key === projectKey)
  if (!project) return []
  const people = getDemoInspectionPeople(project.masterId)
  const candidates = [people.reviewer, people.inspector, people.rectifier, ...inspectionPeoplePool.filter(person => person.role.includes('监理')), { id:`sampling-manager:${projectKey}`, name:people.manager, role:'项目经理' }]
  return [...new Map(candidates.map(person => [person.id, { ...person, label:`${person.name}（${project.label}-${person.role}）` }])).values()]
}
export function getSamplingManager(projectKey) {
  return getSamplingPeople(projectKey).find(person => person.id === `sampling-manager:${projectKey}`)
}
