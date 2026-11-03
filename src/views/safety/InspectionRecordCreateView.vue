<script setup>
/**
 * 项目级 · 新增巡检记录（WEB 端）
 * - 字段、校验、提交逻辑与移动端「新建巡检」完全一致（MobileTaskCreateView.vue）
 * - 隐患编辑器样式对齐工作台「巡检任务执行」面板（TodoInspectionPanel.vue）
 * - 提交后：生成巡检单号 → 写入巡检任务 → 按隐患条数生成整改单 → 返回巡检任务列表
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { addMobileInspectionTask } from '../../mock/mobileInspectionTasks'
import { createMobileRectificationsFromTask } from '../../composables/useMobileRectification'
import {
  INSPECTION_CATEGORIES,
  INSPECTION_TYPES,
  HAZARD_CATEGORIES,
  HAZARD_LEVELS,
  buildInspectionTaskNo,
  formatInspectionCategories,
} from '../../config/inspectionManagement'
import { inspectorCandidates, getProjectRectifierLabel, getProjectReviewerLabel } from '../../composables/useInspectionPersonConfig'
import { getMajorHazardLedgerOptions } from '../../utils/inspectionMajorHazardLink'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions'
import DispatchImageAttachments from '../../coc/components/DispatchImageAttachments.vue'

const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()

/** 指挥部级可选全部项目；项目级固定为当前项目 */
const projectOptions = computed(() => (isHqSelected.value
  ? COC_PROJECT_OPTIONS.map((item) => ({ id: item.id, label: item.label }))
  : []))
const projectId = computed(() => (isHqSelected.value ? form.value.projectId : selectedProjectId.value || ''))
const projectLabel = computed(() => {
  if (isHqSelected.value) return projectOptions.value.find((item) => item.id === form.value.projectId)?.label || ''
  return headerProjectLabel.value || ''
})

const personOptions = inspectorCandidates.map((p) => `${p.name}（${p.role}）`)
const companionOptions = personOptions

function createHazardItem() {
  return {
    hazardCategory: '',
    hazardLevel: '',
    desc: '',
    rectifyRequirement: '',
    photos: [],
    rectifyPerson: getProjectRectifierLabel(projectLabel.value),
    reviewPerson: getProjectReviewerLabel(projectLabel.value),
    rectifyDeadline: '',
  }
}

const form = ref({
  projectId: '',
  inspectionCategories: ['安全'],
  inspectionType: '值班检查',
  inspDate: new Date().toISOString().slice(0, 10),
  isMajorHazardPatrol: '否',
  majorHazardLedgerId: '',
  majorHazardSourceId: '',
  majorHazardName: '',
  inspector: '当前用户',
  companions: [],
  photos: [],
  result: '',
  hazardItems: [],
})

const submitting = ref(false)

const majorHazardOptions = computed(() => (projectId.value ? getMajorHazardLedgerOptions(projectId.value) : []))

function onMajorHazardChange(ledgerId) {
  const option = majorHazardOptions.value.find((item) => item.id === ledgerId)
  form.value.majorHazardSourceId = option?.sourceId || ''
  form.value.majorHazardName = option?.name || ''
}

/** 指挥部级切换项目后，清空危大工程选择（危大清单随项目变化） */
watch(() => form.value.projectId, () => {
  form.value.majorHazardLedgerId = ''
  form.value.majorHazardSourceId = ''
  form.value.majorHazardName = ''
})

watch(() => form.value.isMajorHazardPatrol, (value) => {
  if (value !== '是') {
    form.value.majorHazardLedgerId = ''
    form.value.majorHazardSourceId = ''
    form.value.majorHazardName = ''
  }
})

watch(() => form.value.result, (value) => {
  if (value === 'hazard' && form.value.hazardItems.length === 0) form.value.hazardItems = [createHazardItem()]
  if (value === 'normal') form.value.hazardItems = []
})

function addHazard() {
  form.value.hazardItems.push(createHazardItem())
}

function removeHazard(index) {
  if (form.value.hazardItems.length <= 1) return
  form.value.hazardItems.splice(index, 1)
}

function goBack() {
  router.push('/safety-inspection/task')
}

