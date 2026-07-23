<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isReadonly = computed(() => route.query.readonly === '1')
const pageTitle = computed(() => {
  if (isReadonly.value) return '告警配置详情'
  if (route.query.type) return '编辑告警配置'
  return '新增告警配置'
})

const deviceIndicators = {
  '塔吊告警': ['载重(t)', '力矩(tm)', '回转(°)', '高度(m)', '风力(m/s)', '幅度(m)'],
  '升降机告警': ['载重(t)', '人数', '高度(m)'],
  '桩基告警': ['地面高程(m)', '倾角(°)', '深度(m)', '电流(A)'],
  '复合地基告警': ['地面高程(m)', '施工电流(A)', '材料用量(m³)', '深度(m)', '压力(MPa)', '速率(m/min)'],
  '高支模告警': ['沉降(mm)', '位移(mm)', '倾斜(°)'],
  '深基坑告警': ['水平位移(mm)', '竖向位移(mm)', '水位(mm)', '支撑轴力(kN)'],
  '地铁铁路安全监管告警': ['沉降(mm)', '水平位移(mm)', '振动(mm/s)'],
}
const alertTypeOptions = Object.keys(deviceIndicators)
const conditionOptions = ['大于', '小于', '大于等于', '小于等于', '等于', '不等于']
const personOptions = ['王工', '李工', '张工', '赵工', '陈工', '刘工', '系统管理员']

const deviceOptions = {
  '塔吊告警': ['塔吊QTZ160（#1）', '塔吊QTZ160（#2）', '塔吊QTZ80（#7）'],
  '升降机告警': ['升降机SC200（#2）', '升降机SC200（#4）'],
  '桩基告警': ['桩基钻孔机#5', '桩基旋挖机#8'],
  '复合地基告警': ['复合地基桩机#3', '复合地基桩机#6'],
  '高支模告警': ['高支模监测设备01', '高支模监测设备02'],
  '深基坑告警': ['深基坑监测设备01', '深基坑监测设备02'],
  '地铁铁路安全监管告警': ['地铁监测设备01', '铁路监测设备01'],
}

const form = reactive({
  alertType: '',
  devices: [],
  handler: '',
  enabled: true,
  pushMethod: [],
})

const thresholdRows = ref([
  { indicator: '', condition: '大于', threshold: '', level: '重大风险' },
])

const pushForm = reactive({
  remindInterval: 30,
  autoPush: false,
})

function addRow() {
  thresholdRows.value.push({ indicator: '', condition: '大于', threshold: '', level: '重大风险' })
}
function removeRow(idx) {
  if (thresholdRows.value.length <= 1) return
  thresholdRows.value.splice(idx, 1)
}

const currentIndicators = computed(() => {
  if (!form.alertType) return []
  return deviceIndicators[form.alertType] || []
})

function submitForm() {
  if (!form.alertType) { ElMessage.warning('请选择告警类型'); return }
  if (!form.devices.length) { ElMessage.warning('请选择告警设备'); return }
  if (form.enabled === '' || form.enabled === null || form.enabled === undefined) { ElMessage.warning('请选择是否启用'); return }
  if (!form.pushMethod.length) { ElMessage.warning('请选择推送方式'); return }
  const validRows = thresholdRows.value.filter(r => r.indicator && r.condition && r.threshold && r.level)
  if (!validRows.length) { ElMessage.warning('请至少配置一条有效的触发条件'); return }
  if (validRows.length !== thresholdRows.value.length) { ElMessage.warning('请填写完整触发条件必填项'); return }
  if (!pushForm.remindInterval) { ElMessage.warning('请填写告警未处理提醒时间间隔'); return }
  ElMessage.success('告警配置已保存')
  router.back()
}

function goBack() { router.back() }

// 编辑/详情 - 从query加载数据
if (route.query.type) {
  form.alertType = route.query.type
  if (route.query.device) form.devices = [route.query.device]
  if (route.query.handler) form.handler = route.query.handler
  if (route.query.enabled) form.enabled = route.query.enabled === '1'
  if (!form.pushMethod.length) form.pushMethod = ['短信', '站内信']
  thresholdRows.value = [{
    indicator: deviceIndicators[form.alertType]?.[0] || '',
    condition: '大于',
    threshold: '80',
    level: '重大风险',
  }]
}
</script>

