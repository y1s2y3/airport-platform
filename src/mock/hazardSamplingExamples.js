/** 只引用原台账单据的演示场景；不改变原单据的业务状态。 */
import { getSamplingPeople } from './samplingPeople.js'
export const SAMPLING_EXAMPLE_VERSION = 6

export function buildSamplingExamples(rows, projects, eligible, reviewedAt) {
  const tasks = []
  const history = []
  const baseTime = new Date()
  baseTime.setHours(9, 0, 0, 0)
  const at = minutes => new Date(baseTime.getTime() - (24 * 60 - minutes) * 60000).toISOString()
  let order = 0
  function log(row, stage, result, task, note, time, explicitId = '') {
    const id = explicitId || `EX-JL-${row.projectKey}-${++order}`
    const person = stage === 'hq' ? '指挥部检查人' : stage === 'supervisor' ? '责任监理' : '项目经理'
    const file = { id: `${id}-file`, name: `${stage === 'hq' ? '抽检' : '复查'}支撑材料_示例.png`, example: { title: row.title, number: row.originalNo, person, result, time } }
    const entry = { id, rowId: row.id, projectKey: row.projectKey, stage, taskId: task?.id || '', person, time, result, note: `【示例】${note}`, files: [file], completed: stage === 'manager', example: true }
    history.push(entry)
    if (task) task.results[row.id] = id
    return entry
  }
  function task(stage, project, pool, ids, batchId, scenario, time) {
    const dates = pool.map(reviewedAt).filter(Boolean).map(value => value.slice(0, 10)).sort()
    const entry = { id: `EX-${stage === 'supervisor' ? 'CJ' : 'FC'}-${project.key}-${scenario}`, stage, projectKey: project.key, projectName: project.label, batchId, start: dates[0] || time.slice(0, 10), end: dates.at(-1) || time.slice(0, 10), poolIds: pool.map(row => row.id), ids: [...ids], results: {}, recipient: stage === 'supervisor' ? '责任监理' : '项目经理', createdAt: time, submittedAt: '', discrepancy: false, resolution: '', example: true, exampleRule: { days: dates.length ? Math.ceil((new Date(dates.at(-1)) - new Date(dates[0])) / 86400000) + 1 : 1, percent: 30, minimum: Math.min(3, pool.length) } }
    tasks.push(entry)
    return entry
  }
  for (const project of projects.filter(item => item.masterId)) {
    const pool = rows.filter(row => row.projectKey === project.key && eligible(row))
    if (pool.length < 2) continue
    const fail = pool[Math.min(2, pool.length - 1)]
    const pass = pool[pool.length >= 3 ? 1 : 0]
    const sample = [fail, ...pool.filter(row => row.id !== fail.id)].slice(0, Math.min(3, pool.length))
    const rotated = [sample.at(-1), ...sample.slice(0, -1)]
    const sampleIds = rotated.map(row => row.id)
    // 未复核单不写指挥部历史；通过单、不通过单分别保持最新判定。
    log(pass, 'hq', '合格', null, '整改前后照片齐全，现场防护及复查意见一致。', at(1))
    const scenarios = ['pending', 'progress', 'ready', 'manager-progress', 'manager-ready', 'complete', 'difference', 'resolved']
    scenarios.forEach((scenario, index) => {
      const time = at(index * 120 + 5)
      const target = scenario === 'resolved' ? pass : fail
      const ids = scenario === 'resolved' ? [pass.id, ...sampleIds.filter(id => id !== pass.id)] : sampleIds
      const batchId = `EX-PC-${project.key}-${scenario}`
      log(target, 'hq', '不合格', null, '现场整改与原复查记录不一致，需开展监理重新复查。', time).roundId = batchId
      if (scenario === 'complete') log(pass, 'hq', '不合格', null, '原整改照片缺少关键部位，现场防护措施落实情况无法核实，要求重新复查并补充支撑照片。', time, `EX-HQ-SUPPLEMENT-${project.key}-complete`).roundId = batchId
      const supervisor = task('supervisor', project, pool, ids, batchId, scenario, time)
      if (scenario === 'pending') return
      if (scenario === 'progress') {
        const first = pool.find(row => row.id === ids.find(id => id !== fail.id))
        log(first, 'supervisor', '合格', supervisor, '已核对原整改照片及现场情况，符合要求；其余单据待逐项复查。', at(index * 120 + 15))
        return
      }
      for (const id of ids) {
        const row = pool.find(item => item.id === id)
        const result = ['difference', 'resolved'].includes(scenario) || id !== fail.id ? '合格' : '不合格'
        log(row, 'supervisor', result, supervisor, result === '不合格' ? '复查发现现场措施未落实到位，已记录问题证据。' : '已重新核对整改措施与现场，复查合格。', at(index * 120 + 20))
      }
      if (scenario !== 'ready') supervisor.submittedAt = at(index * 120 + 30)
      if (['difference', 'resolved'].includes(scenario)) {
        supervisor.discrepancy = true
        if (scenario === 'resolved') {
          supervisor.resolution = '【示例】核对后续现场照片及时间，确认监理复查前已完成线下整改，差异核查完成。'
          log(pass, 'hq', '合格', null, '核查补充证据后确认整改到位，本轮差异已处理。', at(index * 120 + 40)).roundId = batchId
        }
        return
      }
      const manager = task('manager', project, pool, pool.map(row => row.id), batchId, scenario, at(index * 120 + 25))
      if (scenario === 'ready') return
      const checked = scenario === 'manager-progress' ? pool.slice(0, 1) : pool
      for (const row of checked) log(row, 'manager', '合格', manager, '已完成全面复查；发现问题已在线下整改完成，现场支撑照片已上传。', at(index * 120 + 50))
      if (scenario === 'complete') manager.submittedAt = at(index * 120 + 60)
    })
    const quality = pool.find(row => row.source === 'externalQuality')
    if (quality) {
      log(quality, 'hq', '不合格', null, '抽查发现现场防护措施未落实，要求重新核查。', at(5 * 120 + 5), `EX-HQ-QUALITY-${project.key}-fail`).roundId = `EX-PC-${project.key}-complete`
      log(quality, 'hq', '合格', null, '复核后续整改照片及现场记录，确认整改到位。', at(7 * 120 + 40), `EX-HQ-QUALITY-${project.key}-pass`).roundId = `EX-PC-${project.key}-resolved`
    }
  }
  return { tasks, history }
}

