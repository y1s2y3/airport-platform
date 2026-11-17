/** 生态文明、其他类的演示检查项，可在巡检检查项页面继续维护。 */
export const inspectionCheckItemExamples = [
  {
    id: 'cat-eco-dust', label: '扬尘防治', inspectionCategory: '生态文明',
    items: [
      { id: 'item-eco-dust-1', label: '裸露土方、散体材料是否采取覆盖或其他抑尘措施' },
      { id: 'item-eco-dust-2', label: '施工道路是否及时清扫，洒水或喷淋设施是否正常使用' },
      { id: 'item-eco-dust-3', label: '车辆出场前是否完成冲洗，出入口有无带泥上路现象' },
      { id: 'item-eco-dust-4', label: '土方运输车辆是否密闭运输，现场有无抛撒遗漏' },
    ],
  },
  {
    id: 'cat-eco-noise', label: '施工噪声管理', inspectionCategory: '生态文明',
    items: [
      { id: 'item-eco-noise-1', label: '高噪声作业是否落实降噪措施并合理安排作业时间' },
      { id: 'item-eco-noise-2', label: '机械设备消声、减振设施是否完好' },
      { id: 'item-eco-noise-3', label: '夜间施工是否按项目要求履行审批、告知等手续' },
      { id: 'item-eco-noise-4', label: '噪声监测记录及投诉处理记录是否完整' },
    ],
  },
  {
    id: 'cat-eco-water', label: '施工废水管理', inspectionCategory: '生态文明',
    items: [
      { id: 'item-eco-water-1', label: '施工废水是否按现场方案收集处理，有无随意排放' },
      { id: 'item-eco-water-2', label: '沉淀池、排水沟是否畅通，是否及时清理淤积' },
      { id: 'item-eco-water-3', label: '车辆冲洗废水是否收集回用或经处理后排放' },
      { id: 'item-eco-water-4', label: '油料及化学品存放区域是否采取防渗漏措施' },
    ],
  },
  {
    id: 'cat-eco-waste', label: '固废与生态保护', inspectionCategory: '生态文明',
    items: [
      { id: 'item-eco-waste-1', label: '建筑垃圾与生活垃圾是否分类收集、及时清运' },
      { id: 'item-eco-waste-2', label: '废油、废油桶等是否分类暂存并按要求移交处理' },
      { id: 'item-eco-waste-3', label: '施工是否超出批准作业范围，周边绿地是否得到保护' },
      { id: 'item-eco-waste-4', label: '临时占地恢复及场地清理措施是否按计划落实' },
    ],
  },
  {
    id: 'cat-other-access', label: '现场通行与秩序', inspectionCategory: '其他',
    items: [
      { id: 'item-other-access-1', label: '现场出入口管理和访客登记记录是否完整' },
      { id: 'item-other-access-2', label: '施工车辆是否按指定路线通行、按指定区域停放' },
      { id: 'item-other-access-3', label: '材料堆放是否占用通道，公共通行区域是否保持畅通' },
      { id: 'item-other-access-4', label: '交叉作业区域是否落实通行引导和协调安排' },
    ],
  },
  {
    id: 'cat-other-signage', label: '现场标识与公示', inspectionCategory: '其他',
    items: [
      { id: 'item-other-signage-1', label: '项目公示牌、责任人信息及联系电话是否清晰有效' },
      { id: 'item-other-signage-2', label: '施工区域、材料存放区等功能分区标识是否清楚' },
      { id: 'item-other-signage-3', label: '临时导向标识是否准确，现场变化后是否及时调整' },
      { id: 'item-other-signage-4', label: '破损、过期或与现场不符的标识是否及时更换' },
    ],
  },
  {
    id: 'cat-other-emergency', label: '应急联络与物资', inspectionCategory: '其他',
    items: [
      { id: 'item-other-emergency-1', label: '现场应急联系人及联络方式是否及时更新' },
      { id: 'item-other-emergency-2', label: '应急物资清单与实物是否一致，是否定期检查补充' },
      { id: 'item-other-emergency-3', label: '应急物资存放地点是否明确，取用通道是否畅通' },
      { id: 'item-other-emergency-4', label: '值班安排、信息报送及突发情况联络机制是否明确' },
    ],
  },
  {
    id: 'cat-other-coordination', label: '资料与协调事项', inspectionCategory: '其他',
    items: [
      { id: 'item-other-coordination-1', label: '巡检记录、问题清单与整改反馈资料是否完整归档' },
      { id: 'item-other-coordination-2', label: '会议明确的现场协调事项是否落实到责任人和时限' },
      { id: 'item-other-coordination-3', label: '跨单位交接事项是否留有确认记录' },
      { id: 'item-other-coordination-4', label: '上次巡检提出的管理改进事项是否跟踪落实' },
    ],
  },
]

/** 只补充缺失的示例分类，不覆盖用户同名分类及其检查项。 */
export function mergeInspectionCheckItemExamples(existing) {
  const additions = inspectionCheckItemExamples.filter(example => !existing.some(category =>
    category.id === example.id || (category.inspectionCategory === example.inspectionCategory && category.label === example.label),
  ))
  return [...existing, ...additions.map(category => ({ ...category, items: category.items.map(item => ({ ...item })) }))]
}