function submitInspection() {
  if (!form.value.inspectionCategories.length) return ElMessage.warning('请选择至少一个巡检分类')
  if (!form.value.inspectionType) return ElMessage.warning('请选择检查类型')
  if (!form.value.inspDate) return ElMessage.warning('请选择巡检日期')
  if (!projectId.value) return ElMessage.warning('请选择所属项目')
  if (form.value.isMajorHazardPatrol === '是' && !form.value.majorHazardLedgerId) return ElMessage.warning('请选择危大工程名称')
  if (!form.value.result) return ElMessage.warning('请选择巡检结果')
  if (form.value.result === 'normal' && form.value.photos.length === 0) {
    return ElMessage.warning('全部正常时请至少上传一张巡检照片')
  }
  if (form.value.result === 'hazard') {
    if (form.value.hazardItems.length === 0) return ElMessage.warning('请至少添加一条隐患')
    for (const [i, item] of form.value.hazardItems.entries()) {
      if (!item.hazardCategory) return ElMessage.warning(`第 ${i + 1} 条隐患请选择隐患类别`)
      if (!item.hazardLevel) return ElMessage.warning(`第 ${i + 1} 条隐患请选择隐患等级`)
      if (!String(item.rectifyRequirement || '').trim()) return ElMessage.warning(`第 ${i + 1} 条隐患请填写整改要求`)
      if (!String(item.desc || '').trim()) return ElMessage.warning(`第 ${i + 1} 条隐患请填写说明`)
      if (!item.photos?.length) return ElMessage.warning(`第 ${i + 1} 条隐患请至少上传一张照片`)
      if (!item.rectifyPerson) return ElMessage.warning(`第 ${i + 1} 条隐患请选择整改人`)
      if (!item.reviewPerson) return ElMessage.warning(`第 ${i + 1} 条隐患请选择复查人`)
      if (!item.rectifyDeadline) return ElMessage.warning(`第 ${i + 1} 条隐患请选择整改截止日期`)
    }
  }

  const now = Date.now()
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const taskNo = buildInspectionTaskNo(form.value.inspectionCategories, form.value.inspDate, Number(String(now).slice(-3)))
  const hazardItems = form.value.hazardItems.map((item, index) => {
    const rectifyNo = `ZG${dateKey}${String(now).slice(-4)}${String(index + 1).padStart(2, '0')}`
    return {
      hazardCategory: item.hazardCategory,
      hazardLevel: item.hazardLevel,
      rectifyRequirement: String(item.rectifyRequirement || '').trim(),
      desc: item.desc,
      photos: [...item.photos],
      hasRectify: true,
      rectifyNo,
      rectifyId: `self-${rectifyNo}`,
      rectifyPerson: item.rectifyPerson,
      reviewPerson: item.reviewPerson,
      rectifyDeadline: item.rectifyDeadline,
    }
  })
  const rectifyCount = hazardItems.length

  const newTask = {
    id: `self-${now}`,
    taskNo,
    source: '系统自建',
    inspectionCategories: [...form.value.inspectionCategories],
    inspectionCategory: formatInspectionCategories(form.value.inspectionCategories),
    inspectionType: form.value.inspectionType,
    taskName: `${projectLabel.value}${formatInspectionCategories(form.value.inspectionCategories)}检查`,
    project: projectLabel.value,
    projectId: projectId.value,
    project_id: projectId.value,
    isMajorHazardPatrol: form.value.isMajorHazardPatrol,
    majorHazardProjectId: form.value.isMajorHazardPatrol === '是' ? projectId.value : '',
    majorHazardProjectName: form.value.isMajorHazardPatrol === '是' ? projectLabel.value : '',
    majorHazardLedgerId: form.value.majorHazardLedgerId,
    majorHazardSourceId: form.value.majorHazardSourceId,
    majorHazardName: form.value.majorHazardName,
    executor: form.value.inspector,
    inspector: form.value.inspector,
    companions: [...form.value.companions],
    deadline: form.value.inspDate,
    status: '已完成',
    inspDate: form.value.inspDate,
    submittedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    itemCount: 0,
    hazardCount: form.value.hazardItems.length,
    photos: form.value.photos,
    result: form.value.result,
    normalPhotos: form.value.result === 'normal' ? [...form.value.photos] : [],
    hazardItems,
    hasRectify: rectifyCount > 0,
    rectifyCount,
  }

  submitting.value = true
  try {
    addMobileInspectionTask(newTask)
    createMobileRectificationsFromTask(newTask, hazardItems)
    ElMessage.success(`巡检记录已提交${rectifyCount ? `，已下发 ${rectifyCount} 份整改单` : ''}`)
    router.push('/safety-inspection/task')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="inspection-create-page page-card">
    <div class="page-header">
      <div class="header-nav">
        <el-button text :icon="ArrowLeft" @click="goBack">返回巡检任务</el-button>
        <span class="nav-divider"></span>
        <div class="page-breadcrumb">安全管理 / 巡检管理 / 巡检任务 / 新增巡检记录</div>
      </div>
      <div class="header-main">
        <div class="title-block">
          <h1 class="page-title">新增巡检记录</h1>
          <p class="page-scope">{{ projectLabel || '未选择项目' }}</p>
        </div>
      </div>
    </div>

    <!-- 基本信息 -->
    <section class="section-card">
      <div class="section-heading">
        <div class="section-title">基本信息</div>
      </div>
      <el-form label-width="156px">
        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="巡检分类" required>
              <el-select v-model="form.inspectionCategories" multiple collapse-tags collapse-tags-tooltip placeholder="请选择巡检分类" style="width: 100%" aria-label="请选择巡检分类">
                <el-option v-for="category in INSPECTION_CATEGORIES" :key="category" :label="category" :value="category" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="检查类型" required>
              <el-select v-model="form.inspectionType" placeholder="请选择检查类型" style="width: 100%" aria-label="请选择检查类型">
                <el-option v-for="type in INSPECTION_TYPES" :key="type" :label="type" :value="type" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="巡检日期" required>
              <el-date-picker v-model="form.inspDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择巡检日期" style="width: 100%" aria-label="请选择巡检日期" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属项目" required>
              <el-select v-if="isHqSelected" v-model="form.projectId" filterable placeholder="请选择所属项目" style="width: 100%" aria-label="请选择所属项目">
                <el-option v-for="item in projectOptions" :key="item.id" :label="item.label" :value="item.id" />
              </el-select>
              <span v-else class="static-value">{{ projectLabel || '—' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="巡检人" required>
              <el-input v-model="form.inspector" disabled aria-label="巡检人（默认当前用户，不可修改）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="同行人">
              <el-select v-model="form.companions" multiple filterable collapse-tags collapse-tags-tooltip placeholder="请选择同行人" style="width: 100%" aria-label="请选择同行人">
                <el-option v-for="p in companionOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="危大工程现场巡视" required>
              <el-radio-group v-model="form.isMajorHazardPatrol">
                <el-radio value="是">是</el-radio>
                <el-radio value="否">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col v-if="form.isMajorHazardPatrol === '是'" :span="12">
            <el-form-item label="危大工程名称" required>
              <el-select v-model="form.majorHazardLedgerId" filterable placeholder="请选择危大工程" style="width: 100%" aria-label="请选择危大工程" @change="onMajorHazardChange">
                <el-option v-for="item in majorHazardOptions" :key="item.id" :label="item.label" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </section>

    <!-- 巡检结果与照片 -->
    <section class="section-card">
      <div class="section-heading">
        <div class="section-title">巡检结果与照片</div>
      </div>
      <el-form label-width="156px">
        <el-form-item label="巡检结果" required>
          <el-radio-group v-model="form.result">
            <el-radio value="normal">全部正常</el-radio>
            <el-radio value="hazard">有隐患</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.result === 'normal'" label="巡检照片" required>
          <DispatchImageAttachments v-model="form.photos" :min="1" :max="9" name-prefix="巡检照片" />
        </el-form-item>
      </el-form>
    </section>

    <!-- 隐患清单 -->
    <section v-if="form.result === 'hazard'" class="section-card">
      <div class="section-heading">
        <div class="section-title">隐患清单</div>
      </div>
      <div class="hazard-editor">
        <div v-for="(hazard, index) in form.hazardItems" :key="index" class="hazard-item">
          <div class="hazard-item-head">
            <strong>隐患 {{ index + 1 }}</strong>
            <el-button v-if="form.hazardItems.length > 1" link type="danger" @click="removeHazard(index)">删除</el-button>
          </div>
          <div class="hazard-row">
            <span class="hazard-label">隐患类别<i>*</i></span>
            <el-select v-model="hazard.hazardCategory" filterable placeholder="请选择隐患类别" style="width: 100%" :aria-label="`隐患${index + 1}类别`">
              <el-option v-for="category in HAZARD_CATEGORIES" :key="category" :label="category" :value="category" />
            </el-select>
          </div>
          <div class="hazard-row">
            <span class="hazard-label">隐患等级<i>*</i></span>
            <el-select v-model="hazard.hazardLevel" placeholder="请选择隐患等级" style="width: 100%" :aria-label="`隐患${index + 1}等级`">
              <el-option v-for="level in HAZARD_LEVELS" :key="level" :label="level" :value="level" />
            </el-select>
          </div>
          <div class="hazard-row">
            <span class="hazard-label">隐患说明<i>*</i></span>
            <el-input v-model="hazard.desc" type="textarea" :rows="2" placeholder="请描述隐患情况" :aria-label="`隐患${index + 1}说明`" />
          </div>
          <div class="hazard-row">
            <span class="hazard-label">隐患照片<i>*</i></span>
            <DispatchImageAttachments v-model="hazard.photos" :min="1" :max="9" :name-prefix="`隐患${index + 1}照片`" />
          </div>
          <div class="hazard-row">
            <span class="hazard-label">整改要求<i>*</i></span>
            <el-input v-model="hazard.rectifyRequirement" type="textarea" :rows="3" placeholder="请输入整改要求" :aria-label="`隐患${index + 1}整改要求`" />
          </div>
          <div class="hazard-rectify">
            <div class="hazard-row">
              <span class="hazard-label">整改人<i>*</i></span>
              <el-select v-model="hazard.rectifyPerson" filterable placeholder="请选择整改人" style="width: 100%" :aria-label="`隐患${index + 1}整改人`">
                <el-option v-for="p in personOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </div>
            <div class="hazard-row">
              <span class="hazard-label">复查人<i>*</i></span>
              <el-select v-model="hazard.reviewPerson" filterable placeholder="请选择复查人" style="width: 100%" :aria-label="`隐患${index + 1}复查人`">
                <el-option v-for="p in personOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </div>
            <div class="hazard-row">
              <span class="hazard-label">整改截止日期<i>*</i></span>
              <el-date-picker v-model="hazard.rectifyDeadline" type="date" value-format="YYYY-MM-DD" placeholder="请选择整改截止日期" style="width: 100%" :aria-label="`隐患${index + 1}整改截止日期`" />
            </div>
          </div>
        </div>
        <el-button class="hazard-add" @click="addHazard">+ 新增隐患</el-button>
        <div class="rectify-summary">已录入 {{ form.hazardItems.length }} 条隐患，将下发 {{ form.hazardItems.length }} 份整改单</div>
      </div>
    </section>

    <div class="form-footer">
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitInspection">提交</el-button>
    </div>
  </div>
</template>

<style scoped>
.inspection-create-page{padding:20px 24px 96px}
.page-header{margin-bottom:18px}
.header-nav{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.nav-divider{width:1px;height:14px;background:var(--ap-border-color,#ebeef5)}
.page-breadcrumb{color:var(--ap-text-muted);font-size:12px}
.title-block h1{margin:0 0 5px;font-size:20px}
.page-scope{margin:0;color:var(--ap-text-muted);font-size:13px}
.section-card{margin-bottom:16px;padding:18px 20px;border:1px solid var(--ap-border-color,#ebeef5);border-radius:10px;background:#fff}
.section-heading{margin-bottom:14px}
.section-title{padding-left:10px;border-left:3px solid var(--ap-primary,#8f0045);color:#1f2329;font-size:15px;font-weight:600;line-height:18px}
.inspection-create-page :deep(.el-form-item__label){white-space:nowrap}
.static-value{display:inline-block;color:#1f2329;line-height:32px}
.hazard-editor{display:flex;flex-direction:column;gap:14px}
.hazard-item{padding:14px 16px;border:1px solid var(--ap-border-color,#ebeef5);border-radius:8px;background:#fafbfc}
.hazard-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.hazard-item-head strong{color:#1f2329;font-size:14px}
.hazard-row{display:grid;grid-template-columns:128px 1fr;gap:12px;align-items:start;margin-bottom:10px}
.hazard-row:last-child{margin-bottom:0}
.hazard-label{color:var(--ap-text-secondary,#5f6b7a);font-size:13px;line-height:32px}
.hazard-label i{margin-left:2px;color:#d4380d;font-style:normal}
.hazard-rectify{margin-top:8px;padding:12px 14px;border-radius:8px;background:#fff7f0;border:1px solid #f7d9bf}
.hazard-add{align-self:flex-start}
.rectify-summary{margin-top:4px;color:var(--ap-text-muted);font-size:12px}
.form-footer{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:10px;margin-top:8px;padding:14px 20px;border-top:1px solid var(--ap-border-color,#ebeef5);background:#fff}
</style>
