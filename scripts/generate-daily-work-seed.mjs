/**
 * 从结构化行数据生成 dailyWorkSeed.json（对齐线下施工作业统计表）
 * 运行：node scripts/generate-daily-work-seed.mjs
 */
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { parseDailyWorkSheet, parseSheetDate } from '../src/coc/utils/dailyWorkImport.js'
import { classifyDailyWorkRecord } from '../src/coc/utils/dailyWorkClassifier.js'
import { EXCEL_COL_MAP, DAILY_WORK_DATA_START_ROW } from '../src/coc/config/dailyWorkSchema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/coc/mock/dailyWorkSeed.json')

const SHEET_NAME = '2026.6.30'
const REPORT_DATE = '2026-06-30'

const MEASURES = {
  动土: `动土作业管控措施：
1.召开班前会，安全员告知施工人员注意事项，且安全员在现场监管；
2.现场施工人员必须进行技术交底，如有夜间施工配备足够照明，不留盲点；
3、工作结束后，现场检查场地清理情况并进行适航恢复。
高温天气作业防中暑管控措施：
1、加强防暑降温工作的领导，在入暑以前，制订防暑降温计划和落产具体措施。 要加强对全体职工防暑降温知识教育，增强自防中暑和工伤事故的能力。 注意保持充足的睡眠时间。
2、应根据本地气温情况，适当调整作息时间，利用早晨、傍晚气温较低时工作，延长休息时间等办法，减少阳光辐射热，以防中暑；
3、进行技术革新，改革工艺和设备，尽量采取机械化、自动化，减轻建筑业劳动强度。
4、备好相应药物，如十滴水、仁丹、风油精、藿香正气水，以防紧急之用`,
  吊装: `吊装作业管控措施:
1、吊装作业必须执行审批制度，由专人核查作业条件，经审批同意后再进行作业，严格执行十不吊制度；
2、特种作业人员持证上岗，管理人员加强巡视；
3、设置起重吊装公示牌，安排专人旁站监督，禁止无关人员进入作业区域；
4、检查吊装钢丝绳磨损情况，如果不满足规范要求立马更换；
5、吊装设备限高控制，严格控制在净空限高下；
6、暴雨、大雾及六级以上风时，不应露天作业。`,
  动火: `1、开展班前教育，告知施工人员注意事项；
2、动火作业必须办理动火令，经审批后方可进行动火作业；
3、特种作业人员全部持证上岗，禁止无证人员操作特种作业；
4、焊接区域必须设置相应灭火器等消防设施；
5、在施工过程中，施工人员必须佩带安全防护用品，避免电弧伤害；
6、夜间施工照明需要满足照度要求。
7、每天工作结束后，看护人检查场地清理情况并填报，形成闭合；
8、动火作业严格落实“十不动火”：本工程主要涉及未经审批不动火；防火、灭火措施不落实不动火；防火监护人不在现场不动火；周围的可燃、易燃杂物未清除不动火；未配备相应的灭火器材不动火。
9、动火作业严格落实“三个一律”：一律不准进行交叉作业；一律清除现场可燃物质；一律检测可燃气体含量、保持良好通风，严防交叉作业动火引发爆炸、火灾事故。
10、五级风以上（含五级）天气，原则上禁止露天动火作业，因生产确需动火，动火作业应提级管理`,
  高处: `1、使用安全带和安全绳‌：高处作业时，必须使用安全带和安全绳。安全带应高挂低用，即安全带的绳端挂在高处，作业人员在低处作业。安全绳的正确使用也是防止高空跌落的重要措施。
2、高处作业人员必须取得特种作业操作证后方可上岗作业，作业过程中必须严格遵守安全规范，做好安全防范措施。企业应确保作业人员具备相应的资质和培训。
3、禁止嬉戏打闹‌：在高处作业时，严禁嬉戏打闹，以防止意外发生`,
  不停航: `1、工程技术措施： 严格按照批复的不停航施工专项施工方案进行施工。
2、管理措施： 必须编制专项施工方案并组织专家论证；实行交底制度；安排专人全程指挥、巡视，检查。
3、教育培训措施： 对管理人员、作业人员进行安全技术交底和培训，使其熟知危险因素、作业流程、险情判别和应急处置方法。
4、个体防护措施： 人员必须佩戴安全帽，高处作业必须系挂安全带。`,
}

