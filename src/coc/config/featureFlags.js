/** COC 功能开关（隐藏 UI 时不删代码，后续改 true 即可恢复） */
export const cocFeatureFlags = {
  /** 会议管控：AI 实时识别、对话明细、总结相关展示 */
  meetingAiUi: false,
  /** 会议管控 · 「会议记录」按钮及大屏会议记录页入口 */
  meetingRecordsEntry: false,
  /** 会议签到浮层（参会状态已改为项目值班人员标签，签到入口隐藏） */
  meetingSignIn: false,
}
