import { ElMessage } from 'element-plus'
import {
  finishPersonalTodo,
  handleSubcontractorTodo,
  personalTodoStore,
  DISPATCH_HAZARD_TODO_BIZ,
} from '../../../mock/personalCenter.js'
import { pmApprove, supervisorApprove } from '../../../mock/brand.js'
import { getCurrentUserSnapshot, getEffectiveUserId } from '../../../mock/currentUser.js'
import { supervisorApproveSample, pmApproveSample } from '../../../mock/sample.js'
import { supervisorApproveEntry } from '../../../mock/mat.js'
import { supervisorApproveAsbuilt, pmApproveAsbuilt } from '../../../mock/asbuilt.js'
import {
  submitPenaltyRecipientReport,
  submitPenaltyAppeal,
  acceptPenaltyRecord,
  rejectPenaltyAcceptance,
  resolvePenaltyAppeal,
  issueDispatchPenaltyRecord,
  getDispatchPenaltyRecords,
  PENALTY_STATUSES,
} from '../../../coc/utils/dispatchMeetingStorage.js'
import { submitManagerApproval } from '../../../composables/useMobileRectification.js'
import {
  submitDispatchHazardRectify,
  acceptDispatchHazard,
  rejectDispatchHazard,
  resolveDispatchHazardPhotoName,
} from '../../../utils/dispatchHazardStorage.js'

/**
 * 个人中心待办提交逻辑（与 UI 面板解耦，供 handle 页与各 TodoXxxPanel 复用）。
 */
