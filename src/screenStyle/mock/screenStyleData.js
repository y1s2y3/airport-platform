/**
 * 「大屏样式」演示数据（指挥部层级 · 安全态势）
 *
 * 纯前端假数据，仅供大屏样式样板演示使用（不接后端、不读业务台账）。
 * 口径对齐平台各模块（考核评分 / 视频监控与 AI 预警 / 机械设备 / 安全隐患 / 实名制 / 危大工程监测），
 * 当前版本只展示「安全态势」一个切页，质量态势与项目要素数据保留但切页隐藏。
 *
 * 数据栏版式参照大屏参考稿：一整栏连续面板，内部按区块（标题 + 英文小字 + 渐变分隔线）
 * 组织；指标是「切角牌」——标签在牌子上方、大数字居中、牌子下方两列小字（环比 / 补充口径）。
 */

export const SCREEN_TITLE = '工程建设智慧管控一体化平台'
export const SCREEN_SUBTITLE = 'SHENZHEN AIRPORT EXPANSION · SMART CONSTRUCTION CONTROL CENTER'

export const SCREEN_TABS = [
  { key: 'safety', label: '安全态势', en: 'SAFETY', visible: true },
  { key: 'quality', label: '质量态势', en: 'QUALITY', visible: true, disabled: true },
  { key: 'element', label: '项目要素', en: 'ELEMENTS', visible: true, disabled: true },
]

/** 近 7 日横轴（假数据） */
const WEEK = ['11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16']

function metric(title, en, items, tag = '', foot = '', bottom = null) {
  return { type: 'metric', title, en, items, tag, foot, bottom }
}

function bars(title, en, items, tag = '', foot = '') {
  return { type: 'bars', title, en, items, tag, foot }
}

function trend(title, en, series, unit = '', tag = '', foot = '') {
  return { type: 'trend', title, en, categories: WEEK, series, unit, tag, foot }
}

function list(title, en, items, tag = '', foot = '') {
  return { type: 'list', title, en, items, tag, foot }
}

/** 项目排行（安全隐患待整改排行等）：items = { name, value, unit, tone } */
function rank(title, en, items, tag = '', foot = '') {
  return { type: 'rank', title, en, items, tag, foot }
}

/** 环形图：items = { label, value, color } */
function donut(title, en, items, unit = '', tag = '', foot = '', bottom = null) {
  return { type: 'donut', title, en, items, unit, tag, foot, bottom }
}

