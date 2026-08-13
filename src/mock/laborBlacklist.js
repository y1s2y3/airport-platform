export const laborBlacklist = [
  {
    id: 'bl-001',
    name: '孙某',
    id_card: '440300198805121234',
    phone: '13800138001',
    reason: '多次违反安全规定，拒不整改',
    created_by: '李安全',
    created_at: '2026-05-12 10:30',
  },
  {
    id: 'bl-002',
    name: '钱某',
    id_card: '440300199203156789',
    phone: '',
    reason: '伪造特种作业证件',
    created_by: '王建国',
    created_at: '2026-04-28 15:20',
  },
  {
    id: 'bl-003',
    name: '周某',
    id_card: '440300198712089012',
    phone: '13900139002',
    reason: '打架斗殴，影响施工现场秩序',
    created_by: '陈静',
    created_at: '2026-03-15 09:00',
  },
]

export function maskIdCard(id_card) {
  if (!id_card || id_card.length < 8) return id_card
  return `${id_card.slice(0, 6)}********${id_card.slice(-4)}`
}
