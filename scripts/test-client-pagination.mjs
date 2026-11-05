import assert from 'node:assert/strict'
import { ref, effectScope } from 'vue'
import { useClientPagination, sortTableRows } from '../src/composables/useClientPagination.js'
let passed=0
function test(name,run){try{run();passed++}catch(e){e.message=name+': '+e.message;throw e}}
const scope=effectScope(), source=ref(Array.from({length:53},(_,id)=>({id})))
let p;scope.run(()=>{p=useClientPagination(source)})
test('default ten records and actual total',()=>{assert.equal(p.rows.value.length,10);assert.equal(p.total.value,53)})
test('page two uses actual next slice',()=>{p.page.value=2;assert.equal(p.rows.value[0].id,10)})
test('twenty resets page and renders twenty',()=>{p.pageSize.value=20;assert.equal(p.page.value,1);assert.equal(p.rows.value.length,20)})
test('fifty uses actual fifty',()=>{p.pageSize.value=50;assert.equal(p.rows.value.length,50)})
test('last page has remaining records',()=>{p.page.value=2;assert.equal(p.rows.value.length,3)})
test('deleting last-page records clamps valid page',()=>{source.value.splice(50);assert.equal(p.page.value,1);assert.equal(p.total.value,50)})
test('filter replacement resets page and filtered total',()=>{p.pageSize.value=10;p.page.value=3;source.value=source.value.filter(x=>x.id<15);assert.equal(p.page.value,1);assert.equal(p.total.value,15)})
test('empty data preserves page one',()=>{source.value=[];assert.equal(p.page.value,1);assert.equal(p.rows.value.length,0)})
test('global numeric sort precedes slicing',()=>assert.deepEqual(sortTableRows([{n:20},{n:2},{n:11}],{prop:'n',order:'ascending'}).map(x=>x.n),[2,11,20]))
test('global descending string sort',()=>assert.deepEqual(sortTableRows([{n:'b'},{n:'a'}],{prop:'n',order:'descending'}).map(x=>x.n),['b','a']))
test('custom server sort stays with caller',()=>{const data=[{n:2},{n:1}];assert.equal(sortTableRows(data,{prop:'n',order:'ascending',column:{sortable:'custom'}}),data)})
test('custom client sort method retained',()=>assert.deepEqual(sortTableRows([{n:2},{n:1}],{prop:'n',order:'ascending',column:{sortMethod:(a,b)=>b.n-a.n}}).map(x=>x.n),[2,1]))
test('source order not mutated',()=>{const data=[{n:2},{n:1}];sortTableRows(data,{prop:'n',order:'ascending'});assert.equal(data[0].n,2)})
scope.stop();console.log(`Client pagination: ${passed} checks passed`)
