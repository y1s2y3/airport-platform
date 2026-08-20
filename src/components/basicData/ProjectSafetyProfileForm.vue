<script setup>
import { computed, ref } from 'vue'
import ProfileImageUpload from './ProfileImageUpload.vue'
import PersonContactSelect from './PersonContactSelect.vue'
import ProfilePortraitStatCharts from './ProfilePortraitStatCharts.vue'
import ProfileUnitSelect from './ProfileUnitSelect.vue'
import ProfileConstructionSiteSelect from './ProfileConstructionSiteSelect.vue'
import ProfileNumberInput from './ProfileNumberInput.vue'
import FileAttachmentPreview from './FileAttachmentPreview.vue'
import {
  projectTypeOptions,
  permitStatusOptions,
  projectStatusOptions,
} from '../../mock/projectBasicInfo'
import { profileDemoImages } from '../../mock/profileImageDemo'
import {
  yesNoOptions,
  profileNotes,
  listProfileMajorHazards,
  listProfileDangerWorks,
  supervisorCertTypeOptions,
  generalContractorCertTypeOptions,
  createEmptyUnitQualification,
} from '../../mock/projectSafetyProfile'
import {
  yesNoNaOptions,
  canteenFuelOptions,
  superiorManagementUnitOptions,
} from '../../mock/profilePortraitOptions'
import {
  subcontractorList,
  approveStatusTagClass,
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
      status: '画像登记',
      projectLeaderContact: block.projectLeaderContact || '',
      safetyManagerContact: block.safetyManagerContact || '',
      orgStructureDesc: '',
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
        photoName: block.safetyLicensePhoto || '',
        photoUrl: /^(data:|https?:|blob:|\/)/.test(String(block.safetyLicensePhoto || ''))
          ? block.safetyLicensePhoto
          : '',
      },
      laborContract: {
        contractNo: '',
        amount: '',
        fileName: '',
        fileUrl: '',
      },
      approvalFlow: [],
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

const majorDialogTitle = computed(() =>
  majorFilter.value ? `危大工程清单 · ${majorFilter.value}` : '危大工程清单',
)

const dangerDialogTitle = computed(() =>
  dangerFilter.value ? `危险作业清单 · ${dangerFilter.value}` : '危险作业清单',
)

function openMajorList({ filter } = {}) {
  majorFilter.value = filter || ''
  majorListVisible.value = true
}

