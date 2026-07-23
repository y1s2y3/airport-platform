<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const typeData = ref([
  { type:'高处坠落', updater:'张工', updateTime:'2026-07-28 10:00' },
  { type:'坍塌事故', updater:'李工', updateTime:'2026-07-25 14:30' },
  { type:'触电事故', updater:'王工', updateTime:'2026-07-20 09:15' },
  { type:'火灾事故', updater:'赵工', updateTime:'2026-07-18 16:40' },
  { type:'起重伤害', updater:'陈工', updateTime:'2026-07-15 11:00' },
  { type:'物体打击', updater:'张工', updateTime:'2026-07-12 14:00' },
])

const dialogVisible = ref(false)
const editingIndex = ref(-1)
const editForm = ref({ type: '' })

function addType() {
  editingIndex.value = -1; editForm.value = { type: '' }; dialogVisible.value = true
}
function editType(idx) {
  editingIndex.value = idx; editForm.value = { type: typeData.value[idx].type }; dialogVisible.value = true
}
function saveType() {
  if (!editForm.value.type.trim()) { ElMessage.warning('请输入风险类型'); return }
  if (editingIndex.value === -1) {
    typeData.value.push({ type: editForm.value.type.trim(), updater: '当前用户', updateTime: new Date().toISOString().slice(0,16).replace('T',' ') })
  } else {
    typeData.value[editingIndex.value].type = editForm.value.type.trim()
    typeData.value[editingIndex.value].updateTime = new Date().toISOString().slice(0,16).replace('T',' ')
  }
  dialogVisible.value = false
  ElMessage.success(editingIndex.value === -1 ? '新增成功' : '编辑成功')
}
function deleteType(idx) {
  ElMessageBox.confirm('确定删除风险类型「' + typeData.value[idx].type + '」？', '提示', { type: 'warning' }).then(() => {
    typeData.value.splice(idx, 1); ElMessage.success('已删除')
  }).catch(() => {})
}
function goBack() { router.push('/safety-inspection/risk') }
</script>

<template>
  <div class="tp">
    <div class="th">
      <el-button text @click="goBack">← 返回风险管理台账</el-button>
      <h1 class="tt">风险类型配置</h1>
    </div>
    <div class="tc">
      <div class="tbar"><span class="tsct">风险类型</span><button class="tadd" @click="addType">+ 新增</button></div>
      <table class="ttb">
        <thead><tr><th style="width:50px">序号</th><th>风险类型</th><th>更新人</th><th>更新时间</th><th style="width:120px">操作</th></tr></thead>
        <tbody>
          <tr v-for="(t,i) in typeData" :key="i"><td>{{ i+1 }}</td><td>{{ t.type }}</td><td>{{ t.updater }}</td><td>{{ t.updateTime }}</td><td><button class="tlk" @click="editType(i)">编辑</button><button class="tlk tld" style="margin-left:10px" @click="deleteType(i)">删除</button></td></tr>
        </tbody>
      </table>
    </div>

    <!-- 弹窗 -->
    <div v-if="dialogVisible" class="tdlg">
      <div class="tdlg-inner">
        <div class="tdlg-h">{{ editingIndex === -1 ? '新增风险类型' : '编辑风险类型' }}</div>
        <div class="tdlg-b">
          <label>风险类型 <i class="req">*</i></label>
          <input v-model="editForm.type" class="tfi" placeholder="请输入风险类型" />
        </div>
        <div class="tdlg-f">
          <button class="tbc" @click="dialogVisible=false">取消</button>
          <button class="tbs" @click="saveType">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tp { padding:0; }
.th { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.tb { background:none; border:1px solid #ddd; border-radius:6px; padding:4px 12px; font-size:13px; color:#666; cursor:pointer; }
.tb:hover { color:#8f0045; border-color:#8f0045; }
.tt { font-size:20px; font-weight:600; color:#1f2329; margin:0; }
.tc { background:#fff; border:1px solid #e8e8e8; border-radius:8px; padding:16px 20px; }
.tbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.tsct { font-size:14px; font-weight:600; color:#1f2329; padding-left:10px; border-left:3px solid #8f0045; }
.tadd { padding:4px 12px; border:none; border-radius:4px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
.ttb { width:100%; border-collapse:collapse; font-size:13px; }
.ttb thead th { background:#f8f9fa; color:#495057; font-weight:500; padding:8px 10px; text-align:left; border-bottom:1px solid #e8e8e8; }
.ttb tbody td { padding:8px 10px; border-bottom:1px solid #f2f2f2; color:#1f2329; }
.ttb tbody tr:last-child td { border-bottom:none; }
.tlk { background:none; border:none; color:#4285f4; font-size:13px; cursor:pointer; padding:0; }
.tld { color:#e53935; }
.tdlg { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:2000; }
.tdlg-inner { background:#fff; border-radius:8px; padding:20px 24px; width:380px; }
.tdlg-h { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:16px; }
.tdlg-b { margin-bottom:16px; }
.tdlg-b label { display:block; font-size:13px; color:#333; margin-bottom:6px; }
.req { color:#e53935; font-style:normal; margin-left:2px; font-weight:600; }
.tfi { width:100%; padding:8px 10px; border:1px solid #ddd; border-radius:4px; font-size:13px; box-sizing:border-box; }
.tdlg-f { display:flex; gap:10px; justify-content:flex-end; }
.tbc { padding:7px 20px; border:1px solid #ddd; border-radius:4px; background:#fff; font-size:13px; color:#666; cursor:pointer; }
.tbs { padding:7px 20px; border:none; border-radius:4px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
</style>
