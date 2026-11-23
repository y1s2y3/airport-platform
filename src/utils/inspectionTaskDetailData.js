import { checkCategoryTree } from '../composables/useInspectionPlan.js'

// ===== mt-002 检查结果（任务下发·有隐患） =====
const pushHazardTree = [
  { id:'cat-2', label:'临时用电',
    items:[
      { id:'item-2-1', label:'TN-S系统是否完整设置', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-2', label:'重复接地电阻值是否符合要求', result:'hazard', desc:'实测值15Ω，规范要求≤10Ω', photos:['📷 巡检照片1'] },
      { id:'item-2-3', label:'电缆线路是否采取埋地或架空敷设', result:'hazard', desc:'存在沿地明敷现象', photos:['📷 巡检照片2'] },
    ]},
  { id:'cat-3', label:'高处作业',
    items:[
      { id:'item-3-1', label:'临边防护是否到位', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-3-2', label:'安全带是否正确使用', result:'normal', photos:['📷 巡检照片1'] },
    ]},
  { id:'cat-4', label:'脚手架工程',
    items:[
      { id:'item-4-1', label:'脚手架施工方案是否经审批', result:'normal', photos:['📷 巡检照片1'] },
    ]},
]

// ===== mt-003 检查结果（任务下发·全部正常） =====
const pushNormalTree = [
  { id:'cat-2', label:'临时用电',
    items:[
      { id:'item-2-1', label:'TN-S系统是否完整设置', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-2', label:'重复接地电阻值是否符合要求', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-2-3', label:'电缆线路是否采取埋地或架空敷设', result:'normal', photos:['📷 巡检照片2'] },
    ]},
  { id:'cat-3', label:'高处作业',
    items:[
      { id:'item-3-1', label:'临边防护是否到位', result:'normal', photos:['📷 巡检照片1'] },
      { id:'item-3-2', label:'安全带是否正确使用', result:'normal', photos:['📷 巡检照片1'] },
    ]},
  { id:'cat-4', label:'脚手架工程',
    items:[
      { id:'item-4-1', label:'脚手架施工方案是否经审批', result:'normal', photos:['📷 巡检照片1'] },
    ]},
]

export function getInspectionTaskCheckGroups(task) {
  if (task.checkConfig?.length) {
    return task.checkConfig.map(config => {
      const category = checkCategoryTree.find(item => item.id === config.categoryId)
      return category
        ? {
            id: category.id,
            label: category.label,
            inspectionCategory: category.inspectionCategory,
            items: category.items.filter(item => config.itemIds.includes(item.id)),
          }
        : null
    }).filter(Boolean)
  }
  if (task.id === 'mt-003') return pushNormalTree.map((category) => ({ ...category, inspectionCategory: '安全' }))
  if (task.id === 'mt-002') return pushHazardTree.map((category) => ({ ...category, inspectionCategory: '安全' }))
  return []
}

export function getMajorHazardPatrolDetail(task) {
  if (task.status !== '已完成' && !task.majorHazardLedgerId) return '移动端执行时选择'
  return task.isMajorHazardPatrol === '是' ? '是' : '否'
}

export function getMajorHazardSyncDetail(task) {
  if (task.isMajorHazardPatrol !== '是') return ''
  return task.status === '已完成' ? '已自动同步至危大工程现场巡视台账' : '完成巡检后自动同步至危大工程现场巡视台账'
}

export function getManagerConfirmationDetail(task) {
  if (task.result !== 'hazard') return ''
  if (typeof task.requiresManagerConfirmation !== 'boolean') return '未记录'
  return task.requiresManagerConfirmation ? '是' : '否'
}