<template>
  <div class="form-page">
    <div class="form-head">
      <el-button text @click="goBack">← 返回</el-button>
      <h3 class="form-title">{{ pageTitle }}</h3>
    </div>
    <div class="form-body">
      <template v-if="isReadonly">
        <div class="detail-section">
          <div class="section-title">基础信息</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">告警类型</span><span class="detail-value">{{ form.alertType || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">告警设备</span><span class="detail-value">{{ form.devices.join('、') || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">处理人</span><span class="detail-value">{{ form.handler || '-' }}</span></div>
            <div class="detail-item"><span class="detail-label">是否启用</span><span class="detail-value">{{ form.enabled ? '是' : '否' }}</span></div>
            <div class="detail-item"><span class="detail-label">推送方式</span><span class="detail-value">{{ form.pushMethod.join('、') || '-' }}</span></div>
          </div>
        </div>

        <el-divider style="margin:20px 0 12px" />
        <div class="detail-section">
          <div class="section-title">触发条件设置</div>
          <el-table :data="thresholdRows" border size="small" style="width:100%;margin-top:12px">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="indicator" label="告警指标" min-width="140" />
            <el-table-column prop="condition" label="告警条件" width="120" align="center" />
            <el-table-column prop="threshold" label="阈值" width="120" align="center" />
            <el-table-column prop="level" label="告警等级" width="130" align="center" />
          </el-table>
        </div>

        <el-divider style="margin:20px 0 12px" />
        <div class="detail-section">
          <div class="section-title">推送条件设置</div>
          <div class="detail-grid single">
            <div class="detail-item"><span class="detail-label wide">告警未处理提醒时间间隔</span><span class="detail-value">{{ pushForm.remindInterval }} 分钟</span></div>
          </div>
        </div>
      </template>

      <el-form v-else :model="form" label-width="100px">

        <!-- ====== 基础信息 ====== -->
        <div class="section-title">基础信息</div>
        <el-row :gutter="16" style="margin-top:12px">
          <el-col :span="8">
            <el-form-item label="告警类型" required>
              <el-select v-model="form.alertType" placeholder="请选择" style="width:100%" :disabled="isReadonly">
                <el-option v-for="t in alertTypeOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="告警设备" required>
              <el-select v-model="form.devices" multiple placeholder="请选择" style="width:100%" :disabled="isReadonly">
                <el-option v-for="d in deviceOptions[form.alertType] || []" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="处理人" required>
              <el-select v-model="form.handler" placeholder="请选择" style="width:100%" :disabled="isReadonly">
                <el-option v-for="p in personOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="是否启用" required>
              <el-switch v-model="form.enabled" active-text="是" inactive-text="否" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="推送方式" required>
              <el-select v-model="form.pushMethod" multiple placeholder="请选择" style="width:100%" :disabled="isReadonly">
                <el-option label="短信" value="短信" />
                <el-option label="站内信" value="站内信" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ====== 触发条件设置 ====== -->
        <el-divider style="margin:20px 0 12px" />
        <div class="section-title">触发条件设置</div>
        <div style="margin-bottom:10px;font-size:12px;color:#999">配置告警指标的触发条件</div>
        <el-table :data="thresholdRows" border size="small" style="width:100%">
          <el-table-column type="index" label="序号" width="50" align="center" />
          <el-table-column min-width="130">
            <template #header><span class="required-column-title">告警指标</span></template>
            <template #default="{ row }">
              <el-select v-model="row.indicator" placeholder="请选择" style="width:100%" size="small">
                <el-option v-for="ind in currentIndicators" :key="ind" :label="ind" :value="ind" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column width="110">
            <template #header><span class="required-column-title">告警条件</span></template>
            <template #default="{ row }">
              <el-select v-model="row.condition" style="width:100%" size="small">
                <el-option v-for="c in conditionOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column width="90">
            <template #header><span class="required-column-title">阈值</span></template>
            <template #default="{ row }">
              <el-input v-model="row.threshold" placeholder="输入数值" size="small" />
            </template>
          </el-table-column>
          <el-table-column width="110">
            <template #header><span class="required-column-title">告警等级</span></template>
            <template #default="{ row }">
              <el-select v-model="row.level" style="width:100%" size="small">
                <el-option label="重大风险" value="重大风险" />
                <el-option label="较大风险" value="较大风险" />
                <el-option label="一般风险" value="一般风险" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="55" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="removeRow($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button size="small" @click="addRow" style="margin-top:6px">+ 添加</el-button>

        <!-- ====== 推送条件设置 ====== -->
        <el-divider style="margin:20px 0 12px" />
        <div class="section-title">推送条件设置</div>
        <div style="margin-top:12px;padding:16px;border:1px solid #eee;border-radius:6px;background:#fafbfc">
          <el-row :gutter="16" style="align-items:center">
            <el-col :span="12">
              <el-form-item label="告警未处理提醒时间间隔" label-width="170px" required style="margin-bottom:0">
                <div style="display:flex;align-items:center;gap:8px">
                  <el-input-number v-model="pushForm.remindInterval" :min="1" :max="1440" size="small" style="width:160px" />
                  <span style="font-size:12px;color:#999;white-space:nowrap">分钟</span>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div style="margin-top:24px;display:flex;gap:12px">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="submitForm">保存</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.form-page { padding:0; }
.form-head { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.form-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.form-body { background:#fff; border-radius:8px; padding:24px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
.section-title { font-size:14px; font-weight:600; color:#1f2329; }
.detail-section { margin-bottom:8px; }
.detail-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px 24px; margin-top:12px; }
.detail-grid.single { grid-template-columns:1fr; }
.detail-item { display:flex; align-items:flex-start; font-size:13px; min-height:28px; }
.detail-label { width:90px; color:#666; flex-shrink:0; }
.detail-label.wide { width:170px; }
.detail-value { color:#1f2329; line-height:20px; }

.el-form-item__label::before {
  content: '' !important;
}
.el-form-item.is-required .el-form-item__label::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}
.required-column-title::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}
</style>
