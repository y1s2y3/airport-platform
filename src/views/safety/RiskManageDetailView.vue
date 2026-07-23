<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const allData = {
  '2026-07': {
    info: { month:'2026-07', planStart:'2026-07-01', planEnd:'2026-07-31', actualStart:'2026-07-01', actualEnd:'2026-07-30', overdue:'否', status:'本月管控完毕', reporter:'张工', reportTime:'2026-07-31 14:30' },
    items: [
      { type:'高处坠落', spot:'航站楼屋顶檩条安装', level:'重大风险', desc:'高空作业未设置生命线，作业人员安全带挂点不足', measure:'设置通长生命线，每名作业人员配备双钩安全带' },
      { type:'坍塌事故', spot:'航站楼中心区高支模', level:'重大风险', desc:'高支模搭设高度超过8m，未编制专项方案', measure:'编制专项施工方案并组织专家论证' },
      { type:'触电事故', spot:'航站楼东侧临时用电', level:'一般风险', desc:'电缆线路沿地明敷未做保护', measure:'电缆埋地敷设或架空保护' },
    ]
  },
  '2026-06': {
    info: { month:'2026-06', planStart:'2026-06-01', planEnd:'2026-06-30', actualStart:'2026-06-02', actualEnd:'2026-06-28', overdue:'否', status:'本月管控完毕', reporter:'李工', reportTime:'2026-06-30 10:00' },
    items: [
      { type:'火灾事故', spot:'宿舍楼电焊作业区', level:'一般风险', desc:'电焊作业区堆放易燃材料', measure:'清理易燃物，配备灭火器' },
    ]
  },
  '2026-08': {
    info: { month:'2026-08', planStart:'2026-08-01', planEnd:'2026-08-31', actualStart:'', actualEnd:'', overdue:'否', status:'待开始', reporter:'赵工', reportTime:'2026-07-28 16:00' },
    items: []
  },
  '2026-05': {
    info: { month:'2026-05', planStart:'2026-05-01', planEnd:'2026-05-31', actualStart:'2026-05-01', actualEnd:'2026-06-05', overdue:'是', status:'本月管控完毕', reporter:'陈工', reportTime:'2026-06-05 11:20' },
    items: [
      { type:'起重伤害', spot:'跑道北端吊装区', level:'重大风险', desc:'吊装作业未设置警戒区', measure:'设置警戒区，专人指挥' },
      { type:'触电事故', spot:'跑道南侧临时用电', level:'一般风险', desc:'电缆破损外露', measure:'更换破损电缆' },
    ]
  },
}

const record = allData[id]
const info = record?.info || allData['2026-07'].info
const items = record?.items || []

function goBack() { router.push('/safety-inspection/risk') }
</script>

<template>
  <div class="dp">
    <div class="dh">
      <el-button text @click="goBack">← 返回风险管理台账</el-button>
      <h1 class="dt">风险管控详情</h1>
    </div>

    <div class="dc">
      <div class="dct">基本信息</div>
      <div class="dgrid">
        <div class="drow"><label>计划月份</label><span>{{ info.month }}</span></div>
        <div class="drow"><label>计划开始</label><span>{{ info.planStart }}</span></div>
        <div class="drow"><label>计划结束</label><span>{{ info.planEnd }}</span></div>
        <div class="drow"><label>实际开始</label><span>{{ info.actualStart || '-' }}</span></div>
        <div class="drow"><label>实际结束</label><span>{{ info.actualEnd || '-' }}</span></div>
        <div class="drow"><label>是否逾期</label><span :style="{color:info.overdue==='是'?'#f56c6c':'#67c23a',fontWeight:600}">{{ info.overdue }}</span></div>
        <div class="drow"><label>单据状态</label><span :style="{color:info.status==='待开始'?'#909399':info.status==='进行中'?'#409eff':'#67c23a',fontWeight:600}">{{ info.status }}</span></div>
        <div class="drow"><label>填报人</label><span>{{ info.reporter }}</span></div>
        <div class="drow"><label>填报时间</label><span>{{ info.reportTime }}</span></div>
      </div>
    </div>

    <div class="dc" v-if="items.length">
      <div class="dct">风险清单</div>
      <table class="ritem-table">
        <thead>
          <tr><th style="width:50px">序号</th><th style="width:110px">风险类型</th><th style="width:150px">风险点</th><th style="width:100px">风险等级</th><th>风险描述</th><th>本月管控措施</th></tr>
        </thead>
        <tbody>
          <tr v-for="(item,i) in items" :key="i">
            <td>{{ i+1 }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.spot }}</td>
            <td><span class="rtag" :class="item.level==='重大风险'?'rtag-red':item.level==='较大风险'?'rtag-orange':'rtag-green'">{{ item.level }}</span></td>
            <td>{{ item.desc }}</td>
            <td>{{ item.measure }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="dc" v-else>
      <p style="color:#909399;text-align:center;padding:16px 0;margin:0">暂无风险项数据</p>
    </div>
  </div>
</template>

<style scoped>
.dp { padding:0; }
.dh { display:flex; align-items:center; gap:16px; margin-bottom:20px; }
.dt { font-size:20px; font-weight:600; color:#303133; margin:0; }
.dc { background:#fff; border:1px solid #ebeef5; border-radius:8px; padding:20px 24px; margin-bottom:16px; }
.dct { font-size:14px; font-weight:600; color:#303133; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #f2f2f2; }
.dgrid { display:grid; grid-template-columns:1fr 1fr; gap:10px 30px; }
.drow { display:flex; font-size:13px; line-height:1.8; }
.drow label { width:80px; flex-shrink:0; color:#909399; }
.drow span { color:#303133; }

.ritem-table { width:100%; border-collapse:collapse; font-size:13px; }
.ritem-table thead th { background:#f8f9fa; color:#495057; font-weight:500; padding:8px 10px; text-align:left; border-bottom:1px solid #e8e8e8; white-space:nowrap; }
.ritem-table tbody td { padding:8px 10px; border-bottom:1px solid #f2f2f2; color:#303133; }
.ritem-table tbody tr:last-child td { border-bottom:none; }

.rtag { display:inline-block; font-size:12px; padding:2px 8px; border-radius:4px; font-weight:500; }
.rtag-red { color:#f56c6c; background:#fef0f0; }
.rtag-orange { color:#e6a23c; background:#fdf6ec; }
.rtag-green { color:#67c23a; background:#f0f9eb; }
</style>
