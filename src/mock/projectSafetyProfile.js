export const yesNoOptions = ['是', '否']

export function emptyQualificationTriple() {
  return [
    { label: '资质证件', certNo: '', photo: '' },
    { label: '职称证书', certNo: '', photo: '' },
    { label: '资格证书', certNo: '', photo: '' },
  ]
}

export function createSupervisorUnitBlock(overrides = {}) {
  return {
    legalPersonContact: '',
    companySafetyDirectorContact: '',
    superiorManagementUnit: '',
    chiefSupervisorContact: '',
    chiefRepresentativeContact: '',
    safetyDivisionContact: '',
    safetySupervisorContact: '',
    qualifications: emptyQualificationTriple(),
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    ...overrides,
    qualifications: overrides.qualifications?.length
      ? overrides.qualifications
      : emptyQualificationTriple(),
  }
}

export function createGeneralContractorBlock(overrides = {}) {
  return {
    unitName: '',
    legalPersonContact: '',
    companySafetyDirectorContact: '',
    superiorManagementUnit: '',
    projectLeaderContact: '',
    safetyDirectorContact: '',
    safetyManagerContact: '',
    qualifications: [
      { label: '建筑施工企业项目负责人安全生产考核合格证书（安全B证）', certNo: '', photo: '' },
      { label: '职称证书', certNo: '', photo: '' },
      { label: '资格证书', certNo: '', photo: '' },
    ],
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    ...overrides,
    qualifications: overrides.qualifications?.length
      ? overrides.qualifications
      : [
          { label: '建筑施工企业项目负责人安全生产考核合格证书（安全B证）', certNo: '', photo: '' },
          { label: '职称证书', certNo: '', photo: '' },
          { label: '资格证书', certNo: '', photo: '' },
        ],
  }
}

export function createSubcontractorBlock(overrides = {}) {
  return {
    unitName: '',
    projectLeaderContact: '',
    safetyManagerContact: '',
    safetyManagerContact2: '',
    qualifications: emptyQualificationTriple(),
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    ...overrides,
    qualifications: overrides.qualifications?.length
      ? overrides.qualifications
      : emptyQualificationTriple(),
  }
}

export function createDangerousWorkRow(overrides = {}) {
  return {
    name: '',
    content: '',
    period: '',
    ...overrides,
  }
}

export function createMachineryRow(overrides = {}) {
  return {
    name: '',
    quantity: '',
    entryInspectionOk: '',
    model: '',
    hasLedger: '',
    maintenance: '',
    entryDeadline: '',
    ...overrides,
  }
}

export function createChargingPileBlock(overrides = {}) {
  return {
    enabled: '',
    pileCount: '',
    installQualified: '',
    onsiteParkingCount: '',
    offsiteParkingCount: '',
    ...overrides,
  }
}

export function createElectricBicycleBlock(overrides = {}) {
  return {
    enabled: '',
    socketCount: '',
    installQualified: '',
    onsiteParkingCount: '',
    offsiteParkingCount: '',
    ...overrides,
  }
}

export function createCampBlock(overrides = {}) {
  return {
    hasCamp: '',
    campAddress: '',
    campArea: '',
    campOccupiedArea: '',
    campTotalPeople: '',
    campVideoChannels: '',
    campBuildingMaterialOk: '',
    videoFullCoverage: '',
    videoIncludesCanteenGas: '',
    campHasCanteen: '',
    canteenFuelType: '',
    ...overrides,
  }
}

export function createSafetyProfile(overrides = {}) {
  const profile = {
    supervisorUnit: createSupervisorUnitBlock(),
    generalContractor: createGeneralContractorBlock(),
    subcontractorBlocks: [createSubcontractorBlock()],
    dangerousSubProjects: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    dangerousOperations: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    largeMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    smallMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    nonPavementInvolved: '',
    machineryRequirements: '',
    siteNewEnergyCharging: createChargingPileBlock(),
    siteElectricBicycle: createElectricBicycleBlock(),
    camp: createCampBlock(),
    campNewEnergyCharging: createChargingPileBlock(),
    campElectricBicycle: createElectricBicycleBlock(),
    ...overrides,
  }

  profile.supervisorUnit = createSupervisorUnitBlock(overrides.supervisorUnit || profile.supervisorUnit)
  profile.generalContractor = createGeneralContractorBlock(overrides.generalContractor || profile.generalContractor)
  profile.subcontractorBlocks = (overrides.subcontractorBlocks || profile.subcontractorBlocks).map((item) =>
    createSubcontractorBlock(item),
  )
  profile.dangerousSubProjects = (overrides.dangerousSubProjects || profile.dangerousSubProjects).map((item) =>
    createDangerousWorkRow(item),
  )
  profile.dangerousOperations = (overrides.dangerousOperations || profile.dangerousOperations).map((item) =>
    createDangerousWorkRow(item),
  )
  profile.largeMachinery = (overrides.largeMachinery || profile.largeMachinery).map((item) => createMachineryRow(item))
  profile.smallMachinery = (overrides.smallMachinery || profile.smallMachinery).map((item) => createMachineryRow(item))
  profile.siteNewEnergyCharging = createChargingPileBlock(
    overrides.siteNewEnergyCharging || profile.siteNewEnergyCharging,
  )
  profile.siteElectricBicycle = createElectricBicycleBlock(
    overrides.siteElectricBicycle || profile.siteElectricBicycle,
  )
  profile.camp = createCampBlock(overrides.camp || profile.camp)
  profile.campNewEnergyCharging = createChargingPileBlock(
    overrides.campNewEnergyCharging || profile.campNewEnergyCharging,
  )
  profile.campElectricBicycle = createElectricBicycleBlock(
    overrides.campElectricBicycle || profile.campElectricBicycle,
  )

  return profile
}

export function mergeSafetyProfile(source) {
  return createSafetyProfile(source || {})
}

export const profileNotes = [
  '大型施工机械和施工运输车辆填写：塔吊、施工电梯、汽车吊、履带吊、挖掘机、混凝土泵车、叉车、皮卡车、洒水车、机械或人工挖机、混凝土罐车、泵车、吊头等。',
  '小型机具填写：如钢筋加工机械、切割机、焊机、木工圆盘锯、电动平板车、手持电动工具、氧气瓶等。',
  '分包单位信息可根据项目内容分包单位数量自行增加。',
]

export const profileRemarkNotes = [
  '如涉及跨年度工程，关键节点进度及分阶段施工时间范围请在项目概况中说明，并注明专业类别及施工范围。',
  '项目类型请根据项目实际情况选择；如无法区分行业主管部门或机场施工范畴的项目，请选择“机场内部配套工程”。',
]
