// Keep the user-designated Word PRD as a binary asset; future documents remain separate entries.
import dailyDispatchPrdUrl from '../../docs/features/daily-dispatch-check/requirements/Daily_Dispatch_Check_PRD_v1.1_project_scope_revision.docx?url'

export const dailyDispatchDocuments = [
  { id: 'daily-dispatch-prd', title: '每日调度检查需求文档（PRD）', fileName: 'Daily_Dispatch_Check_PRD_v1.1_project_scope_revision.docx', format: 'Word · .docx', description: 'v1.1（项目范围与预填修订）：预填仅作用于已纳入且当前未隐藏的项目，不自动增删当日项目。', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', url: dailyDispatchPrdUrl },
]
