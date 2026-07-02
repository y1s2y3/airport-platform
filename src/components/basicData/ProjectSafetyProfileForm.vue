<script setup>
import { Plus, Delete } from '@element-plus/icons-vue'
import ProfileImageUpload from './ProfileImageUpload.vue'
import {
  projectTypeOptions,
  permitStatusOptions,
} from '../../mock/projectBasicInfo'
import { profileDemoImages } from '../../mock/profileImageDemo'
import {
  yesNoOptions,
  profileNotes,
  profileRemarkNotes,
  createSubcontractorBlock,
  createDangerousWorkRow,
  createMachineryRow,
} from '../../mock/projectSafetyProfile'

defineProps({
  model: {
    type: Object,
    required: true,
  },
})

function ensureProfile(model) {
  if (!model.safetyProfile) {
    model.safetyProfile = {}
  }
  return model.safetyProfile
}

function addSubcontractor(model) {
  ensureProfile(model).subcontractorBlocks.push(createSubcontractorBlock())
}

function removeSubcontractor(model, index) {
  const blocks = ensureProfile(model).subcontractorBlocks
  if (blocks.length <= 1) return
  blocks.splice(index, 1)
}

function addDangerousSubProject(model) {
  ensureProfile(model).dangerousSubProjects.push(createDangerousWorkRow())
}

function addDangerousOperation(model) {
  ensureProfile(model).dangerousOperations.push(createDangerousWorkRow())
}

function addLargeMachinery(model) {
  ensureProfile(model).largeMachinery.push(createMachineryRow())
}

function addSmallMachinery(model) {
  ensureProfile(model).smallMachinery.push(createMachineryRow())
}
</script>