export function usePersonalTodoSubmit({ todo, todoId, goBack }) {
  function afterSubmit(handleLabel, message) {
    finishPersonalTodo(todoId.value, handleLabel)
    ElMessage.success(message)
    goBack()
  }

  function ensurePenaltyReadyForProcess(penaltyId) {
    if (!penaltyId) return
    const hit = getDispatchPenaltyRecords().find((item) => item.id === penaltyId)
    if (hit?.status === PENALTY_STATUSES.PENDING) {
      issueDispatchPenaltyRecord(penaltyId)
    }
  }

  function enqueueDispatchHazardAcceptTodo(hazard) {
    if (!hazard?.id) return
    const exists = personalTodoStore.todos.some(
      (item) =>
        item.type === 'dispatch_hazard' &&
        item.hazardId === hazard.id &&
        item.bizType === DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
    )
    if (exists) return
    personalTodoStore.todos.unshift({
      id: `todo-dispatch-hazard-accept-${hazard.id}-${Date.now()}`,
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.ACCEPT,
      hazardId: hazard.id,
      processName: `调度隐患验收·${String(hazard.description || hazard.id).slice(0, 18)}`,
      applicant: hazard.rectifier || '整改人',
      dept: '总包项目部',
      applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      hazard: { ...hazard },
      approvalFlow: [],
    })
  }

  function submitDispatchHazardRectifyTodo(mergedHazard, dispatchHazardForm) {
    const row = todo.value
    const hazard = mergedHazard
    if (!row || !hazard?.id) return
    if (!dispatchHazardForm.remark.trim()) return ElMessage.warning('请填写整改说明')
    if (!dispatchHazardForm.photos.length) return ElMessage.warning('请上传至少一张整改照片')
    const photos = dispatchHazardForm.photos
      .map((item, index) => ({
        name: item.name || resolveDispatchHazardPhotoName(item, index),
        url: item.url || '',
      }))
      .filter((item) => item.name || item.url)
    const result = submitDispatchHazardRectify(hazard.id, {
      remark: dispatchHazardForm.remark.trim(),
      photos,
      operator: '当前用户',
      operatorRole: '施工方',
    })
    if (!result || result.rectifyStatus !== '待验收') {
      return ElMessage.warning('提交失败，请确认当前隐患仍为待整改')
    }
    enqueueDispatchHazardAcceptTodo(result)
    afterSubmit('提交整改', '整改已提交，已生成验收待办')
  }

  function submitDispatchHazardAcceptTodo(mergedHazard, dispatchHazardForm) {
    const row = todo.value
    const hazard = mergedHazard
    if (!row || !hazard?.id) return
    if (dispatchHazardForm.decision === 'pass') {
      const result = acceptDispatchHazard(hazard.id, {
        remark: dispatchHazardForm.remark.trim() || '现场核查整改到位，予以关闭',
        operator: '当前用户',
        operatorRole: '安质部',
      })
      if (!result || result.rectifyStatus !== '已关闭') {
        return ElMessage.warning('验收失败，请确认当前隐患仍为待验收')
      }
      afterSubmit('验收通过', '验收通过，隐患已关闭')
      return
    }
    if (!dispatchHazardForm.rejectRemark.trim()) return ElMessage.warning('请填写驳回原因')
    const result = rejectDispatchHazard(hazard.id, {
      remark: dispatchHazardForm.rejectRemark.trim(),
      operator: '当前用户',
      operatorRole: '安质部',
    })
    if (!result || result.rectifyStatus !== '待整改') {
      return ElMessage.warning('驳回失败，请确认当前隐患仍为待验收')
    }
    personalTodoStore.todos.unshift({
      id: `todo-dispatch-hazard-rectify-${result.id}-${Date.now()}`,
      type: 'dispatch_hazard',
      sourceLabel: '调度隐患',
      category: 'COC调度',
      bizType: DISPATCH_HAZARD_TODO_BIZ.RECTIFY,
      hazardId: result.id,
      processName: `调度隐患整改·${String(result.description || result.id).slice(0, 18)}`,
      applicant: '安质部',
      dept: '指挥部安质部',
      applyTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      hazard: { ...result },
      approvalFlow: [],
    })
    afterSubmit('验收驳回', '已驳回，已重新生成整改待办')
  }

  function submitProcessReport(reportForm) {
    if (!reportForm.penaltyClause.trim()) return ElMessage.warning('请填写条款')
    if (!reportForm.amount.trim()) return ElMessage.warning('请填写金额')
    if (!reportForm.reportResult.trim()) return ElMessage.warning('请填写上报结果')
    if (!reportForm.acceptor.trim()) return ElMessage.warning('请选择验收人')
    const row = todo.value
    if (!row) return
    if (row.penaltyId) {
      ensurePenaltyReadyForProcess(row.penaltyId)
      submitPenaltyRecipientReport(row.penaltyId, {
        penaltyClause: reportForm.penaltyClause.trim(),
        amount: reportForm.amount.trim(),
        reportResult: reportForm.reportResult.trim(),
        acceptor: reportForm.acceptor.trim(),
        reportAttachments: reportForm.attachments.map((item, index) => ({
          name: item.name?.startsWith('上报结果附件')
            ? item.name
            : `上报结果附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
          url: item.url,
        })),
      })
    }
    afterSubmit('上报结果', '上报成功，状态更新为待验收')
  }

  function submitProcessAppeal(appealForm) {
    if (!appealForm.reason.trim()) return ElMessage.warning('请填写申诉理由')
    const row = todo.value
    if (!row) return
    if (row.penaltyId) {
      ensurePenaltyReadyForProcess(row.penaltyId)
      submitPenaltyAppeal(row.penaltyId, {
        appealReason: appealForm.reason.trim(),
        appealAttachments: appealForm.attachments.map((item, index) => ({
          name: item.name?.startsWith('申诉附件')
            ? item.name
            : `申诉附件-${index + 1}${String(item.name || '').match(/\.[a-z0-9]+$/i)?.[0] || '.jpg'}`,
          url: item.url || '',
        })),
      })
    }
    afterSubmit('提交申诉', '申诉已提交，状态更新为申诉中')
  }

  function submitAcceptHandle(acceptForm) {
    if (!acceptForm.remark.trim()) return ElMessage.warning('请填写说明')
    const row = todo.value
    if (!row) return
    const remark = acceptForm.remark.trim()
    if (acceptForm.decision === 'pass') {
      if (row.penaltyId) acceptPenaltyRecord(row.penaltyId, '当前用户', remark)
      afterSubmit('验收通过', '验收通过，处罚单已关闭')
    } else {
      if (row.penaltyId) rejectPenaltyAcceptance(row.penaltyId, remark)
      afterSubmit('验收驳回', '已驳回，处罚单退回处理中')
    }
  }

  function submitAppealHandle(appealHandleForm) {
    if (!appealHandleForm.remark.trim()) return ElMessage.warning('请填写说明')
    const row = todo.value
    if (!row) return
    const remark = appealHandleForm.remark.trim()
    const approved = appealHandleForm.decision === 'pass'
    if (row.penaltyId) resolvePenaltyAppeal(row.penaltyId, approved, '当前用户', remark)
    afterSubmit(
      approved ? '申诉通过并关闭' : '申诉驳回',
      approved ? '申诉已通过，处罚单已关闭' : '申诉已驳回，状态恢复为处理中',
    )
  }

  function submitCommonHandle(commonForm) {
    const approved = commonForm.decision === 'pass'
    const row = todo.value
    const needRemark =
      !approved ||
      (row?.type !== 'sample' &&
        row?.type !== 'brand' &&
        row?.type !== 'subcontractor' &&
        row?.type !== 'mat_entry' &&
        row?.type !== 'eq_entry' &&
        row?.type !== 'asbuilt')
    if (needRemark && !commonForm.remark.trim()) {
      const rejectHint =
        row?.type === 'brand' || row?.type === 'mat_entry' || row?.type === 'eq_entry'
          ? '请填写驳回意见'
          : '请填写退回意见'
      return ElMessage.warning(approved ? '请填写说明' : rejectHint)
    }
    if (row?.type === 'subcontractor' && row.subcontractorApplicationId) {
      const action = approved ? 'agree' : 'reject'
      const opinion = commonForm.remark.trim()
      const r = handleSubcontractorTodo(row.id, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      if (r.finished && !r.rejected) {
        return afterSubmit(
          '审批通过',
          '终审通过，已同步至项目画像「专业分包及劳务分包」，并已抄送',
        )
      }
      if (r.finished && r.rejected) {
        return afterSubmit('已驳回', '已驳回，报审单退回施工单位')
      }
      return afterSubmit('同意', `已同意，下一节点「${r.nextNodeTitle || '待流转'}」待办已生成`)
    }
    if (row?.type === 'asbuilt' && row.asbuiltAcceptanceId) {
      const action = approved ? 'approve' : 'reject'
      const comment = commonForm.remark.trim()
      if (row.asbuiltNode === 'supervisor') {
        const r = supervisorApproveAsbuilt(row.asbuiltAcceptanceId, { action, comment })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '监理通过' : '监理驳回',
          approved ? '已通过，指挥部项目经理终审待办已生成' : '已驳回，流程结束',
        )
      }
      if (row.asbuiltNode === 'pm') {
        const r = pmApproveAsbuilt(row.asbuiltAcceptanceId, { action, comment })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '终审通过' : '终审驳回',
          approved ? '终审通过，实模一致验收办结' : '已驳回，流程结束',
        )
      }
    }
    if (
      (row?.type === 'mat_entry' && row.matEntryId) ||
      (row?.type === 'eq_entry' && (row.eqEntryId || row.matEntryId))
    ) {
      const action = approved ? 'agree' : 'reject'
      const opinion = commonForm.remark.trim()
      const entryId = row.matEntryId || row.eqEntryId
      const r = supervisorApproveEntry(entryId, { action, opinion })
      if (!r.ok) return ElMessage.error(r.msg)
      return afterSubmit(
        approved ? '监理通过' : '监理驳回',
        approved ? '进场审批通过' : '已驳回施工单位',
      )
    }
    if (row?.type === 'brand' && row.brandApplicationId) {
      const action = approved ? 'agree' : 'reject'
      const opinion = commonForm.remark.trim()
      const operatorUserId = getEffectiveUserId(getCurrentUserSnapshot())
      if (row.brandNode === 'supervisor') {
        const r = supervisorApprove(row.brandApplicationId, { action, opinion, operatorUserId })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '监理同意' : '监理驳回',
          approved ? '已同意，待项目经理审待办已生成（个人中心）' : '报审单已驳回至施工',
        )
      }
      if (row.brandNode === 'pm') {
        const r = pmApprove(row.brandApplicationId, { action, opinion, operatorUserId })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '终审通过并入库' : '终审驳回',
          approved ? '终审通过，已完成品牌入库' : '报审单已驳回至施工',
        )
      }
    }
    if (row?.type === 'sample' && row.sampleApplicationId && row.sampleBizType) {
      const action = approved ? 'agree' : 'reject'
      const opinion = commonForm.remark.trim()
      if (row.sampleNode === 'supervisor') {
        const r = supervisorApproveSample(row.sampleBizType, row.sampleApplicationId, {
          action,
          opinion,
        })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '监理同意' : '监理退回',
          approved ? '已同意，项目经理终审待办已生成' : '已退回施工单位',
        )
      }
      if (row.sampleNode === 'pm') {
        const r = pmApproveSample(row.sampleBizType, row.sampleApplicationId, { action, opinion })
        if (!r.ok) return ElMessage.error(r.msg)
        return afterSubmit(
          approved ? '终审通过' : '终审退回',
          approved
            ? row.sampleBizType === 'process'
              ? '终审通过，已生成二维码'
              : '终审通过，已入台账视图'
            : '已退回施工单位',
        )
      }
    }
    afterSubmit(approved ? '审批通过' : '审批驳回', approved ? '已审批通过' : '已驳回')
  }

  function submitInspectionHandle(inspectionForm, inspectionActionMeta) {
    const row = todo.value
    if (!row) return
    const bizType = row.inspectionBizType
    if (bizType === '巡检') {
      if (!inspectionForm.inspectionResult) return ElMessage.warning('请选择巡检结果')
      if (inspectionForm.inspectionResult === 'hazard') {
        if (!inspectionForm.hazardDescription.trim()) return ElMessage.warning('请填写隐患说明')
        if (inspectionForm.issueRectify && !inspectionForm.rectifier) {
          return ElMessage.warning('请选择整改人')
        }
        if (inspectionForm.issueRectify && !inspectionForm.reviewer) {
          return ElMessage.warning('请选择复查人')
        }
        if (inspectionForm.issueRectify && !inspectionForm.rectifyDeadline) {
          return ElMessage.warning('请选择整改截止日期')
        }
      }
    } else {
      if (!inspectionForm.processDate) {
        return ElMessage.warning(
          `请选择${bizType === '整改' ? '整改' : bizType === '复查' ? '复查' : '审批'}日期`,
        )
      }
      if (bizType === '整改' && inspectionForm.attachments.length === 0) {
        return ElMessage.warning('请至少上传一张整改照片')
      }
      if (!inspectionForm.remark.trim()) {
        return ElMessage.warning(`请填写${inspectionActionMeta.remarkLabel}`)
      }
    }

    const approved = inspectionForm.decision === 'pass'
    const now = new Date().toLocaleString('zh-CN', { hour12: false })
    const remark = inspectionForm.remark.trim()
    const nextStatus =
      bizType === '巡检'
        ? '已完成'
        : bizType === '整改'
          ? '待复查'
          : bizType === '复查'
            ? approved
              ? '已复查'
              : '待整改'
            : approved
              ? '已关闭'
              : '待复查'
    row.detail = {
      ...(row.detail || {}),
      status: nextStatus,
      closeDate: bizType === '审批' && approved ? inspectionForm.processDate : row.detail?.closeDate,
      processDate: bizType === '巡检' ? row.detail?.processDate : inspectionForm.processDate,
      processResult: approved ? inspectionActionMeta.pass : inspectionActionMeta.reject,
      processRemark: remark,
      inspector: row.detail?.executor || inspectionForm.inspector || row.detail?.inspector,
      companions: [...inspectionForm.companions],
      inspectionResult: inspectionForm.inspectionResult || row.detail?.inspectionResult,
      inspectionDate:
        bizType === '巡检' ? new Date().toISOString().slice(0, 10) : row.detail?.inspectionDate,
      normalPhotos:
        inspectionForm.inspectionResult === 'normal'
          ? inspectionForm.attachments.map((item) => item.name)
          : row.detail?.normalPhotos,
      hazardItems:
        inspectionForm.inspectionResult === 'hazard'
          ? [
              {
                desc: inspectionForm.hazardDescription.trim(),
                photos: inspectionForm.attachments.map((item) => item.name),
                issueRectify: inspectionForm.issueRectify,
                rectifier: inspectionForm.rectifier,
                reviewer: inspectionForm.reviewer,
                rectifyDeadline: inspectionForm.rectifyDeadline,
              },
            ]
          : row.detail?.hazardItems,
      rectificationDate:
        bizType === '整改' ? inspectionForm.processDate : row.detail?.rectificationDate,
      rectificationPhotos:
        bizType === '整改'
          ? inspectionForm.attachments.map((item) => item.name)
          : row.detail?.rectificationPhotos,
      rectificationNote: bizType === '整改' ? remark : row.detail?.rectificationNote,
      reviewDate: bizType === '复查' ? inspectionForm.processDate : row.detail?.reviewDate,
      reviewResult:
        bizType === '复查' ? (approved ? '通过' : '不通过') : row.detail?.reviewResult,
      reviewComment: bizType === '复查' ? remark : row.detail?.reviewComment,
      approvalDate: bizType === '审批' ? inspectionForm.processDate : row.detail?.approvalDate,
      approvalResult:
        bizType === '审批' ? (approved ? '通过' : '不通过') : row.detail?.approvalResult,
      approvalComment: bizType === '审批' ? remark : row.detail?.approvalComment,
    }

    if (bizType === '审批' && row.rectifyId) {
      const ok = submitManagerApproval(row.rectifyId, approved, {
        approvalDate: inspectionForm.processDate,
        approvalComment: remark,
      })
      if (!ok) return ElMessage.error('未找到关联整改单，无法完成审批')
    }

    const currentIndex = (row.approvalFlow || []).findIndex((step) => step.status === 'current')
    const completed = (row.approvalFlow || []).map((step, index) => {
      if (index !== currentIndex) return { ...step }
      return {
        ...step,
        status: 'done',
        time: now,
        user: step.user || '当前用户',
        remark: remark
          ? `${approved ? inspectionActionMeta.pass : inspectionActionMeta.reject}：${remark}`
          : approved
            ? inspectionActionMeta.pass
            : inspectionActionMeta.reject,
      }
    })

    if (approved) {
      if (bizType === '审批') {
        row.approvalFlow = completed.map((step, index) =>
          index === completed.length - 1
            ? { ...step, status: 'done', time: now, user: '系统', remark: '项目经理审批通过，流程已关闭' }
            : step,
        )
        row.detail.currentNode = '流程关闭'
      } else {
        const nextIndex = currentIndex + 1
        row.approvalFlow = completed.map((step, index) =>
          index === nextIndex ? { ...step, status: 'current', remark: '待处理' } : step,
        )
        row.detail.currentNode = row.approvalFlow[nextIndex]?.title || '流程关闭'
      }
    } else if (bizType === '审批') {
      row.approvalFlow = [
        ...completed,
        {
          title: '复查人重新复查',
          time: '',
          user: row.detail?.reviewer || '复查人',
          remark: '项目经理审批不通过，退回复查',
          status: 'current',
        },
        { title: '流程关闭', time: '', user: '系统', remark: '待流转', status: 'pending' },
      ]
      row.detail.currentNode = '复查人重新复查'
    } else {
      const returnTitle = bizType === '复查' ? '整改人重新整改' : '退回重新处理'
      row.approvalFlow = [
        ...completed,
        {
          title: returnTitle,
          time: '',
          user: bizType === '复查' ? row.detail?.rectifier : row.applicant,
          remark,
          status: 'current',
        },
      ]
      row.detail.currentNode = returnTitle
    }

    afterSubmit(
      approved ? inspectionActionMeta.pass : inspectionActionMeta.reject,
      bizType === '审批' && approved
        ? '审批通过，整改单已关闭'
        : bizType === '审批'
          ? '审批不通过，已退回复查人重新复查'
          : `${inspectionActionMeta.title}已提交`,
    )
  }

  return {
    afterSubmit,
    submitDispatchHazardRectifyTodo,
    submitDispatchHazardAcceptTodo,
    submitProcessReport,
    submitProcessAppeal,
    submitAcceptHandle,
    submitAppealHandle,
    submitCommonHandle,
    submitInspectionHandle,
  }
}