function openDangerList({ filter } = {}) {
  dangerFilter.value = filter || ''
  dangerListVisible.value = true
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
          <td colspan="2" class="cell-value cell-readonly">
            <el-select
              v-model="model.status"
              disabled
              placeholder="—"
              style="width: 100%" aria-label="—">
              <el-option v-for="opt in projectStatusOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">项目编码</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.projectCode" placeholder="请输入项目编码" aria-label="请输入项目编码"/>
          </td>
          <td colspan="2" class="cell-label">施工单位</td>
          <td colspan="2" class="cell-value">
            <ProfileUnitSelect
              v-model="model.contractorUnit"
              :project-id="model.id"
              role="contractor"
              :readonly="readonly"
              placeholder="请选择施工单位"
            />
          </td>
          <td colspan="2" class="cell-label">监理单位</td>
          <td colspan="2" class="cell-value">
            <ProfileUnitSelect
              v-model="model.supervisorUnit"
              :project-id="model.id"
              role="supervisor"
              :readonly="readonly"
              placeholder="请选择监理单位"
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
            <ProfileConstructionSiteSelect
              v-model="model.constructionSite"
              :project-id="model.id"
              :readonly="readonly"
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
            <PersonContactSelect v-model="model.deptHeadContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">
            项目经理（项目负责人）姓名及电话<span v-if="!readonly" class="req-star">*</span>
          </td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.projectManagerContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全联络员姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyLiaisonContact" :readonly="readonly" />
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
            <PersonContactSelect v-model="model.safetyProfile.supervisorUnit.legalPersonContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.supervisorUnit.companySafetyDirectorContact" :readonly="readonly" />
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
            <PersonContactSelect v-model="model.safetyProfile.supervisorUnit.chiefSupervisorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">总代姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.supervisorUnit.chiefRepresentativeContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全专监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.supervisorUnit.safetySupervisorContact" :readonly="readonly" />
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
            <PersonContactSelect v-model="model.safetyProfile.generalContractor.legalPersonContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.generalContractor.companySafetyDirectorContact" :readonly="readonly" />
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
            <PersonContactSelect v-model="model.safetyProfile.generalContractor.projectLeaderContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全总监姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.generalContractor.safetyDirectorContact" :readonly="readonly" />
          </td>
          <td colspan="2" class="cell-label">安全管理人员姓名及电话</td>
          <td colspan="2" class="cell-value">
            <PersonContactSelect v-model="model.safetyProfile.generalContractor.safetyManagerContact" :readonly="readonly" />
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
                    <th class="col-sub-mark">资质证件</th>
                    <th class="col-sub-mark">职称证书</th>
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
                      <PersonContactSelect v-model="row.projectLeaderContact" readonly />
                    </td>
                    <td class="col-sub-person">
                      <PersonContactSelect v-model="row.safetyManagerContact" readonly />
                    </td>
                    <td class="col-sub-mark">
                      <span class="possess-mark" :class="{ ok: getSubQual(row, '资质证件').possessed }">
                        {{ getSubQual(row, '资质证件').possessed ? '✓' : '—' }}
                      </span>
                    </td>
                    <td class="col-sub-mark">
                      <span class="possess-mark" :class="{ ok: getSubQual(row, '职称证书').possessed }">
                        {{ getSubQual(row, '职称证书').possessed ? '✓' : '—' }}
                      </span>
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
                    <td colspan="11" class="inner-qual-empty">暂无专业分包及劳务分包</td>
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
            <ProfilePortraitStatCharts :project-id="model.id" section="machine" />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">五、营地、生活区情况</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">是否有营地</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.hasCamp" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地地址</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campAddress" />
          </td>
          <td colspan="2" class="cell-label">营地大小（占地面积）</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campOccupiedArea" :readonly="readonly" unit="㎡" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地面积</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campArea" :readonly="readonly" unit="㎡" />
          </td>
          <td colspan="2" class="cell-label">营地总人数/人</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campTotalPeople" :readonly="readonly" unit="人" />
          </td>
          <td colspan="2" class="cell-label">营地视频数量/路</td>
          <td colspan="2" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.camp.campVideoChannels" :readonly="readonly" unit="路" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地板房材质是否为阻燃聚氨酯泡沫彩钢夹芯板</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.campBuildingMaterialOk" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">视频是否全覆盖</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.videoFullCoverage || '—' }}</span>
            </template>
            <el-select v-else v-model="model.safetyProfile.camp.videoFullCoverage" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoNaOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">视频含食堂和燃气/电气</td>
          <td colspan="1" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.videoIncludesCanteenGas || '—' }}</span>
            </template>
            <el-select v-else v-model="model.safetyProfile.camp.videoIncludesCanteenGas" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoNaOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地是否有食堂</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.campHasCanteen" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地食堂使用燃料/能源</td>
          <td colspan="6" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.camp.canteenFuelType || '—' }}</span>
            </template>
            <el-select v-else v-model="model.safetyProfile.camp.canteenFuelType" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in canteenFuelOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>

        <tr>
          <td colspan="3" class="cell-label">是否设置新能源汽车充电桩</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.campNewEnergyCharging.enabled" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电桩数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campNewEnergyCharging.pileCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电桩安装是否符合要求</td>
          <td colspan="3" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campNewEnergyCharging.installQualified || '—' }}</span>
            </template>
            <el-select v-else v-model="model.safetyProfile.campNewEnergyCharging.installQualified" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoNaOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地新能源汽车停放数量（营地内）</td>
          <td colspan="3" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campNewEnergyCharging.onsiteParkingCount" :readonly="readonly" unit="辆" />
          </td>
          <td colspan="3" class="cell-label">营地新能源汽车停放数量（营地外）</td>
          <td colspan="3" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campNewEnergyCharging.offsiteParkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置电动自行车集中存放区域</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.campElectricBicycle.enabled" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电口数量</td>
          <td colspan="1" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campElectricBicycle.socketCount" :readonly="readonly" unit="个" />
          </td>
          <td colspan="2" class="cell-label">充电区域装置及灭火等要求</td>
          <td colspan="3" class="cell-value">
            <template v-if="readonly">
              <span class="inline-readonly">{{ model.safetyProfile.campElectricBicycle.installQualified || '—' }}</span>
            </template>
            <el-select v-else v-model="model.safetyProfile.campElectricBicycle.installQualified" clearable placeholder="请选择" style="width: 100%" aria-label="请选择">
              <el-option v-for="opt in yesNoNaOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地电动自行车停放数量（营地内）</td>
          <td colspan="3" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campElectricBicycle.onsiteParkingCount" :readonly="readonly" unit="辆" />
          </td>
          <td colspan="3" class="cell-label">营地电动自行车停放数量（营地外）</td>
          <td colspan="3" class="cell-value">
            <ProfileNumberInput v-model="model.safetyProfile.campElectricBicycle.offsiteParkingCount" :readonly="readonly" unit="辆" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label cell-label-top">注</td>
          <td colspan="10" class="cell-value notes-cell">
            <p v-for="(note, idx) in profileNotes" :key="idx">{{ idx + 1 }}. {{ note }}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

    <el-dialog
      v-model="subDetailVisible"
      :title="subDetail?.name ? `分包单位详情 · ${subDetail.name}` : '分包单位详情'"
      width="860px"
      top="6vh"
      destroy-on-close
      append-to-body
    >
      <template v-if="subDetail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="分包单位名称">{{ subDetail.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ subDetail.unitType || '—' }}</el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ subDetail.projectName || model.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <span
              v-if="subDetail.source === 'application'"
              class="ap-status-tag"
              :class="approveStatusTagClass(subDetail.status)"
            >
              {{ subDetail.status }}
            </span>
            <span v-else>{{ subDetail.status || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="项目负责人">{{ subDetail.projectLeaderContact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="安全管理人员" :span="2">{{ subDetail.safetyManagerContact || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="subDetail.orgStructureDesc" label="组织架构说明" :span="2">
            {{ subDetail.orgStructureDesc }}
          </el-descriptions-item>
          <el-descriptions-item label="安全许可证编号">
            {{ subDetail.safetyLicense?.licenseNo || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="许可证有效期">
            {{ subDetail.safetyLicense?.expiry || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="许可证照片" :span="2">
            <FileAttachmentPreview
              :name="subDetail.safetyLicense?.photoName"
              :url="subDetail.safetyLicense?.photoUrl"
              empty-text="未上传"
              size="lg"
            />
          </el-descriptions-item>
          <el-descriptions-item label="劳务合同编号">
            {{ subDetail.laborContract?.contractNo || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="合同金额">
            {{
              subDetail.laborContract?.amount
                ? /万元/.test(subDetail.laborContract.amount)
                  ? subDetail.laborContract.amount
                  : `${subDetail.laborContract.amount}万元`
                : '—'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="合同附件" :span="2">
            <FileAttachmentPreview
              :name="subDetail.laborContract?.fileName"
              :url="subDetail.laborContract?.fileUrl"
              empty-text="未上传"
              size="md"
            />
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="subDetail.qualifications?.length" class="dialog-sub-title">资质证书</div>
        <el-table
          v-if="subDetail.qualifications?.length"
          :data="subDetail.qualifications"
          border
          size="small"
          class="ap-table"
        >
          <el-table-column type="index" label="序号" width="56" align="center" />
          <el-table-column prop="certNo" label="证书编号" min-width="160" show-overflow-tooltip />
          <el-table-column label="附件" min-width="200">
            <template #default="{ row }">
              <FileAttachmentPreview
                :name="row.fileName"
                :url="row.fileUrl"
                empty-text="—"
                size="sm"
              />
            </template>
          </el-table-column>
        </el-table>
      </template>
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

.dialog-sub-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text, #1a1a1a);
}

.list-dialog-tip {
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
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

.subcontractor-table :deep(.person-contact-text),
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