/** 新流程的示例独立编号追加，已有手工任务和旧场景保持不变。 */
export function buildManualSamplingExamples(rows, projects) {
  const tasks=[],history=[]
  const now=new Date();now.setHours(9,0,0,0)
  for(const project of projects.filter(item=>item.masterId)){
    const pool=rows.filter(row=>row.projectKey===project.key&&/^\d{4}-\d{2}-\d{2}/.test(row.registeredAt))
    if(pool.length<2)continue
    const origin=pool.find(row=>row.status==='待整改')||pool[0]
    const dates=pool.map(row=>row.registeredAt.slice(0,10)).sort()
    const percent=Math.max(30,Math.ceil(200/pool.length)),count=Math.ceil(pool.length*percent/100)
    const other=pool.filter(row=>row.id!==origin.id)
    const ids=[origin.id,...other.slice(0,count-1).map(row=>row.id)]
    for(const [index,scenario] of ['progress','complete'].entries()){
      const batchId=`EX-MANUAL-PC-${project.key}-${scenario}`,id=`EX-MANUAL-CJ-${project.key}-${scenario}`
      const people=getSamplingPeople(project.key),person=people[index%people.length]
      const time=new Date(now.getTime()+index*60000).toISOString()
      const task={id,stage:'supervisor',projectKey:project.key,projectName:project.label,batchId,start:dates[0],end:dates.at(-1),poolIds:pool.map(row=>row.id),ids:[...ids],results:{},recipient:person.label,assigneeId:person.id,assigneeName:person.name,sender:'指挥部检查人',percent,rangeBasis:'登记时间',originRowId:origin.id,createdAt:time,submittedAt:'',discrepancy:false,resolution:'',example:true}
      history.push({id:`${id}-hq`,roundId:batchId,rowId:origin.id,projectKey:project.key,stage:'hq',taskId:'',person:'指挥部检查人',time,result:'不合格',note:'【示例】发现现场防护与原记录不一致，按登记日期选取检查范围并下发指定人员。',files:[],dispatch:true,example:true})
      const checked=scenario==='progress'?ids.filter(rowId=>rowId!==origin.id).slice(0,1):ids
      checked.forEach((rowId,number)=>{const logId=`${id}-review-${number}`,reviewTime=new Date(now.getTime()+(index+1)*60000+number*1000).toISOString();history.push({id:logId,roundId:batchId,rowId,projectKey:project.key,stage:'supervisor',taskId:id,person:person.label,time:reviewTime,result:'合格',note:'【示例】已核对现场和整改资料，符合要求。',files:[],example:true});task.results[rowId]=logId;if(scenario==='complete')task.submittedAt=reviewTime})
      if(scenario==='complete')task.discrepancy=true
      tasks.push(task)
    }
    history.push({id:`EX-MANUAL-NO-DISPATCH-${project.key}`,roundId:`EX-MANUAL-NO-DISPATCH-${project.key}`,rowId:other[0].id,projectKey:project.key,stage:'hq',taskId:'',person:'指挥部检查人',time:now.toISOString(),result:'不合格',note:'【示例】现场资料尚需补充，本次仅登记抽查结果，选择不下发任务。',files:[],dispatch:false,example:true})
  }
  return {tasks,history}
}