const CTX_AM = {
  leadUnit: '深圳机场集团/建设工程指挥部',
  projectName: '三跑道扩建机场工程（软基工程）',
  contractor: '中国电建集团航空港建设有限公司',
  ownerProjectManager: '尹永强/19898161316',
  ownerSafetyManager: '李想/13713651799，李  斌/17688169568，杨秀峰/13715276996，熊良东/13714942013，郭大立/15815515167',
  contractorProjectManager: '阮政鹏/18065003610',
  contractorSafetyManager: '孙贯雨/18759189257，周雪聪/13755978704，郭  洋/18639067031，张昕/18859327190，孙丙昊/18339538667，徐万顺/13367431493',
  supervisorProjectManager: '胡庭怀/15874414098',
  supervisorSafetyManager: '聂涵剑/15974177662，章建/17771893709，刘名源/18873429197，杨常青/13789371185，孙先群/18673925752，王兴海/13150066122',
  startTime: `${REPORT_DATE} 00:00`,
  endTime: `${REPORT_DATE} 07:00`,
  majorStartTime: `${REPORT_DATE} 00:00`,
  majorEndTime: `${REPORT_DATE} 07:00`,
  majorOwnerSafetyManager: '李想/13713651799，李  斌/17688169568，杨秀峰/13715276996，熊良东/13714942013，郭大立/15815515167',
  majorContractorSafetyManager: '孙贯雨/18759189257，周雪聪/13755978704，郭  洋/18639067031，张昕/18859327190，孙丙昊/18339538667，徐万顺/13367431493',
  majorSupervisorSafetyManager: '聂涵剑/15974177662，章建/17771893709，刘名源/18873429197，杨常青/13789371185，孙先群/18673925752，王兴海/13150066122',
  majorControlMeasures: MEASURES.不停航,
}

const CTX_PM = {
  ...CTX_AM,
  ownerSafetyManager: '肖滔/18924605575',
  contractorSafetyManager: '孙贯雨/18759188925，张昕/18859327190，周雪聪/13755978704',
  supervisorSafetyManager: '陈刚/15027154915',
  startTime: `${REPORT_DATE} 08:00`,
  endTime: `${REPORT_DATE} 20:00`,
  majorStartTime: `${REPORT_DATE} 08:00`,
  majorEndTime: `${REPORT_DATE} 20:00`,
  majorOwnerSafetyManager: '肖滔/18924605575',
  majorContractorSafetyManager: '孙贯雨/18759188925，张昕/18859327190，周雪聪/13755978704',
  majorSupervisorSafetyManager: '黄义雄/18878995887，陈刚/15027154915，苏发龙/13457803996，欧业江/13557375730，李佳葳/15574702571',
}

const MAJOR_AM = `E9-1及E9-2土面区袖阀钻孔、袖阀注浆
5-1、5-2土面区：G3土面区材料进场、临时便道施工
G3土面区管线探挖
Y2土面区材料设备进场、袖阀钻孔、袖阀注浆施工、人工探挖
Y9土面区材料设备进场、袖阀钻孔、袖阀注浆施工、人工探挖、施工便道施工
Y1、Y11土面区材料设备进场、袖阀钻孔、袖阀注浆施工
16L-1、4-2土面区检修注浆管
H-5制浆站制浆施工`

const MAJOR_PM = `H-5制浆站建设、材料进场
Y1、Y2、Y9、Y11设备维修保养
Y1 Y2设备材料进场
3-2区新建S3施工道口场地清表、管线探挖、临时便道施工
Y11高压旋喷施工、材料进场`

