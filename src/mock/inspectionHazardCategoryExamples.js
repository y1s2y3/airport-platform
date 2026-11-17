/** 用于演示配置与新增隐患联动，不代表等级或判定标准。 */
const groups = [
  {
    category: '质量', prefix: 'quality',
    names: ['材料质量', '施工工艺', '结构实体质量', '尺寸偏差', '防水工程', '外观质量', '隐蔽工程验收', '质量资料'],
  },
  {
    category: '生态文明', prefix: 'ecology',
    names: ['扬尘防治', '施工噪声', '施工废水', '固体废物', '生态保护', '节能与资源利用'],
  },
  {
    category: '其他', prefix: 'other',
    names: ['现场通行', '标识公示', '应急联络', '物资管理', '资料归档', '协调事项'],
  },
]

export const inspectionHazardCategoryExamples = groups.filter(group => group.category !== '生态文明').flatMap(group => group.names.map((name, index) => ({
  id: `hazard-example-${group.prefix}-${index + 1}`,
  category: group.category,
  name,
  sort: index + 1,
  enabled: true,
  remark: '示例类别，可按项目实际情况编辑或停用',
})))

/** 升级仅补充缺项，保留用户已有同名类别的名称、排序、启停及备注。 */
export function mergeInspectionHazardCategoryExamples(existing) {
  return [...existing, ...inspectionHazardCategoryExamples
    .filter(example => !existing.some(item => item.id === example.id || (item.category === example.category && item.name === example.name)))
    .map(item => ({ ...item }))]
}
