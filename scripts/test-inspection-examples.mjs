import assert from 'node:assert/strict'
import { emptyDay, clone, emptyCheck, validateHq, validatePerson, dayStats } from '../src/utils/dailyDispatchCheckRules.js'
import { canPopulateExample, createExampleDay, repairExampleDay, exampleValidationErrors, canPopulateReviewExample } from '../src/mock/dailyDispatchCheckExamples.js'
import { fullReviewExample, REVIEW_DATES } from '../src/mock/dailyDispatchUpgrade.js'
let passed=0
function test(name,run){try{run();passed++}catch(e){e.message=name+': '+e.message;throw e}}
const empty=()=>({...emptyDay('2026-10-20',[{id:'A',projectName:'A'}]),demo:true})
test('unused demo date is eligible',()=>assert.equal(canPopulateExample(empty()),true))
for(const [name,mutate]of [['submitted',d=>d.hq.version=1],['initialized',d=>d.dispatchDefaults={}],['personnel data',d=>d.people.A={duty:{name:'保留'}}],['unmarked real date',d=>d.demo=false],['existing inspection',d=>d.hq.rows[0].safety={type:'normal'}]])test(name+' never overwritten by examples',()=>{const d=empty();mutate(d);assert.equal(canPopulateExample(d),false)})
test('sample generation does not mutate input',()=>{const d=empty();createExampleDay(d,1,()=>[]);assert.equal(d.hq.version,0);assert.ok(!d.hq.rows[0].safety)})
test('eight distinct labelled examples',()=>assert.equal(new Set(Array.from({length:8},(_,i)=>createExampleDay(empty(),i,()=>[]).demoScenario)).size,8))
const projects=[{id:'A',projectName:'项目A'},{id:'B',projectName:'项目B'}]
const users=[{id:'dispatch',name:'安质部人员',status:true,scope:'dispatch'},{id:'inactive',name:'停用用户',status:false,scope:'dispatch'},{id:'member',name:'当前用户',status:true,scope:'A'}]
const getUsers=scope=>scope==='dispatch'?users.filter(user=>user.scope==='dispatch'):users
for(let scenario=0;scenario<8;scenario++)test('scenario '+scenario+' satisfies all current field and identity rules',()=>{
 const d=createExampleDay({...emptyDay('2026-10-20',projects),demo:true},scenario,getUsers)
 assert.deepEqual(exampleValidationErrors(d,getUsers),[]);assert.equal(validateHq(d.hq),'')
 for(const parts of Object.values(d.people))for(const part of Object.values(parts))assert.equal(validatePerson(part),'')
})
for(const date of REVIEW_DATES)test('full review '+date+' satisfies every problem image rule',()=>{
 const d=fullReviewExample(emptyDay(date,projects),projects,getUsers)
 assert.deepEqual(exampleValidationErrors(d,getUsers),[]);assert.equal(validateHq(d.hq),'')
 for(const parts of Object.values(d.people))for(const part of Object.values(parts))assert.equal(validatePerson(part),'')
})
const damaged=()=>{
 const d=fullReviewExample(emptyDay(REVIEW_DATES[0],projects),projects,getUsers)
 d.hq.rows[0].safety={...emptyCheck(),type:'problem',problems:[{text:'第一条',images:[]},{text:'第二条',images:[]}]}
 d.people.A.duty.check.problems[1].images=[];d.people.A.duty.userId='';d.people.A.duty.name='旧模拟姓名'
 d.people.A.manager.check.otherImages=[]
 return d
}
test('repairs all missing per-problem images and legacy demo identities without changing counts',()=>{
 const d=damaged(),before=JSON.stringify(d),stats=dayStats(d),r=repairExampleDay(d,getUsers)
 assert.ok(exampleValidationErrors(d,getUsers).length);assert.deepEqual(exampleValidationErrors(r,getUsers),[])
 assert.equal(JSON.stringify(d),before);assert.deepEqual(dayStats(r),stats)
 assert.equal(r.hq.rows[0].safety.problems[0].text,'第一条');assert.equal(r.people.A.duty.userId,'dispatch')
 assert.equal(r.hq.firstSubmittedAt,d.hq.firstSubmittedAt);assert.deepEqual(r.hq.rows.map(x=>[x.projectId,x.unified]),d.hq.rows.map(x=>[x.projectId,x.unified]))
 assert.deepEqual(repairExampleDay(r,getUsers),r)
})
test('repair protects actual HQ and project saves while fixing independent demo parts',()=>{
 const d=damaged();d.hq.operator={id:'real-user'};d.people.A.manager.operator={id:'real-user'}
 const before=clone(d),r=repairExampleDay(d,getUsers)
 assert.deepEqual(r.hq,before.hq);assert.deepEqual(r.people.A.manager,before.people.A.manager)
 assert.equal(validatePerson(r.people.A.duty),'')
})
test('a simulated-looking label alone never authorizes repair',()=>{
 const d=damaged();d.hq.operator=null;for(const parts of Object.values(d.people))for(const part of Object.values(parts))part.operator=null
 assert.deepEqual(repairExampleDay(d,getUsers),d)
})
test('an unavailable user directory never creates a fake valid identity',()=>{
 const d=damaged(),r=repairExampleDay(d,()=>[])
 assert.equal(r.people.A.duty.userId,'');assert.ok(exampleValidationErrors(r,()=>[]).length)
})
test('new review examples without enabled users do not fabricate submitted personnel',()=>{
 const d=fullReviewExample(emptyDay(REVIEW_DATES[0],projects),projects,()=>[])
 assert.equal(d.hq.headers.dispatcherId,'');assert.equal(d.hq.headers.dispatcher,'')
 assert.equal(Object.values(d.people).flatMap(Object.values).length,0);assert.deepEqual(exampleValidationErrors(d,()=>[]),[])
})
test('review initialization protects actual submissions and prepared drafts',()=>{
 assert.equal(canPopulateReviewExample(emptyDay(REVIEW_DATES[0],projects)),true)
 const d=damaged();assert.equal(canPopulateReviewExample(d),true);d.people.A.manager.operator={id:'real-user'};assert.equal(canPopulateReviewExample(d),false)
 delete d.people.A.manager;d.dispatchDefaults={};assert.equal(canPopulateReviewExample(d),false)
})

console.log(`Inspection example data: ${passed} checks passed`)