<template>
  <div v-if="model" class="safety-profile-sheet">
    <div class="sheet-head">
      <div class="sheet-head-main">
        <div class="sheet-doc-title">建设工程指挥部项目施工安全画像</div>
        <div class="sheet-version">V1.0</div>
      </div>
      <div class="sheet-head-effect">
        <div class="effect-label">项目效果图</div>
        <ProfileImageUpload
          v-model="model.projectEffectImage"
          :demo-src="profileDemoImages.projectEffect"
        />
      </div>
    </div>

    <table class="profile-table" cellspacing="0" cellpadding="0">
      <colgroup>
        <col span="12" class="col-grid" />
      </colgroup>
      <tbody>
        <tr>
          <td colspan="12" class="section-row">一、项目基础信息</td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">项目名称</td>
          <td colspan="10" class="cell-value">
            <el-input v-model="model.projectName" placeholder="请输入项目名称" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">施工单位</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.contractorUnit" />
          </td>
          <td colspan="2" class="cell-label">监理单位</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.supervisorUnit" />
          </td>
          <td colspan="2" class="cell-label">分包单位</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.subcontractorUnit" placeholder="/" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label cell-label-top">项目概况</td>
          <td colspan="10" class="cell-value">
            <el-input v-model="model.overview" type="textarea" :rows="6" resize="vertical" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">施工地点</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.constructionSite" />
          </td>
          <td colspan="2" class="cell-label">入场时间</td>
          <td colspan="1" class="cell-value">
            <el-date-picker
              v-model="model.entryTime"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </td>
          <td colspan="2" class="cell-label">计划竣工时间</td>
          <td colspan="1" class="cell-value">
            <el-date-picker
              v-model="model.plannedCompletionTime"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </td>
          <td colspan="2" class="cell-label">项目高峰期人数</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.peakPersonnelCount" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">项目类型</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.projectType" filterable allow-create placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in projectTypeOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">施工许可手续办理情况</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.permitStatus" placeholder="请选择" style="width: 100%">
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
            <el-input v-model="model.deptHeadContact" placeholder="姓名 / 电话" />
          </td>
          <td colspan="2" class="cell-label">项目经理（项目负责人）姓名及电话</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.projectManagerContact" placeholder="姓名 / 电话" />
          </td>
          <td colspan="2" class="cell-label">安全联络员姓名及电话</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyLiaisonContact" placeholder="姓名 / 电话" />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label cell-label-top">备注</td>
          <td colspan="10" class="cell-value notes-cell">
            <p v-for="(note, idx) in profileRemarkNotes" :key="idx">{{ idx + 1 }}. {{ note }}</p>
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
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.legalPersonContact" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="5" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.companySafetyDirectorContact" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">项目上级管理单位全称</td>
          <td colspan="10" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.superiorManagementUnit" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">总监姓名及电话</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.chiefSupervisorContact" />
          </td>
          <td colspan="2" class="cell-label">总代姓名及电话</td>
          <td colspan="5" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.chiefRepresentativeContact" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">分管安全</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.safetyDivisionContact" />
          </td>
          <td colspan="2" class="cell-label">安全专监姓名及电话</td>
          <td colspan="5" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.safetySupervisorContact" />
          </td>
        </tr>
        <tr>
          <td
            v-for="(qual, qIdx) in model.safetyProfile.supervisorUnit.qualifications"
            :key="`sup-qual-${qIdx}`"
            colspan="4"
            class="cell-label"
          >
            {{ qual.label }}
          </td>
        </tr>
        <tr>
          <template v-for="(qual, qIdx) in model.safetyProfile.supervisorUnit.qualifications" :key="`sup-cert-${qIdx}`">
            <td colspan="1" class="cell-label">证书编号</td>
            <td colspan="1" class="cell-value">
              <el-input v-model="qual.certNo" />
            </td>
            <td colspan="2" class="cell-label">持证证件照片</td>
          </template>
        </tr>
        <tr>
          <template v-for="(qual, qIdx) in model.safetyProfile.supervisorUnit.qualifications" :key="`sup-photo-${qIdx}`">
            <td colspan="4" class="cell-value">
              <ProfileImageUpload v-model="qual.photo" demo-variant="certificate" compact />
            </td>
          </template>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">单位安全生产许可证编号</td>
          <td colspan="4" class="cell-value">
            <el-input v-model="model.safetyProfile.supervisorUnit.safetyLicenseNo" />
          </td>
          <td colspan="2" class="cell-label">安全生产许可证有效期</td>
          <td colspan="1" class="cell-value">
            <el-date-picker
              v-model="model.safetyProfile.supervisorUnit.safetyLicenseExpiry"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </td>
          <td colspan="2" class="cell-label">安全生产许可证照片</td>
          <td colspan="1" class="cell-value">
            <ProfileImageUpload
              v-model="model.safetyProfile.supervisorUnit.safetyLicensePhoto"
              demo-variant="certificate"
              compact
            />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">施工总承包单位</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">公司法人姓名及电话</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.legalPersonContact" />
          </td>
          <td colspan="2" class="cell-label">公司安全总监姓名及电话</td>
          <td colspan="5" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.companySafetyDirectorContact" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">项目上级管理单位全称</td>
          <td colspan="10" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.superiorManagementUnit" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">项目负责人姓名及电话</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.projectLeaderContact" />
          </td>
          <td colspan="2" class="cell-label">安全总监姓名及电话</td>
          <td colspan="5" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.safetyDirectorContact" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">安全管理人员姓名及电话</td>
          <td colspan="10" class="cell-value">
            <el-input v-model="model.safetyProfile.generalContractor.safetyManagerContact" />
          </td>
        </tr>
        <tr>
          <td
            v-for="(qual, qIdx) in model.safetyProfile.generalContractor.qualifications"
            :key="`gc-qual-${qIdx}`"
            colspan="4"
            class="cell-label"
          >
            {{ qual.label }}
          </td>
        </tr>
        <tr>
          <template v-for="(qual, qIdx) in model.safetyProfile.generalContractor.qualifications" :key="`gc-cert-${qIdx}`">
            <td colspan="1" class="cell-label">证书编号</td>
            <td colspan="1" class="cell-value">
              <el-input v-model="qual.certNo" />
            </td>
            <td colspan="2" class="cell-label">持证证件照片</td>
          </template>
        </tr>
        <tr>
          <template v-for="(qual, qIdx) in model.safetyProfile.generalContractor.qualifications" :key="`gc-photo-${qIdx}`">
            <td colspan="4" class="cell-value">
              <ProfileImageUpload v-model="qual.photo" demo-variant="certificate" compact />
            </td>
          </template>
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
              style="width: 100%"
            />
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

        <template v-for="(block, bIdx) in model.safetyProfile.subcontractorBlocks" :key="`sub-${bIdx}`">
          <tr>
            <td colspan="12" class="section-row section-row-sub">
              分包单位及分包专业
              <span class="inline-actions">
                <el-button link type="primary" :icon="Plus" @click="addSubcontractor(model)">增加</el-button>
                <el-button
                  v-if="model.safetyProfile.subcontractorBlocks.length > 1"
                  link
                  type="danger"
                  :icon="Delete"
                  @click="removeSubcontractor(model, bIdx)"
                >
                  删除
                </el-button>
              </span>
            </td>
          </tr>
          <tr>
            <td colspan="2" class="cell-label">分包单位名称</td>
            <td colspan="10" class="cell-value">
              <el-input v-model="block.unitName" />
            </td>
          </tr>
          <tr>
            <td colspan="2" class="cell-label">项目负责人姓名及电话</td>
            <td colspan="3" class="cell-value">
              <el-input v-model="block.projectLeaderContact" />
            </td>
            <td colspan="2" class="cell-label">安全管理人员姓名及电话</td>
            <td colspan="4" class="cell-value">
              <el-input v-model="block.safetyManagerContact" />
            </td>
          </tr>
          <tr>
            <td colspan="2" class="cell-label">安全管理人员姓名及电话</td>
            <td colspan="9" class="cell-value">
              <el-input v-model="block.safetyManagerContact2" />
            </td>
          </tr>
          <tr>
            <td v-for="(qual, qIdx) in block.qualifications" :key="`sub-qual-${bIdx}-${qIdx}`" colspan="4" class="cell-label">
              {{ qual.label }}
            </td>
          </tr>
          <tr>
            <template v-for="(qual, qIdx) in block.qualifications" :key="`sub-cert-${bIdx}-${qIdx}`">
              <td colspan="1" class="cell-label">证书编号</td>
              <td colspan="1" class="cell-value">
                <el-input v-model="qual.certNo" />
              </td>
              <td colspan="2" class="cell-label">资质证书照片</td>
            </template>
          </tr>
          <tr>
            <template v-for="(qual, qIdx) in block.qualifications" :key="`sub-photo-${bIdx}-${qIdx}`">
              <td colspan="4" class="cell-value">
                <ProfileImageUpload v-model="qual.photo" demo-variant="certificate" compact />
              </td>
            </template>
          </tr>
          <tr>
            <td colspan="2" class="cell-label">单位安全生产许可证编号</td>
            <td colspan="4" class="cell-value">
              <el-input v-model="block.safetyLicenseNo" />
            </td>
            <td colspan="2" class="cell-label">安全生产许可证有效期</td>
            <td colspan="1" class="cell-value">
              <el-date-picker
                v-model="block.safetyLicenseExpiry"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY年MM月DD日"
                placeholder="请选择日期"
                style="width: 100%"
              />
            </td>
            <td colspan="2" class="cell-label">安全生产许可证照片</td>
            <td colspan="1" class="cell-value">
              <ProfileImageUpload
                v-model="block.safetyLicensePhoto"
                demo-variant="certificate"
                compact
              />
            </td>
          </tr>
        </template>

        <tr>
          <td colspan="12" class="section-row">三、危大工程、危险作业信息</td>
        </tr>
        <tr>
          <td colspan="6" class="list-toolbar">
            工程涉及危险性较大的分部分项工程
            <el-button link type="primary" :icon="Plus" @click="addDangerousSubProject(model)">新增行</el-button>
          </td>
          <td colspan="6" class="list-toolbar">
            工程涉及危险作业
            <el-button link type="primary" :icon="Plus" @click="addDangerousOperation(model)">新增行</el-button>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">危险性较大的分部分项工程名称</td>
          <td colspan="2" class="cell-label">具体作业内容</td>
          <td colspan="2" class="cell-label">作业周期（X年X月-X年X月）</td>
          <td colspan="2" class="cell-label">危险作业类别</td>
          <td colspan="2" class="cell-label">具体作业内容</td>
          <td colspan="2" class="cell-label">作业周期（X年X月-X年X月）</td>
        </tr>
        <tr v-for="(row, idx) in Math.max(model.safetyProfile.dangerousSubProjects.length, model.safetyProfile.dangerousOperations.length)" :key="`danger-${idx}`">
          <template v-if="model.safetyProfile.dangerousSubProjects[idx]">
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousSubProjects[idx].name" />
            </td>
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousSubProjects[idx].content" />
            </td>
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousSubProjects[idx].period" placeholder="X年X月-X年X月" />
            </td>
          </template>
          <template v-else>
            <td colspan="6" class="cell-value cell-empty" />
          </template>
          <template v-if="model.safetyProfile.dangerousOperations[idx]">
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousOperations[idx].name" />
            </td>
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousOperations[idx].content" />
            </td>
            <td colspan="2" class="cell-value">
              <el-input v-model="model.safetyProfile.dangerousOperations[idx].period" placeholder="X年X月-X年X月" />
            </td>
          </template>
          <template v-else>
            <td colspan="6" class="cell-value cell-empty" />
          </template>
        </tr>

        <tr>
          <td colspan="12" class="section-row">四、工地施工机械、设备情况</td>
        </tr>
        <tr>
          <td colspan="12" class="section-row section-row-sub">
            大型施工机械和施工运输车辆
            <span class="inline-actions">
              <el-button link type="primary" :icon="Plus" @click="addLargeMachinery(model)">新增行</el-button>
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">机械设备名称</td>
          <td colspan="1" class="cell-label">数量</td>
          <td colspan="2" class="cell-label">进场验收是否合格</td>
          <td colspan="2" class="cell-label">设备型号</td>
          <td colspan="2" class="cell-label">是否建立设备管理台账</td>
          <td colspan="1" class="cell-label">维护保养情况</td>
          <td colspan="2" class="cell-label">进场截止时间</td>
        </tr>
        <tr v-for="(row, idx) in model.safetyProfile.largeMachinery" :key="`large-${idx}`">
          <td colspan="2" class="cell-value"><el-input v-model="row.name" /></td>
          <td colspan="1" class="cell-value"><el-input v-model="row.quantity" /></td>
          <td colspan="2" class="cell-value">
            <el-select v-model="row.entryInspectionOk" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-value"><el-input v-model="row.model" /></td>
          <td colspan="2" class="cell-value">
            <el-select v-model="row.hasLedger" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="1" class="cell-value"><el-input v-model="row.maintenance" /></td>
          <td colspan="2" class="cell-value">
            <el-date-picker
              v-model="row.entryDeadline"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row section-row-sub">
            小型施工机具
            <span class="inline-actions">
              <el-button link type="primary" :icon="Plus" @click="addSmallMachinery(model)">新增行</el-button>
            </span>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">施工机具名称</td>
          <td colspan="1" class="cell-label">数量</td>
          <td colspan="2" class="cell-label">进场验收是否合格</td>
          <td colspan="2" class="cell-label">设备型号</td>
          <td colspan="2" class="cell-label">是否建立设备管理台账</td>
          <td colspan="1" class="cell-label">维护保养情况</td>
          <td colspan="2" class="cell-label">进场截止时间</td>
        </tr>
        <tr v-for="(row, idx) in model.safetyProfile.smallMachinery" :key="`small-${idx}`">
          <td colspan="2" class="cell-value"><el-input v-model="row.name" /></td>
          <td colspan="1" class="cell-value"><el-input v-model="row.quantity" /></td>
          <td colspan="2" class="cell-value">
            <el-select v-model="row.entryInspectionOk" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-value"><el-input v-model="row.model" /></td>
          <td colspan="2" class="cell-value">
            <el-select v-model="row.hasLedger" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="1" class="cell-value"><el-input v-model="row.maintenance" /></td>
          <td colspan="2" class="cell-value">
            <el-date-picker
              v-model="row.entryDeadline"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY年MM月DD日"
              placeholder="请选择日期"
              style="width: 100%"
            />
          </td>
        </tr>

        <tr>
          <td colspan="2" class="cell-label">是否涉及非道面</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.safetyProfile.nonPavementInvolved" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">机具要求</td>
          <td colspan="6" class="cell-value">
            <el-input v-model="model.safetyProfile.machineryRequirements" />
          </td>
        </tr>

        <tr>
          <td colspan="3" class="cell-label">是否设置新能源汽车充电桩</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.siteNewEnergyCharging.enabled" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电桩数量</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.safetyProfile.siteNewEnergyCharging.pileCount" />
          </td>
          <td colspan="2" class="cell-label">充电桩安装是否符合要求</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.siteNewEnergyCharging.installQualified" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">现场新能源汽车停放数量（工地内）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.siteNewEnergyCharging.onsiteParkingCount" />
          </td>
          <td colspan="3" class="cell-label">现场新能源汽车停放数量（工地外）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.siteNewEnergyCharging.offsiteParkingCount" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置电动自行车集中存放区域</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.siteElectricBicycle.enabled" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电口数量</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.safetyProfile.siteElectricBicycle.socketCount" />
          </td>
          <td colspan="2" class="cell-label">充电区域装置及灭火等要求</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.siteElectricBicycle.installQualified" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">现场电动自行车停放数量（工地内）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.siteElectricBicycle.onsiteParkingCount" />
          </td>
          <td colspan="3" class="cell-label">现场电动自行车停放数量（工地外）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.siteElectricBicycle.offsiteParkingCount" />
          </td>
        </tr>

        <tr>
          <td colspan="12" class="section-row">五、营地、生活区情况</td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">是否有营地</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.hasCamp" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地地址</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campAddress" />
          </td>
          <td colspan="2" class="cell-label">营地大小（占地面积）</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campOccupiedArea" />
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地面积</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campArea" />
          </td>
          <td colspan="2" class="cell-label">营地总人数/人</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campTotalPeople" />
          </td>
          <td colspan="2" class="cell-label">营地视频数量/路</td>
          <td colspan="2" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.campVideoChannels" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地板房材质是否为阻燃聚氨酯泡沫彩钢夹芯板</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.campBuildingMaterialOk" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">视频是否全覆盖</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.videoFullCoverage" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">视频含食堂和燃气/电气</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.videoIncludesCanteenGas" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="cell-label">营地是否有食堂</td>
          <td colspan="2" class="cell-value">
            <el-select v-model="model.safetyProfile.camp.campHasCanteen" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">营地食堂使用燃料/能源</td>
          <td colspan="6" class="cell-value">
            <el-input v-model="model.safetyProfile.camp.canteenFuelType" />
          </td>
        </tr>

        <tr>
          <td colspan="3" class="cell-label">是否设置新能源汽车充电桩</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.campNewEnergyCharging.enabled" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电桩数量</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.safetyProfile.campNewEnergyCharging.pileCount" />
          </td>
          <td colspan="2" class="cell-label">充电桩安装是否符合要求</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.campNewEnergyCharging.installQualified" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地新能源汽车停放数量（营地内）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.campNewEnergyCharging.onsiteParkingCount" />
          </td>
          <td colspan="3" class="cell-label">营地新能源汽车停放数量（营地外）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.campNewEnergyCharging.offsiteParkingCount" />
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">是否设置电动自行车集中存放区域</td>
          <td colspan="1" class="cell-value">
            <el-select v-model="model.safetyProfile.campElectricBicycle.enabled" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
          <td colspan="2" class="cell-label">充电口数量</td>
          <td colspan="1" class="cell-value">
            <el-input v-model="model.safetyProfile.campElectricBicycle.socketCount" />
          </td>
          <td colspan="2" class="cell-label">充电区域装置及灭火等要求</td>
          <td colspan="3" class="cell-value">
            <el-select v-model="model.safetyProfile.campElectricBicycle.installQualified" clearable placeholder="请选择" style="width: 100%">
              <el-option v-for="opt in yesNoOptions" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </td>
        </tr>
        <tr>
          <td colspan="3" class="cell-label">营地电动自行车停放数量（营地内）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.campElectricBicycle.onsiteParkingCount" />
          </td>
          <td colspan="3" class="cell-label">营地电动自行车停放数量（营地外）</td>
          <td colspan="3" class="cell-value">
            <el-input v-model="model.safetyProfile.campElectricBicycle.offsiteParkingCount" />
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
</template>

<style scoped>
.safety-profile-sheet {
  border: 1px solid #7ea8c9;
  background: #fff;
}

.sheet-doc-title {
  padding: 10px 12px 4px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1px;
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px 10px;
  border-bottom: 1px solid #dceaf5;
}

.sheet-head-main {
  flex: 1;
  min-width: 0;
}

.sheet-head-effect {
  flex-shrink: 0;
  width: 180px;
  text-align: center;
}

.effect-label {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.sheet-version {
  padding: 0 0 4px;
  text-align: center;
  font-size: 13px;
  color: #666;
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

.inline-actions {
  float: right;
  font-weight: 400;
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
</style>
