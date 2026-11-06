/**
 * 数字周报 · 旧快照兼容补全
 *
 * 背景：周报快照在生成时冻结。功能迭代后（如新增图表、逾期隐患清单），
 * 升级前已生成的周报快照里没有这些字段；若不做补全，页面与导出都不会显示。
 *
 * 处理原则：
 *  - 环形图 / 逾期清单：可由快照内的 rows 直接推出，视为「展示层派生」，现场补齐；
 *  - 折线图：必须依赖历史周报，缺失周用 null 断线，**不伪造历史数据**；
 *  - 只补内存对象，不写回 localStorage（原快照保持冻结语义）。
 */
import {
  buildHazardLevelChart,
  buildRectifyStatusChart,
  buildHazardTrendChart,
  buildOverdueHazardList,
  OVERDUE_HAZARD_COLUMNS,
} from '../mock/weeklyReport.js'
import { getHazardTrendContext } from './weeklyReportStorage.js'

function sumBy(rows, key) {
  return (rows || []).reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
}

function buildOverdueTable(weekKey, rows, options) {
  const overdueList = buildOverdueHazardList(weekKey, rows || [], options)
  return {
    title: '逾期隐患清单',
    summary: `截至统计截止日，${options.scopeLabel}发现的逾期未闭环隐患 ${overdueList.length} 条，按逾期天数降序排列，${options.actionLabel}。`,
    columns: OVERDUE_HAZARD_COLUMNS,
    rows: overdueList,
  }
}

/**
 * 补全周报快照缺失的展示派生数据（图表 / 逾期隐患清单）
 * @param {object} report 周报快照
 * @returns {object} 同一对象（已补全）
 */
export function ensureReportRichData(report) {
  if (!report?.sections) return report
  const sections = report.sections

  // 2.5 调度隐患统计：等级环形图 + 逾期隐患清单
  const coc = sections.cocHazard
  if (coc) {
    if (!(coc.charts || []).length) {
      coc.charts = [buildHazardLevelChart(coc.rows || [])]
    }
    if (!(coc.extraTables || []).length) {
      coc.extraTables = [
        buildOverdueTable(report.weekKey, coc.rows, {
          prefix: 'DD',
          sources: ['调度隐患', '监理会议'],
          scopeLabel: '调度过程中',
          actionLabel: '需在调度会逐条督办',
        }),
      ]
    }
  }

  // 3.2 隐患整改：近 6 周折线图 + 整改状态环形图 + 逾期隐患清单
  const anzi = sections.anziHazard
  if (anzi) {
    if (!(anzi.charts || []).length) {
      const created = sumBy(anzi.rows, 'created')
      const closed = sumBy(anzi.rows, 'closed')
      const trend = getHazardTrendContext(report.weekKey, { created, closed })
      anzi.charts = [
        buildHazardTrendChart(report.weekKey, { history: trend }),
        buildRectifyStatusChart(anzi.rows || []),
      ]
    }
    if (!(anzi.extraTables || []).length) {
      anzi.extraTables = [
        buildOverdueTable(report.weekKey, anzi.rows, {
          prefix: 'AQ',
          sources: ['安质巡检'],
          scopeLabel: '安质巡检',
          actionLabel: '需逐条督办整改',
        }),
      ]
    }
  }

  return report
}