/** 参考 2026.6.30 线下统计表 · 三跑道软基工程 */
const SOURCE_ROWS = [
  { ...CTX_AM, workArea: 'E9-1、E9-2土面区', workContent: '袖阀钻孔、袖阀注浆', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土, majorWorkContent: MAJOR_AM, majorProjectCategory: '不停航施工' },
  { workArea: '5-1、5-2土面区', workContent: 'G3土面区材料进场、临时便道施工', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装, majorWorkContent: MAJOR_AM, majorProjectCategory: '不停航施工' },
  { dangerWorkCategory: '动火作业', dangerControlMeasures: MEASURES.动火 },
  { workArea: 'G3土面区', workContent: '管线探挖', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土 },
  { workArea: 'Y2土面区', workContent: '材料设备进场、袖阀钻孔、袖阀注浆施工、人工探挖', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土 },
  { workArea: 'Y2土面区', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装 },
  { workArea: 'Y9土面区', workContent: '材料设备进场、袖阀钻孔、袖阀注浆施工、人工探挖、施工便道施工', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土 },
  { workArea: 'Y9土面区', dangerWorkCategory: '动火作业', dangerControlMeasures: MEASURES.动火 },
  { workArea: 'Y9土面区', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装 },
  { workArea: 'Y1、Y11土面区', workContent: '材料设备进场、袖阀钻孔、袖阀注浆施工', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土 },
  { workArea: 'Y1、Y11土面区', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装 },
  { workArea: '16L-1、4-2土面区', workContent: '检修注浆管', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土 },
  { workArea: 'H-5', workContent: '制浆站制浆施工', dangerWorkCategory: '不涉及危险作业', dangerControlMeasures: '/' },
  { ...CTX_PM, workArea: 'H-5', workContent: '注浆站建设、材料进场', dangerWorkCategory: '高处作业', dangerControlMeasures: MEASURES.高处, majorWorkContent: MAJOR_PM, majorProjectCategory: '不停航施工' },
  { dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装 },
  { workArea: 'Y1、Y2、Y9、Y11', workContent: '设备维修保养', dangerWorkCategory: '不涉及危险作业', dangerControlMeasures: '/', majorWorkContent: MAJOR_PM, majorProjectCategory: '不停航施工' },
  { workArea: 'Y1 Y2', workContent: '设备材料进场', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装, supervisorSafetyManager: '黄义雄/18878995887' },
  { workArea: '3-2区', workContent: '新建S3施工道口场地清表、管线探挖、临时便道施工', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土, supervisorSafetyManager: '苏发龙/13457803996' },
  { workArea: 'Y11', workContent: '高压旋喷施工、材料进场', dangerWorkCategory: '吊装作业', dangerControlMeasures: MEASURES.吊装, supervisorSafetyManager: '苏发龙/13457803996' },
  { workArea: 'Y11', dangerWorkCategory: '动土作业', dangerControlMeasures: MEASURES.动土, supervisorSafetyManager: '苏发龙/13457803996' },
]

function recordToExcelRow(record) {
  const row = Array(24).fill('')
  Object.entries(EXCEL_COL_MAP).forEach(([col, key]) => {
    const val = record[key]
    if (val != null && String(val).trim()) row[Number(col) - 1] = val
  })
  return row
}

const padding = Array(DAILY_WORK_DATA_START_ROW - 1).fill([])
const sheetRows = [...padding, ...SOURCE_ROWS.map(recordToExcelRow)]
const parsed = parseDailyWorkSheet(SHEET_NAME, sheetRows, { includeNormalRows: true })

const CREATED_AT = `${REPORT_DATE}T08:00:00.000Z`
const records = parsed.map((row, i) => {
  const cls = classifyDailyWorkRecord(row)
  return {
    ...row,
    id: `seed-${SHEET_NAME.replace(/\./g, '')}-${String(i + 1).padStart(3, '0')}`,
    source: 'seed',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    classifyBucket: cls.bucket,
    classifyDanger: cls.danger,
    classifyMajor: cls.major,
  }
})

const payload = {
  meta: {
    version: '2026.6.30-v1',
    sourceFile: '建设工程指挥部施工作业统计表.xlsx',
    sheetName: SHEET_NAME,
    reportDate: parseSheetDate(SHEET_NAME),
    generatedAt: new Date().toISOString(),
    count: records.length,
  },
  records,
}

writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8')
console.log(`Wrote ${records.length} records to ${outPath} (sheet: ${SHEET_NAME})`)
