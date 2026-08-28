<script setup>
import { computed, ref } from 'vue'
import ProfileImageUpload from './ProfileImageUpload.vue'
import ProfilePersonContactInput from './ProfilePersonContactInput.vue'
import ProfilePortraitStatCharts from './ProfilePortraitStatCharts.vue'
import ProfileConstructionSitePicker from './ProfileConstructionSitePicker.vue'
import ProfileNumberInput from './ProfileNumberInput.vue'
import SubcontractorDetailBody from './SubcontractorDetailBody.vue'
import {
  projectTypeOptions,
  permitStatusOptions,
  projectStatusOptions,
} from '../../mock/projectBasicInfo'
import { profileDemoImages } from '../../mock/profileImageDemo'
import {
  yesNoOptions,
  listProfileMajorHazards,
  listProfileDangerWorks,
  listProfileEquipments,
  supervisorCertTypeOptions,
  generalContractorCertTypeOptions,
  createEmptyUnitQualification,
} from '../../mock/projectSafetyProfile'
import {
  canteenFuelOptions,
  superiorManagementUnitOptions,
} from '../../mock/profilePortraitOptions'
import {
  subcontractorList,
} from '../../mock/subcontractorManagement'

const props = defineProps({
  model: {
    type: Object,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

function getSubQual(block, label) {
  if (!block.qualifications) block.qualifications = []
  let item = block.qualifications.find((row) => row.label === label)
  if (!item) {
    item = { label, certNo: '', photo: '', possessed: false }
    block.qualifications.push(item)
  }
  if (item.possessed === undefined) item.possessed = false
  return item
}

function ensureSupervisorQualifications() {
  if (!props.model?.safetyProfile?.supervisorUnit) return
  if (!Array.isArray(props.model.safetyProfile.supervisorUnit.qualifications)) {
    props.model.safetyProfile.supervisorUnit.qualifications = []
  }
}

function addSupervisorQualification() {
  ensureSupervisorQualifications()
  props.model.safetyProfile.supervisorUnit.qualifications.push(createEmptyUnitQualification())
}

function removeSupervisorQualification(index) {
  ensureSupervisorQualifications()
  props.model.safetyProfile.supervisorUnit.qualifications.splice(index, 1)
}

function ensureGcQualifications() {
  if (!props.model?.safetyProfile?.generalContractor) return
  if (!Array.isArray(props.model.safetyProfile.generalContractor.qualifications)) {
    props.model.safetyProfile.generalContractor.qualifications = []
  }
}

function addGcQualification() {
  ensureGcQualifications()
  props.model.safetyProfile.generalContractor.qualifications.push(createEmptyUnitQualification())
}

function removeGcQualification(index) {
  ensureGcQualifications()
  props.model.safetyProfile.generalContractor.qualifications.splice(index, 1)
}

const subDetailVisible = ref(false)
const subDetail = ref(null)

const majorListVisible = ref(false)
const majorFilter = ref('')
const dangerListVisible = ref(false)
const dangerFilter = ref('')
const equipmentListVisible = ref(false)
const equipmentTypeFilter = ref('')
const equipmentKeyword = ref('')
const rowDetailVisible = ref(false)
const rowDetail = ref(null)
const rowDetailTitle = ref('')

function findSubcontractorApplication(projectId, unitName) {
  const name = String(unitName || '').trim()
  if (!name) return null
  const matched = subcontractorList.filter(
    (row) => (!projectId || row.projectId === projectId) && row.name === name,
  )
  return matched.find((row) => row.status === '已通过') || matched[0] || null
}

function openSubcontractorDetail(block) {
  const unitName = String(block?.unitName || '').trim()
  if (!unitName) return
  const app = findSubcontractorApplication(props.model.id, unitName)
  if (app) {
    subDetail.value = {
      source: 'application',
      ...app,
    }
  } else {
    subDetail.value = {
      source: 'portrait',
      name: unitName,
      projectName: props.model.projectName,
      unitType: '—',
      submitter: '—',
      projectLeaderContact: block.projectLeaderContact || '',
      safetyManagerContact: block.safetyManagerContact || '',
      orgStructureDesc: '',
      orgStructureChart: { fileName: '', fileUrl: '' },
      remark: '',
      qualifications: (block.qualifications || [])
        .filter((q) => q.possessed)
        .map((q) => ({
          certNo: q.certNo || q.label,
          fileName: q.photo ? (/\.(jpe?g|png|gif|webp)$/i.test(q.photo) ? q.photo : '证件照片.jpg') : '',
          fileUrl: /^(data:|https?:|blob:|\/)/.test(String(q.photo || '')) ? q.photo : '',
        })),
      safetyLicense: {
        licenseNo: block.safetyLicenseNo || '',
        expiry: block.safetyLicenseExpiry || '',
        fileName: block.safetyLicensePhoto || '',
        fileUrl: /^(data:|https?:|blob:|\/)/.test(String(block.safetyLicensePhoto || ''))
          ? block.safetyLicensePhoto
          : '',
      },
      laborContract: {
        contractNo: '',
        amount: '',
        fileName: '',
        fileUrl: '',
      },
    }
  }
  subDetailVisible.value = true
}

const majorList = computed(() => {
  let rows = listProfileMajorHazards(props.model.id)
  if (majorFilter.value) {
    rows = rows.filter((row) => row.status === majorFilter.value)
  }
  return rows
})

const dangerList = computed(() => {
  let rows = listProfileDangerWorks(props.model.id)
  if (dangerFilter.value) {
    rows = rows.filter((row) => row.type === dangerFilter.value)
  }
  return rows
})

const equipmentList = computed(() => {
  let rows = listProfileEquipments(props.model.id)
  if (equipmentTypeFilter.value) {
    rows = rows.filter((row) => row.type === equipmentTypeFilter.value)
  }
  const kw = String(equipmentKeyword.value || '').trim()
  if (kw) {
    rows = rows.filter(
      (row) =>
        String(row.name || '').includes(kw) ||
        String(row.model || '').includes(kw) ||
        String(row.type || '').includes(kw),
    )
  }
  return rows
})

const majorDialogTitle = computed(() =>
  majorFilter.value ? `危大工程清单 · ${majorFilter.value}` : '危大工程清单',
)

const dangerDialogTitle = computed(() =>
  dangerFilter.value ? `危险作业清单 · ${dangerFilter.value}` : '危险作业清单',
)

const equipmentDialogTitle = computed(() =>
  equipmentTypeFilter.value ? `设备清单 · ${equipmentTypeFilter.value}` : '设备清单',
)

function openMajorList({ filter } = {}) {
  majorFilter.value = filter || ''
  majorListVisible.value = true
}

function openDangerList({ filter } = {}) {
  dangerFilter.value = filter || ''
  dangerListVisible.value = true
}

function openEquipmentList({ filter } = {}) {
  equipmentTypeFilter.value = filter || ''
  equipmentKeyword.value = ''
  equipmentListVisible.value = true
}

function openMajorRow(row) {
  rowDetailTitle.value = '危大工程详情'
  rowDetail.value = {
    kind: 'major',
    ...row,
  }
  rowDetailVisible.value = true
}

function openDangerRow(row) {
  rowDetailTitle.value = '危险作业详情'
  rowDetail.value = {
    kind: 'danger',
    ...row,
  }
  rowDetailVisible.value = true
}

function openEquipmentRow(row) {
  rowDetailTitle.value = '设备详情'
  rowDetail.value = {
    kind: 'equipment',
    ...row,
  }
  rowDetailVisible.value = true
}
</script>

<template>
  <div v-if="model" class="safety-profile-wrap">
  <div class="safety-profile-sheet" :class="{ 'is-readonly': readonly }">
    <table class="profile-table" cellspacing="0" cellpadding="0">
      <colgroup>
        <col span="12" class="col-grid" />
      </colgroup>
      <tbody>
        <tr>
          <td colspan="12" class="section-row">一、项目基础信息</td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">
            项目名称<span v-if="!readonly" class="req-star">*</span>
          </td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.projectName" placeholder="请输入项目名称" aria-label="请输入项目名称"/>
          </td>
          <td colspan="2" class="cell-label">
            项目简称<span v-if="!readonly" class="req-star">*</span>
          </td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.shortName" placeholder="请输入项目简称" aria-label="请输入项目简称"/>
          </td>
          <td colspan="2" class="cell-label">项目状态</td>
          <td colspan="2" class="cell-value">
            <el-select
              v-model="model.status"
              :disabled="readonly"
              placeholder="请选择项目状态"
              style="width: 100%"
              aria-label="请选择项目状态"
            >
              <el-option v-for="opt in projectStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">国家统一编码</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.projectCode" placeholder="请输入国家统一编码" aria-label="请输入国家统一编码"/>
          </td>
          <td colspan="2" class="cell-label">施工单位</td>
          <td colspan="2" class="cell-value">
            <el-input
              v-model="model.contractorUnit"
              :readonly="readonly"
              placeholder="请输入施工单位"
              aria-label="请输入施工单位"
            />
          </td>
          <td colspan="2" class="cell-label">监理单位</td>
          <td colspan="2" class="cell-value">
            <el-input
              v-model="model.supervisorUnit"
              :readonly="readonly"
              placeholder="请输入监理单位"
              aria-label="请输入监理单位"
            />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label cell-label-top">项目概况</td>
          <td colspan="4" class="cell-value">
            <el-input v-model="model.overview" type="textarea" :rows="8" resize="vertical" />
          </td>
          <td colspan="2" class="cell-label cell-label-top">项目效果图</td>
          <td colspan="4" class="cell-value cell-effect">
            <ProfileImageUpload
              v-model="model.projectEffectImage"
              :demo-src="profileDemoImages.projectEffect"
            />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">施工地点</td>
          <td colspan="4" class="cell-value">
            <ProfileConstructionSitePicker
              :site="model.constructionSite"
              :lng="model.constructionSiteLng"
              :lat="model.constructionSiteLat"
              :readonly="readonly"
              @update:site="model.constructionSite = $event"
              @update:lng="model.constructionSiteLng = $event"
              @update:lat="model.constructionSiteLat = $event"
            />
          </td>
          <td colspan="2" class="cell-label">项目高峰期人数</td>
          <td colspan="4" class="cell-value">
            <ProfileNumberInput
              v-model="model.peakPersonnelCount"
              :readonly="readonly"
              unit="人"
              placeholder="请输入人数"
            />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">入场时间</td>
          <td colspan="4" class="cell-value">
            <el-date-picker
              v-model="model.entryTime"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%" aria-label="请选择日期"/>
          </td>
          <td colspan="2" class="cell-label">计划竣工时间</td>
          <td colspan="4" class="cell-value">
            <el-date-picker
              v-model="model.plannedCompletionTime"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%" aria-label="请选择日期"/>
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">项目总投资(万元)</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput
              v-model="model.totalInvestment"
              :readonly="readonly"
              unit="万元"
              :precision="2"
              :max="999999999"
              placeholder="请输入金额"
            />
          </td>
          <td colspan="2" class="cell-label">建筑总面积(平方米)</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput
              v-model="model.buildingTotalArea"
              :readonly="readonly"
              unit="㎡"
              :precision="2"
              :max="999999999"
              placeholder="请输入面积"
            />
          </td>
          <td colspan="2" class="cell-label">备案编号</td>
          <td colspan="2" class="cell-value">
            <el-input
              v-model="model.filingNumber"
              :readonly="readonly"
              placeholder="请输入备案编号"
              aria-label="请输入备案编号"
            />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">项目类型</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.projectType" filterable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in projectTypeOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">施工许可手续办理情况</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.permitStatus" placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in permitStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">施工许可手续照片</td>
          <td colspan="2" class="cell-value">
            <ProfileImageUpload
              v-model="model.permitPhoto"
              demo-variant="certificate"
              compact
            />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">建设单位</td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">部门负责人姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.deptHeadContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">
            项目经理（项目负责人）姓名及电话<span v-if="!readonly" class="req-star">*</span>
          </td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput
              v-model="model.projectManagerContact"
              :readonly="readonly"
              select-only
            />
          </td>
          <td colspan="2" class="cell-label">安全联络员姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyLiaisonContact" :readonly="readonly" />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">二、项目管理人员信息</td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">监理单位</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">公司法人姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.supervisorUnit.legalPersonContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.supervisorUnit.companySafetyDirectorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">项目上级管理单位全称</td>
          <td colspan="2" class="cell-value">
            <el-select
              v-if="!readonly"
              v-model="model.safetyProfile.supervisorUnit.superiorManagementUnit"
              filterable
              clearable
              placeholder="请选择上级管理单位"
              style="width: 100%" aria-label="请选择上级管理单位">
              <el-option
                v-for="opt in superiorManagementUnitOptions"
                :key="`sup-org-${opt}`"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <span v-else class="inline-readonly">{{ model.safetyProfile.supervisorUnit.superiorManagementUnit || '—' }}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.supervisorUnit.chiefSupervisorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">总代姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.supervisorUnit.chiefRepresentativeContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全专监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.supervisorUnit.safetySupervisorContact" :readonly="readonly" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label cell-label-top">监理资质证书</td>
          <td colspan="10" class="cell-value unit-qual-cell">
            <div class="inner-qual-wrap">
              <div v-if="!readonly" class="inner-qual-toolbar">
                <el-button link type="primary" @click="addSupervisorQualification">+ 新增证书</el-button>
              </div>
              <table class="inner-qual-table" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th class="col-idx">序号</th>
                    <th class="col-type">证书类型</th>
                    <th class="col-no">证书编号</th>
                    <th class="col-photo">证件照片</th>
                    <th v-if="!readonly" class="col-op">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, qIdx) in model.safetyProfile.supervisorUnit.qualifications"
                    :key="`sup-qual-row-${qIdx}`"
                  >
                    <td class="col-idx">{{ qIdx + 1 }}</td>
                    <td class="col-type">
                      <span v-if="readonly" class="inline-readonly">{{ row.label || '—' }}</span>
                      <el-select
                        v-else
                        v-model="row.label"
                        placeholder="请选择"
                        filterable
                        clearable
                        style="width: 100%" aria-label="请选择">
                        <el-option
                          v-for="opt in supervisorCertTypeOptions"
                          :key="opt"
                          :label="opt"
                          :value="opt"
                        />
                      </el-select>
                    </td>
                    <td class="col-no">
                      <span v-if="readonly" class="inline-readonly">{{ row.certNo || '—' }}</span>
                      <el-input v-else v-model="row.certNo" placeholder="证书编号" aria-label="证书编号"/>
                    </td>
                    <td class="col-photo">
                      <ProfileImageUpload v-model="row.photo" demo-variant="certificate" compact />
                    </td>
                    <td v-if="!readonly" class="col-op">
                      <el-button link type="danger" @click="removeSupervisorQualification(qIdx)">删除</el-button>
                    </td>
                  </tr>
                  <tr v-if="!model.safetyProfile.supervisorUnit.qualifications?.length">
                    <td :colspan="readonly ? 4 : 5" class="inner-qual-empty">暂无监理资质证书</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">施工总承包单位</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">单位安全生产许可证编号</td>
          <td colspan="4" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.safetyLicenseNo" />
          </td>
          <td colspan="2" class="cell-label">安全生产许可证有效期</td>
          <td colspan="1" class="cell-value">
            <el-date-picker
              v-model="model.safetyProfile.generalContractor.safetyLicenseExpiry"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%" aria-label="请选择日期"/>
          </td>
          <td colspan="2" class="cell-label">安全生产许可证照片</td>
          <td colspan="1" class="cell-value">
            <ProfileImageUpload
              v-model="model.safetyProfile.generalContractor.safetyLicensePhoto"
              demo-variant="certificate"
              compact
            />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">公司法人姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.generalContractor.legalPersonContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.generalContractor.companySafetyDirectorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">项目上级管理单位全称</td>
          <td colspan="2" class="cell-value">
            <el-select
              v-if="!readonly"
              v-model="model.safetyProfile.generalContractor.superiorManagementUnit"
              filterable
              clearable
              placeholder="请选择上级管理单位"
              style="width: 100%" aria-label="请选择上级管理单位">
              <el-option
                v-for="opt in superiorManagementUnitOptions"
                :key="`gc-org-${opt}`"
                :label="opt"
                :value="opt"
              />
            </el-select>
            <span v-else class="inline-readonly">{{ model.safetyProfile.generalContractor.superiorManagementUnit || '—' }}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">项目负责人姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.generalContractor.projectLeaderContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.generalContractor.safetyDirectorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全管理人员姓名及电话</td>
          <td colspan="2" class="cell-value">
            <ProfilePersonContactInput v-model="model.safetyProfile.generalContractor.safetyManagerContact" :readonly="readonly" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label cell-label-top">总包资质证书</td>
          <td colspan="10" class="cell-value unit-qual-cell">
            <div class="inner-qual-wrap">
              <div v-if="!readonly" class="inner-qual-toolbar">
                <el-button link type="primary" @click="addGcQualification">+ 新增证书</el-button>
              </div>
              <table class="inner-qual-table" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th class="col-idx">序号</th>
                    <th class="col-type">证书类型</th>
                    <th class="col-no">证书编号</th>
                    <th class="col-photo">证件照片</th>
                    <th v-if="!readonly" class="col-op">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, qIdx) in model.safetyProfile.generalContractor.qualifications"
                    :key="`gc-qual-row-${qIdx}`"
                  >
                    <td class="col-idx">{{ qIdx + 1 }}</td>
                    <td class="col-type">
                      <span v-if="readonly" class="inline-readonly">{{ row.label || '—' }}</span>
                      <el-select
                        v-else
                        v-model="row.label"
                        placeholder="请选择"
                        filterable
                        clearable
                        style="width: 100%" aria-label="请选择">
                        <el-option
                          v-for="opt in generalContractorCertTypeOptions"
                          :key="opt"
                          :label="opt"
                          :value="opt"
                        />
                      </el-select>
                    </td>
                    <td class="col-no">
                      <span v-if="readonly" class="inline-readonly">{{ row.certNo || '—' }}</span>
                      <el-input v-else v-model="row.certNo" placeholder="证书编号" aria-label="证书编号"/>
                    </td>
                    <td class="col-photo">
                      <ProfileImageUpload v-model="row.photo" demo-variant="certificate" compact />
                    </td>
                    <td v-if="!readonly" class="col-op">
                      <el-button link type="danger" @click="removeGcQualification(qIdx)">删除</el-button>
                    </td>
                  </tr>
                  <tr v-if="!model.safetyProfile.generalContractor.qualifications?.length">
                    <td :colspan="readonly ? 4 : 5" class="inner-qual-empty">暂无总包资质证书</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">专业分包及劳务分包</td>
        </tr>
        <tr>
          <td colspan="12" class="cell-value unit-qual-cell">
            <div class="inner-qual-wrap">
              <table class="inner-qual-table inner-sub-table" cellspacing="0" cellpadding="0">
                <thead>
                  <tr>
                    <th class="col-idx">序号</th>
                    <th class="col-sub-name">分包单位名称</th>
                    <th class="col-sub-person">项目负责人姓名及电话</th>
                    <th class="col-sub-person">安全管理人员姓名及电话</th>
                    <th class="col-sub-mark">资格证书</th>
                    <th class="col-sub-mark">安全生产许可证</th>
                    <th class="col-sub-license">单位安全生产许可证编号</th>
                    <th class="col-sub-expiry">安全生产许可证有效期</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, sIdx) in model.safetyProfile.subcontractorBlocks"
                    :key="`sub-row-${sIdx}`"
                  >
                    <td class="col-idx">{{ sIdx + 1 }}</td>
                    <td class="col-sub-name">
                      <button
                        v-if="row.unitName"
                        type="button"
                        class="unit-link"
                        @click="openSubcontractorDetail(row)"
                      >
                        {{ row.unitName }}
                      </button>
                      <span v-else class="inline-readonly">—</span>
                    </td>
                    <td class="col-sub-person">
                      <ProfilePersonContactInput v-model="row.projectLeaderContact" readonly />
                    </td>
                    <td class="col-sub-person">
                      <ProfilePersonContactInput v-model="row.safetyManagerContact" readonly />
                    </td>
                    <td class="col-sub-mark">
                      <span class="possess-mark" :class="{ ok: getSubQual(row, '资格证书').possessed }">
                        {{ getSubQual(row, '资格证书').possessed ? '✓' : '—' }}
                      </span>
                    </td>
                    <td class="col-sub-mark">
                      <span class="possess-mark" :class="{ ok: row.hasSafetyLicense }">
                        {{ row.hasSafetyLicense ? '✓' : '—' }}
                      </span>
                    </td>
                    <td class="col-sub-license">
                      <el-tooltip :content="row.safetyLicenseNo || '—'" placement="top">
                        <span class="inline-readonly text-ellipsis">{{ row.safetyLicenseNo || '—' }}</span>
                      </el-tooltip>
                    </td>
                    <td class="col-sub-expiry">
                      <span class="inline-readonly">{{ row.safetyLicenseExpiry || '—' }}</span>
                    </td>
                  </tr>
                  <tr v-if="!model.safetyProfile.subcontractorBlocks?.length">
                    <td colspan="9" class="inner-qual-empty">暂无专业分包及劳务分包</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">三、危大工程、危险作业信息</td>
        </tr>
        <tr>
          <td colspan="12" class="cell-value chart-cell">
            <ProfilePortraitStatCharts
              :project-id="model.id"
              section="hazard"
              @open-major-list="openMajorList"
              @open-danger-list="openDangerList"
            />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">四、工地施工机械、设备情况</td>
        </tr>
        <tr>
          <td colspan="12" class="cell-value chart-cell">
            <ProfilePortraitStatCharts
              :project-id="model.id"
              section="machine"
              @open-equipment-list="openEquipmentList"
            />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">五、净空及新能源车辆情况</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">是否涉及净空限高</td>
          <td colspan="2" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteClearance.clearanceHeightInvolved || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.siteClearance.clearanceHeightInvolved"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否涉及净空限高"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">限高要求</td>
          <td colspan="6" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteClearance.clearanceHeightRequirement || '—' }}</span>
            </template>
            <el-input
              v-else
              v-model="model.safetyProfile.siteClearance.clearanceHeightRequirement"
              placeholder="请输入限高要求"
              aria-label="限高要求"
            />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置新能源汽车充电桩</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteNewEnergyCharging.enabled || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.siteNewEnergyCharging.enabled"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否设置新能源汽车充电桩"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电桩数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.siteNewEnergyCharging.pileCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电桩设置是否符合要求</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteNewEnergyCharging.installQualified || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.siteNewEnergyCharging.installQualified"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="充电桩设置是否符合要求"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td
            colspan="2"
            class="cell-label"
            title="现场新能源汽车停放数量（应包含停在工地内或附近为项目人员所使用）"
          >
            现场新能源汽车停放数量
          </td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.siteNewEnergyCharging.parkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置电动自行车充电区域</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteElectricBicycle.enabled || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.siteElectricBicycle.enabled"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否设置电动自行车充电区域"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电口数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.siteElectricBicycle.socketCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电区域设置是否符合要求</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.siteElectricBicycle.installQualified || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.siteElectricBicycle.installQualified"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="充电区域设置是否符合要求"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td
            colspan="2"
            class="cell-label"
            title="现场电动自行车停放数量（应包含停在工地内或附近为项目人员所使用）"
          >
            现场电动自行车停放数量
          </td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.siteElectricBicycle.parkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">六、营地、生活区情况</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">是否有营地</td>
          <td colspan="2" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.hasCamp || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.camp.hasCamp"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否有营地"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地地址</td>
          <td colspan="2" class="cell-value">
            <ProfileConstructionSitePicker
              :site="model.safetyProfile.camp.campAddress"
              :lng="model.safetyProfile.camp.campAddressLng"
              :lat="model.safetyProfile.camp.campAddressLat"
              :readonly="readonly"
              dialog-title="营地地址地图选点（示意图）"
              site-placeholder="请输入营地地址名称"
              @update:site="model.safetyProfile.camp.campAddress = $event"
              @update:lng="model.safetyProfile.camp.campAddressLng = $event"
              @update:lat="model.safetyProfile.camp.campAddressLat = $event"
            />
          </td>
          <td colspan="2" class="cell-label">营地大小（占地面积）</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campOccupiedArea" :readonly="readonly" unit="㎡" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地总人数/人</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campTotalPeople" :readonly="readonly" unit="人" />
          </td>
          <td colspan="2" class="cell-label">营地建筑数量/栋</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campBuildingCount" :readonly="readonly" unit="栋" />
          </td>
          <td colspan="2" class="cell-label">营地建筑材质是否为聚苯乙烯或聚氨酯泡沫彩钢板</td>
          <td colspan="2" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.campBuildingMaterialOk || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.camp.campBuildingMaterialOk"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="营地建筑材质是否为聚苯乙烯或聚氨酯泡沫彩钢板"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地是否有食堂</td>
          <td colspan="2" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.campHasCanteen || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.camp.campHasCanteen"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="营地是否有食堂"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地食堂使用燃气/电气</td>
          <td colspan="6" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.canteenFuelType || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.camp.canteenFuelType"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="营地食堂使用燃气/电气"
            >
              <el-option v-for="opt in canteenFuelOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置新能源汽车充电桩</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campNewEnergyCharging.enabled || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.campNewEnergyCharging.enabled"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否设置新能源汽车充电桩"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电桩数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campNewEnergyCharging.pileCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电桩设置是否符合要求</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campNewEnergyCharging.installQualified || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.campNewEnergyCharging.installQualified"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="充电桩设置是否符合要求"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td
            colspan="2"
            class="cell-label"
            title="营地新能源汽车停放数量（应包含停在营地内或附近为项目人员所使用）"
          >
            营地新能源汽车停放数量
          </td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campNewEnergyCharging.parkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置电动自行车充电区域</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campElectricBicycle.enabled || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.campElectricBicycle.enabled"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="是否设置电动自行车充电区域"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电口数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campElectricBicycle.socketCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电区域设置是否符合要求</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campElectricBicycle.installQualified || '—' }}</span>
            </template>
            <el-select
              v-else
              v-model="model.safetyProfile.campElectricBicycle.installQualified"
              clearable
              placeholder="请选择"
              style="width: 100%"
              aria-label="充电区域设置是否符合要求"
            >
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td
            colspan="2"
            class="cell-label"
            title="营地电动自行车停放数量（应包含停在营地内或附近为项目人员所使用）"
          >
            营地电动自行车停放数量
          </td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campElectricBicycle.parkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <el-dialog
      v-model="subDetailVisible"
      :title="subDetail?.name ? `分包单位详情 · ${subDetail.name}` : '分包单位详情'"
      width="960px"
      top="4vh"
      destroy-on-close
      append-to-body
      class="subcontractor-detail-dialog"
    >
      <SubcontractorDetailBody v-if="subDetail" :detail="subDetail" embedded />
      <template #footer>
        <el-button type="primary" @click="subDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="majorListVisible"
      :title="majorDialogTitle"
      width="960px"
      top="6vh"
      destroy-on-close
      append-to-body
    >
      <div class="list-dialog-tip">
        数据与「危大工程监测 / 危大工程清单」同源
        <template v-if="majorFilter">；当前筛选状态：{{ majorFilter }}</template>
      </div>
      <el-table
        :data="majorList"
        border
        stripe
        size="small"
        class="ap-table"
        empty-text="本项目暂无危大工程"
        @row-click="openMajorRow"
      >
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column prop="name" label="工程名称/内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="category" label="危大类别" width="110" />
        <el-table-column prop="status" label="状态" width="88" align="center" />
        <el-table-column prop="confirmStatus" label="远程确认" width="88" align="center" />
        <el-table-column prop="lastCheck" label="施工日期" width="108" />
      </el-table>
      <template #footer>
        <el-button @click="majorFilter = ''" :disabled="!majorFilter">清除筛选</el-button>
        <el-button type="primary" @click="majorListVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dangerListVisible"
      :title="dangerDialogTitle"
      width="960px"
      top="6vh"
      destroy-on-close
      append-to-body
    >
      <div class="list-dialog-tip">
        数据与「危险作业清单」同源
        <template v-if="dangerFilter">；当前筛选类别：{{ dangerFilter }}</template>
      </div>
      <el-table
        :data="dangerList"
        border
        stripe
        size="small"
        class="ap-table"
        empty-text="本项目暂无危险作业"
        @row-click="openDangerRow"
      >
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column prop="date" label="施工日期" width="108" />
        <el-table-column prop="contractor" label="施工单位" min-width="140" show-overflow-tooltip />
        <el-table-column prop="type" label="作业类型" width="96" />
        <el-table-column prop="subType" label="当日施工内容" min-width="160" show-overflow-tooltip />
        <el-table-column prop="location" label="施工区域" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80" align="center" />
      </el-table>
      <template #footer>
        <el-button @click="dangerFilter = ''" :disabled="!dangerFilter">清除筛选</el-button>
        <el-button type="primary" @click="dangerListVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="equipmentListVisible"
      :title="equipmentDialogTitle"
      width="960px"
      top="6vh"
      destroy-on-close
      append-to-body
    >
      <div class="list-dialog-tip">
        数据与工地施工机械台账同源（演示）
        <template v-if="equipmentTypeFilter">；当前筛选类型：{{ equipmentTypeFilter }}</template>
      </div>
      <div class="list-dialog-filters">
        <el-input
          v-model="equipmentKeyword"
          clearable
          placeholder="关键字：设备名称/型号/类型"
          style="width: 280px"
          aria-label="设备关键字筛选"
        />
        <el-button
          @click="equipmentTypeFilter = ''"
          :disabled="!equipmentTypeFilter && !equipmentKeyword"
        >
          清除筛选
        </el-button>
      </div>
      <el-table
        :data="equipmentList"
        border
        stripe
        size="small"
        class="ap-table"
        empty-text="本项目暂无施工机械设备"
        @row-click="openEquipmentRow"
      >
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column prop="name" label="设备名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="type" label="设备类型" width="110" />
        <el-table-column prop="model" label="型号" width="110" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="72" align="center" />
        <el-table-column prop="status" label="状态" width="88" align="center" />
        <el-table-column prop="entryDate" label="进场日期" width="108" />
        <el-table-column prop="hasLedger" label="台账" width="72" align="center" />
        <el-table-column prop="maintenance" label="维保" width="88" align="center" />
      </el-table>
      <template #footer>
        <el-button type="primary" @click="equipmentListVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rowDetailVisible"
      :title="rowDetailTitle"
      width="640px"
      destroy-on-close
      append-to-body
    >
      <template v-if="rowDetail?.kind === 'major'">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="工程名称">{{ rowDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="危大类别">{{ rowDetail.category }}</el-descriptions-item>
          <el-descriptions-item label="施工项目">{{ rowDetail.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ rowDetail.status || '—' }}</el-descriptions-item>
          <el-descriptions-item label="专项方案">{{ rowDetail.scheme || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工内容">{{ rowDetail.detail?.workContent || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template v-else-if="rowDetail?.kind === 'danger'">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="施工项目">{{ rowDetail.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="施工单位">{{ rowDetail.contractor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="作业类型">{{ rowDetail.type }}</el-descriptions-item>
          <el-descriptions-item label="施工内容">{{ rowDetail.subType }}</el-descriptions-item>
          <el-descriptions-item label="施工区域">{{ rowDetail.location }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ rowDetail.status || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template v-else-if="rowDetail?.kind === 'equipment'">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="设备名称">{{ rowDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="设备类型">{{ rowDetail.type }}</el-descriptions-item>
          <el-descriptions-item label="型号">{{ rowDetail.model || '—' }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ rowDetail.quantity ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ rowDetail.status || '—' }}</el-descriptions-item>
          <el-descriptions-item label="进场日期">{{ rowDetail.entryDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="是否有台账">{{ rowDetail.hasLedger || '—' }}</el-descriptions-item>
          <el-descriptions-item label="维保情况">{{ rowDetail.maintenance || '—' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button type="primary" @click="rowDetailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.safety-profile-wrap {
  width: 100%;
}

.unit-link {
  display: inline;
  padding: 0;
  border: none;
  background: none;
  color: var(--ap-primary, #8f0045);
  cursor: pointer;
  text-align: left;
  font: inherit;
  text-decoration: none;
  word-break: break-all;
}

.unit-link:hover {
  text-decoration: underline;
}

.unit-qual-cell {
  padding: 0 !important;
  background: #fff !important;
  vertical-align: top;
}

.inner-qual-wrap {
  padding: 0;
}

.inner-qual-toolbar {
  display: flex;
  justify-content: flex-end;
  padding: 6px 10px 0;
}

.inner-qual-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
}

.inner-qual-table th,
.inner-qual-table td {
  border: 1px solid #7ea8c9;
  border-top: none;
  padding: 6px 8px;
  vertical-align: middle;
}

.inner-qual-table th:first-child,
.inner-qual-table td:first-child {
  border-left: none;
}

.inner-qual-table th:last-child,
.inner-qual-table td:last-child {
  border-right: none;
}

.inner-qual-table tbody tr:last-child td {
  border-bottom: none;
}

.inner-qual-table th {
  background: #e8f1f8;
  color: #1a1a1a;
  font-weight: 600;
  text-align: center;
}

.inner-qual-table .col-idx {
  width: 52px;
  text-align: center;
  color: #606266;
}

.inner-qual-table .col-type {
  width: 28%;
}

.inner-qual-table .col-no {
  width: 28%;
}

.inner-qual-table .col-photo {
  width: 140px;
  text-align: center;
}

.inner-qual-table .col-op {
  width: 64px;
  text-align: center;
}

.inner-sub-table {
  table-layout: auto;
}

.inner-sub-table .col-sub-name {
  min-width: 120px;
}

.inner-sub-table .col-sub-person {
  min-width: 140px;
  font-size: 12px;
}

.inner-sub-table .col-sub-mark {
  width: 64px;
  text-align: center;
  white-space: nowrap;
}

.inner-sub-table .col-sub-license {
  min-width: 120px;
}

.inner-sub-table .col-sub-expiry {
  width: 110px;
  text-align: center;
  white-space: nowrap;
}

.inner-qual-empty {
  text-align: center;
  color: #909399;
  padding: 14px 8px !important;
  background: #fafcfd;
}

.inner-qual-table :deep(.el-select__wrapper),
.inner-qual-table :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}

.inner-qual-table :deep(.el-select__wrapper:hover),
.inner-qual-table :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0d4e6 inset;
}

.list-dialog-tip {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}

:deep(.subcontractor-detail-dialog .el-dialog__body) {
  max-height: calc(92vh - 120px);
  overflow-y: auto;
  padding-top: 8px;
}

.list-dialog-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.safety-profile-sheet {
  border: 1px solid #7ea8c9;
  background: #fff;
}

.cell-effect {
  text-align: center;
  vertical-align: top;
  padding: 8px 6px;
}

.cell-effect :deep(.preview-box) {
  max-width: 100%;
  height: 148px;
}

.chart-cell {
  padding: 8px 10px;
  background: #fff;
}

.cell-readonly :deep(.el-select__wrapper),
.cell-readonly :deep(.el-input__wrapper) {
  background: #f7f9fb;
}

.inline-readonly {
  display: inline-block;
  padding: 2px 4px;
  line-height: 1.5;
  color: #1a1a1a;
}

.subcontractor-table-cell {
  padding: 8px 10px !important;
  background: #fff;
  overflow: hidden;
}

.subcontractor-table {
  width: 100%;
}

.subcontractor-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.subcontractor-table :deep(col[name='gutter']),
.subcontractor-table :deep(th.el-table__cell.gutter),
.subcontractor-table :deep(td.el-table__cell.gutter) {
  display: none !important;
  width: 0 !important;
}

.subcontractor-table :deep(.el-table__header th) {
  background: #dceaf5;
  color: #1a1a1a;
  font-weight: 600;
  padding: 6px 4px;
}

.subcontractor-table :deep(.el-table__cell) {
  padding: 4px 4px;
}

.subcontractor-table :deep(.el-table__body-wrapper),
.subcontractor-table :deep(.el-table__header-wrapper) {
  overflow-x: hidden !important;
}

.subcontractor-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none !important;
}

.th-wrap {
  line-height: 1.25;
  font-size: 12px;
  text-align: center;
  white-space: normal;
  word-break: break-all;
}

.text-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.subcontractor-table :deep(.el-select),
.subcontractor-table :deep(.el-input),
.subcontractor-table :deep(.el-date-editor) {
  width: 100%;
}

.subcontractor-table :deep(.el-select__wrapper) {
  min-height: 28px;
  padding: 2px 8px;
}

.subcontractor-table :deep(.el-select__tags) {
  flex-wrap: nowrap;
  overflow: hidden;
  max-width: 100%;
}

.subcontractor-table :deep(.profile-person-contact-readonly),
.subcontractor-table :deep(.unit-text) {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
  font-size: 12px;
}

.possess-mark {
  font-size: 16px;
  font-weight: 700;
  color: #bbb;
}

.possess-mark.ok {
  color: #2e7d32;
}

.profile-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 12px;
}

.col-grid {
  width: 8.333%;
}

.section-row {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  background: #dceaf5;
  border: 1px solid #7ea8c9;
  text-align: left;
}

.section-row-sub {
  font-size: 13px;
  font-weight: 600;
  background: #e8f2f9;
}

.cell-label,
.cell-value {
  border: 1px solid #7ea8c9;
  vertical-align: middle;
}

.cell-label {
  padding: 6px 8px;
  text-align: center;
  color: #1a1a1a;
  background: #dceaf5;
  line-height: 1.4;
  word-break: break-all;
}

.req-star {
  color: #e53935;
  margin-left: 2px;
  font-weight: 700;
}

.cell-label-top {
  vertical-align: top;
  padding-top: 10px;
}

.cell-label-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  width: 42px;
  min-width: 42px;
  padding: 10px 6px;
  letter-spacing: 2px;
}

.cell-value {
  padding: 3px 5px;
  background: #fff;
}

.cell-empty {
  background: #fafafa;
}

.notes-cell {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #555;
}

.notes-cell p {
  margin: 0 0 6px;
}

.list-toolbar {
  padding: 6px 10px;
  background: #f5fafd;
  border: 1px solid #7ea8c9;
  font-weight: 600;
}

.cell-value :deep(.el-input__wrapper),
.cell-value :deep(.el-textarea__inner) {
  box-shadow: none;
  background: transparent;
}

.cell-value :deep(.el-input__wrapper:hover),
.cell-value :deep(.el-input__wrapper.is-focus),
.cell-value :deep(.el-textarea__inner:hover),
.cell-value :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--ap-primary) inset;
  background: #fff;
}

.cell-value :deep(.el-date-editor) {
  --el-input-border-color: transparent;
  --el-input-hover-border-color: var(--ap-primary);
}

.cell-value :deep(.el-select__wrapper) {
  box-shadow: none;
  background: transparent;
}

.cell-value :deep(.el-select__wrapper:hover),
.cell-value :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px var(--ap-primary) inset;
  background: #fff;
}

.safety-profile-sheet.is-readonly :deep(input),
.safety-profile-sheet.is-readonly :deep(textarea),
.safety-profile-sheet.is-readonly :deep(.el-input__wrapper),
.safety-profile-sheet.is-readonly :deep(.el-textarea__inner),
.safety-profile-sheet.is-readonly :deep(.el-select__wrapper),
.safety-profile-sheet.is-readonly :deep(.el-radio),
.safety-profile-sheet.is-readonly :deep(.el-date-editor) {
  pointer-events: none;
}

.safety-profile-sheet.is-readonly :deep(.el-button.is-link),
.safety-profile-sheet.is-readonly :deep(.el-upload) {
  display: none;
}
</style>