/** 各切页数据 */
export const SCREEN_DATA = {
  /* ---------------- 安全态势（指挥部层级 · 左 3 右 3） ---------------- */
  safety: {
    left: [
      /* ① 安全态势分析：考核评分口径的汇总指标 + 分项得分构成环图 */
      metric('安全态势分析', 'SAFETY SITUATION', [
        {
          label: '安全考核得分', value: '86.5', unit: '分', tone: 'accent',
          sub: [['排名', '3 / 12'], ['环比', '+2.1', 'up']],
        },
        {
          label: '隐患整改率', value: '71.1', unit: '%', tone: 'plain',
          sub: [['目标', '75%'], ['差距', '3.9%']],
        },
        {
          label: '危大告警', value: 4, unit: '条', tone: 'gold',
          sub: [['未处置', '2 条'], ['已处置', '2 条']],
        },
      ], '考核', '数据源：考核评分 · 安全管理 / 巡检管理 14 项指标加权', {
        type: 'donut', unit: '分', items: [
          { label: '隐患整改', value: 24, color: '#5eeeff' },
          { label: '巡检管理', value: 21, color: '#f6c575' },
          { label: '危大监测', value: 18, color: '#ff6b7a' },
          { label: 'AI 与实名', value: 14, color: '#7fc8ff' },
        ],
      }),

      /* ② 视频监控统计 + AI 预警类型环图 */
      metric('视频监控统计', 'VIDEO & AI ALERT', [
        {
          label: '监控点', value: 198, unit: '路', tone: 'accent',
          sub: [['枪机', '132 路'], ['球机', '66 路']],
        },
        {
          label: '在线', value: 186, unit: '路', tone: 'plain',
          sub: [['在线率', '93.9%'], ['离线', '12 路']],
        },
        {
          label: 'AI 预警', value: 32, unit: '条', tone: 'gold',
          sub: [['未处置', '6 条'], ['处置率', '81.3%']],
        },
      ], '实时', '', {
        type: 'donut', unit: '条', items: [
          { label: '未戴安全帽', value: 14, color: '#5eeeff' },
          { label: '明火烟雾', value: 8, color: '#f6c575' },
          { label: '区域越界', value: 6, color: '#ff6b7a' },
          { label: '其他', value: 4, color: '#8fb6d8' },
        ],
      }),

      /* ③ 塔吊运行分析 + 报警类型环图 */
      metric('塔吊运行分析', 'TOWER CRANE', [
        {
          label: '塔吊总数', value: 42, unit: '台', tone: 'accent',
          sub: [['在用', '39 台'], ['停用', '3 台']],
        },
        {
          label: '在线', value: 39, unit: '台', tone: 'plain',
          sub: [['在线率', '92.9%'], ['离线', '3 台']],
        },
        {
          label: '今日报警', value: 6, unit: '次', tone: 'gold',
          sub: [['力矩超限', '2 次'], ['限位报警', '3 次']],
        },
      ], '实时', '', {
        type: 'alarm-list',
        columns: ['项目', '设备', '报警类型'],
        items: [
          { project: '东北站坪', device: 'TC-03', type: '力矩超限', tone: 'danger' },
          { project: 'T1航站楼', device: 'TC-11', type: '限位报警', tone: 'warn' },
          { project: '东北站坪', device: 'TC-05', type: '力矩超限', tone: 'danger' },
          { project: 'T3航站楼', device: 'TC-08', type: '超载报警', tone: 'warn' },
          { project: '2号隧道', device: 'TC-06', type: '限位报警', tone: 'info' },
        ],
      }),
    ],
    right: [
      /* ④ 安全隐患分析：等级分布环图 + 近 7 日处理趋势 */
      {
        type: 'metric',
        title: '安全隐患分析',
        en: 'HAZARD ANALYSIS',
        tag: '等级统计',
        items: [],
        filter: {
          options: ['本周', '本月'],
          data: {
            本周: [
              { label: '重大隐患', value: 3, unit: '条', tone: 'gold', sub: [['占比', '8%'], ['已闭环', '2 条']] },
              { label: '较大隐患', value: 11, unit: '条', tone: 'accent', sub: [['占比', '29%'], ['已闭环', '7 条']] },
              { label: '一般隐患', value: 24, unit: '条', tone: 'plain', sub: [['占比', '63%'], ['已闭环', '18 条']] },
            ],
            本月: [
              { label: '重大隐患', value: 19, unit: '条', tone: 'gold', sub: [['占比', '8%'], ['已闭环', '14 条']] },
              { label: '较大隐患', value: 53, unit: '条', tone: 'accent', sub: [['占比', '21%'], ['已闭环', '39 条']] },
              { label: '一般隐患', value: 179, unit: '条', tone: 'plain', sub: [['占比', '71%'], ['已闭环', '142 条']] },
            ],
          },
        },
        bottom: {
          type: 'trend', unit: '条', categories: WEEK, series: [
            { name: '新增隐患', color: '#ff6b7a', data: [14, 22, 18, 26, 19, 24, 16] },
            { name: '闭环隐患', color: '#5eeeff', data: [11, 18, 15, 21, 17, 22, 20] },
          ],
        },
      },

      /* ⑤ 人员实名制统计 + 人员构成环图 */
      metric('人员实名制统计', 'LABOR STATS', [
        {
          label: '在场人数', value: 2846, unit: '人', tone: 'accent',
          sub: [['管理', '386 人'], ['工人', '2460 人']],
        },
        {
          label: '今日出勤率', value: '94.7', unit: '%', tone: 'plain',
          sub: [['出勤', '2695 人'], ['请假', '151 人']],
        },
        {
          label: '特种作业', value: 156, unit: '人', tone: 'gold',
          sub: [['持证上岗', '156 人'], ['证书到期', '3 人']],
        },
        {
          label: '管理人员', value: 386, unit: '人', tone: 'plain',
          sub: [['到岗', '372 人'], ['缺勤', '14 人']],
        },
        {
          label: '建筑工人', value: 2460, unit: '人', tone: 'plain',
          sub: [['到岗', '2323 人'], ['缺勤', '137 人']],
        },
        {
          label: '考勤异常', value: 42, unit: '人', tone: 'gold',
          sub: [['未打卡', '40 人'], ['黑名单', '2 人']],
        },
      ], '实时', '实名制覆盖 12 个项目 · 今日新增进场 18 人 · 超龄 0 人'),

      /* ⑥ 危大工程监测：分类占比环图 */
      donut('危大工程监测', 'MAJOR HAZARD', [
        { label: '深基坑', value: 12, color: '#5eeeff' },
        { label: '高支模', value: 8, color: '#f6c575' },
        { label: '脚手架', value: 5, color: '#7fc8ff' },
        { label: '起重吊装', value: 4, color: '#b78aff' },
        { label: '拆除工程', value: 2, color: '#ff6b7a' },
      ], '个', '共 31 个', '监测点 62 个 · 在线 58 个 · 告警 4 条'),
    ],
    markers: [
      { id: 'p-ne', x: 31, y: 19, tone: 'danger', label: '东北站坪', value: '高风险', rows: [['隐患', '18 条'], ['塔吊报警', '12 次']] },
      { id: 'p-t1', x: 57, y: 25, tone: 'danger', label: 'T1航站楼', value: '高风险', rows: [['隐患', '12 条'], ['整改率', '58%']] },
      { id: 'p-t3', x: 76, y: 23, tone: 'warn', label: 'T3航站楼', value: '需关注', rows: [['隐患', '9 条'], ['塔吊报警', '6 次']] },
      { id: 'p-fly', x: 71, y: 63, tone: 'warn', label: '飞行区5号通道', value: '需关注', rows: [['隐患', '7 条'], ['巡检逾期', '2 项']] },
      { id: 'p-tunnel', x: 27, y: 71, tone: 'ok', label: '2号隧道', value: '可控', rows: [['隐患', '5 条'], ['整改率', '80%']] },
      { id: 'p-pier', x: 45, y: 55, tone: 'ok', label: '指廊区', value: '正常', rows: [['隐患', '2 条'], ['整改率', '100%']] },
    ],
    /** 全局研判：对全部在建项目横向分析后的结论 */
    verdict: {
      text: '12 个在建项目中，东北站坪、T1航站楼隐患与塔吊报警双高、整改率低于 60%，建议对前两名项目启动专项督导。',
      stats: [
        { label: '高风险', value: 2, tone: 'danger' },
        { label: '需关注', value: 3, tone: 'warn' },
        { label: '正常', value: 7, tone: 'ok' },
      ],
    },
    footerNote: '安全态势数据每 5 分钟刷新',
  },

  /* ---------------- 质量态势（当前隐藏） ---------------- */
  quality: {
    left: [
      metric('质量总览', 'QUALITY OVERVIEW', [
        { label: '验收任务', value: 86, unit: '项', tone: 'accent', sub: [['日环比', '2.1%', 'up'], ['周环比', '5.4%', 'up']] },
        { label: '通过', value: 79, unit: '项', tone: 'plain', sub: [['今日验收', '12 项'], ['待复验', '4 项']] },
        { label: '一次通过率', value: '91.9', unit: '%', tone: 'gold', sub: [['目标', '92%'], ['差距', '0.1%']] },
      ]),
      bars('质量问题分布', 'ISSUE CATEGORY', [
        { label: '工艺偏差', value: 15, unit: '条' },
        { label: '品牌不符', value: 12, unit: '条' },
        { label: '资料缺失', value: 9, unit: '条' },
        { label: '材料不合格', value: 8, unit: '条' },
      ], '累计'),
      trend('验收趋势', 'ACCEPTANCE TREND', [
        { name: '验收通过', color: '#5eeeff', data: [9, 12, 8, 14, 11, 16, 9] },
        { name: '整改完成', color: '#f6c575', data: [4, 6, 5, 7, 5, 8, 6] },
      ], '项', '日趋'),
    ],
    right: [
      metric('品牌报审', 'BRAND APPROVAL', [
        { label: '报审', value: 42, unit: '份', tone: 'accent', sub: [['本月', '18 份'], ['上周', '11 份']] },
        { label: '通过', value: 36, unit: '份', tone: 'plain', sub: [['在审', '4 份'], ['退回', '2 份']] },
        { label: '通过率', value: '85.7', unit: '%', tone: 'gold', sub: [['目标', '90%'], ['差距', '4.3%']] },
      ]),
      metric('材料设备进场', 'MATERIAL ENTRY', [
        { label: '进场批次', value: 58, unit: '批', tone: 'accent', sub: [['今日', '6 批'], ['累计', '23 批']] },
        { label: '合格', value: 55, unit: '批', tone: 'plain', sub: [['合格率', '94.8%'], ['复检', '2 批']] },
        { label: '退场', value: 3, unit: '批', tone: 'gold', sub: [['材料', '2 批'], ['设备', '1 批']] },
      ]),
      metric('样板与实模', 'SAMPLE & MODEL', [
        { label: '样板验收', value: 14, unit: '项', tone: 'accent', sub: [['已验收', '11 项'], ['待验收', '3 项']] },
        { label: '实模一致', value: 11, unit: '项', tone: 'plain', sub: [['一致率', '78.6%'], ['偏差', '3 项']] },
        { label: '待复验', value: 3, unit: '项', tone: 'gold', sub: [['本周', '2 项'], ['超期', '0 项']] },
      ]),
    ],
    markers: [
      { id: 'q-t1', x: 58, y: 26, tone: 'ok', label: 'T1航站楼', value: '验收通过率 96%', rows: [['本节验收', '24 项'], ['待整改', '4 条']] },
      { id: 'q-mat', x: 68, y: 60, tone: 'warn', label: '材料堆场', value: '合格 55 批', rows: [['今日进场', '6 批'], ['退场', '1 批']] },
      { id: 'q-sample', x: 34, y: 66, tone: 'info', label: '样板展示区', value: '待复验 3 项', rows: [['样板验收', '14 项'], ['实模一致', '11 项']] },
      { id: 'q-tower', x: 41, y: 44, tone: 'ok', label: '塔台', value: '验收 92%', rows: [['验收节点', '12 / 13'], ['遗留问题', '1 项']] },
    ],
    footerNote: '质量态势数据每 5 分钟刷新',
  },

  /* ---------------- 项目要素（当前隐藏） ---------------- */
  element: {
    left: [
      metric('项目总览', 'PROJECT OVERVIEW', [
        { label: '项目总数', value: 12, unit: '个', tone: 'accent', sub: [['指挥部', '1 个'], ['项目级', '11 个']] },
        { label: '在建', value: 9, unit: '个', tone: 'plain', sub: [['正常', '7 个'], ['滞后', '2 个']] },
        { label: '完工', value: 3, unit: '个', tone: 'gold', sub: [['本年', '2 个'], ['去年', '1 个']] },
      ]),
      metric('投资完成', 'INVESTMENT', [
        { label: '计划投资', value: '38.6', unit: '亿元', tone: 'accent', sub: [['年度', '24.0 亿'], ['累计', '38.6 亿']] },
        { label: '完成投资', value: '26.4', unit: '亿元', tone: 'plain', sub: [['本月', '1.8 亿'], ['上月', '1.6 亿']] },
        { label: '完成率', value: '68.4', unit: '%', tone: 'gold', sub: [['时序', '70.2%'], ['差距', '1.8%']] },
      ]),
      trend('施工进度趋势', 'PROGRESS TREND', [
        { name: '计划进度', color: '#5eeeff', data: [62, 64, 66, 68, 70, 72, 74] },
        { name: '实际进度', color: '#f6c575', data: [60, 63, 65, 67, 69, 71, 73] },
      ], '%', '日趋'),
    ],
    right: [
      metric('人员与机械', 'LABOR & MACHINE', [
        { label: '在场人员', value: 2846, unit: '人', tone: 'accent', sub: [['管理', '386 人'], ['工人', '2460 人']] },
        { label: '特种作业', value: 156, unit: '人', tone: 'plain', sub: [['持证', '156 人'], ['到期', '3 人']] },
        { label: '机械设备', value: 128, unit: '台', tone: 'gold', sub: [['在线', '121 台'], ['离线', '7 台']] },
      ], '实时'),
      metric('视频监控', 'VIDEO MONITOR', [
        { label: '监控点', value: 198, unit: '路', tone: 'accent', sub: [['枪机', '132 路'], ['球机', '66 路']] },
        { label: '在线', value: 186, unit: '路', tone: 'plain', sub: [['在线率', '93.9%'], ['离线', '12 路']] },
        { label: '在线率', value: '93.9', unit: '%', tone: 'gold', sub: [['日环比', '0.3%', 'down'], ['目标', '95%']] },
      ]),
      list('关键节点', 'MILESTONE', [
        { label: '指廊钢结构安装', value: '2026-11-20', tone: 'info', meta: '剩余 4 天' },
        { label: 'T1主体结构封顶', value: '2026-12-30', tone: 'warn', meta: '剩余 44 天' },
        { label: '跑道盖被工程', value: '2027-03-15', tone: 'info', meta: '剩余 119 天' },
      ], '3 项'),
    ],
    markers: [
      { id: 'e-t1', x: 58, y: 26, tone: 'ok', label: 'T1航站楼', value: '进度 78%', rows: [['本月计划', '74%'], ['偏差', '+4.0%']] },
      { id: 'e-tower', x: 41, y: 44, tone: 'ok', label: '塔台', value: '进度 92%', rows: [['本月计划', '90%'], ['偏差', '+2.0%']] },
      { id: 'e-runway', x: 68, y: 58, tone: 'warn', label: '滑行道', value: '进度 64%', rows: [['本月计划', '68%'], ['偏差', '-4.0%']] },
      { id: 'e-pier', x: 34, y: 68, tone: 'info', label: '指廊区', value: '进度 71%', rows: [['本月计划', '70%'], ['偏差', '+1.0%']] },
    ],
    footerNote: '项目要素数据每 10 分钟刷新',
  },
}

/** 顶栏右侧天气（假数据） */
export const SCREEN_WEATHER = { text: '多云', temperature: '28°C' }

/** 左上角区域标签 */
export const SCREEN_SCOPE_LABEL = '深圳机场扩建工程 · T1航站区'