export function buildAssignedReviewExamples(rows, projects) {
  const templates=buildManualSamplingExamples(rows,projects).tasks.filter(task=>task.id.endsWith('-progress'))
  const tasks=[],history=[],index=new Map(rows.map(row=>[row.id,row]))
  const now=new Date();now.setHours(9,3,0,0)
  for(const template of templates){
    const person=getSamplingPeople(template.projectKey).find(item=>item.id!==template.assigneeId&&item.role!=='项目经理')
    if(!person)continue
    const batchId=`EX-SELECTED-PC-${template.projectKey}`,id=`EX-SELECTED-CJ-${template.projectKey}`,followId=`EX-SELECTED-FC-${template.projectKey}`
    const primary={...template,id,batchId,results:{},submittedAt:'',createdAt:now.toISOString()}
    const follow={...primary,id:followId,parentTaskId:id,stage:'manager',ids:[...primary.poolIds],percent:100,assigneeId:person.id,assigneeName:person.name,recipient:person.label,sender:primary.recipient,results:{},createdAt:new Date(now.getTime()+60000).toISOString()}
    history.push({id:`${id}-hq`,roundId:batchId,rowId:primary.originRowId,projectKey:primary.projectKey,stage:'hq',taskId:'',person:'指挥部检查人',time:primary.createdAt,result:'不合格',note:'【示例】按登记时间范围下发抽检。',files:[],dispatch:true,example:true})
    primary.ids.forEach((rowId,number)=>{
      const failed=rowId===primary.originRowId,logId=`${id}-review-${number}`,time=new Date(now.getTime()+60000+number*1000).toISOString()
      history.push({id:logId,roundId:batchId,rowId,projectKey:primary.projectKey,stage:'supervisor',taskId:id,person:primary.recipient,time,result:failed?'不合格':'合格',note:failed?`【示例】发现防护不到位，已选择${person.name}进行原时间范围的全面复查。`:'【示例】已核对现场与整改资料，符合要求。',files:[],...(failed?{reviewAssigneeId:person.id,reviewRecipient:person.label,reviewTaskId:followId}:{}),example:true})
      primary.results[rowId]=logId;primary.submittedAt=time
    })
    const row=index.get(follow.ids[0]),time=new Date(now.getTime()+120000).toISOString(),logId=`${followId}-review`
    const file={id:`${logId}-photo`,name:'全面复查支撑_示例.png',example:{title:row.title,number:row.originalNo,person:person.label,result:'合格',time}}
    history.push({id:logId,roundId:batchId,rowId:row.id,projectKey:primary.projectKey,stage:'manager',taskId:followId,person:person.label,time,result:'合格',note:'【示例】已现场复查并完成线下整改，支撑照片已上传，其余单据继续办理。',files:[file],completed:true,example:true})
    follow.results[row.id]=logId;tasks.push(primary,follow)
  }
  return {tasks,history}
}
