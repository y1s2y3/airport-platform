# 每日调度检查：1103汇报修订对照

> 来源：独立功能工程提交 eaebc312df99f0a75f6b59f4fd97f0469dd15a83 的实现/迭代记录；仅适配工程目录和资料引用。本文原有日期验证属于来源工程，本次团队工程合入结果见[集成验证记录](../integration.md)。未随代码迁移的历史资料保留来源标识。


依据问题记录原文（来源工程资料：`../references/2026-11-03-汇报后问题整理by-y.md`）及本会话补充确认实现。原文件与目录以1103命名，本次维护日期为2026-11-02；不更改原记录日期。正式业务基线同步为[PRD V1.4](../requirements/每日调度检查需求文档_PRD.md)，验收项连续追加至AC-50。

| 原记录 | 本次调整 | 验证重点 |
| --- | --- | --- |
| 1 未填 | 本模块字段空值统一两个短横杠“--” | NULL/0/有效条数原口径不变 |
| 2 其他 | 状态标签加浅灰底，实际说明保留 | 正常/发现问题原状态不变 |
| 3 总表操作 | 固定眼睛＋查看详情，进入当日完整只读详情 | 返回恢复总表日期、页码、条数及来源状态 |
| 4 图片文字 | 检查内容和截图列以可点击缩略图替代“图片N张” | 保留原关联及原图预览，图片点击不触发行点击 |
| 5 悬停 | 主题浅色，与表头区分，覆盖固定列 | 经用户确认仅每日调度检查模块，不改全平台 |
| 6 抽屉标记 | 日期下一行、Tab外，图标＋当日统一调度 | HQ编辑先应用再页面提交，详情及项目部只读 |
| 7 项目部填写 | 项目列表＋仅项目部Tab的抽屉，列表展示两类姓名/结果/截图及已填数 | 无基本信息、整体备注、HQ检查列；分页可见，各项目两部分独立保存 |
| 8 问题图文必填 | HQ及项目部每条问题描述和1～9张图片必填 | 不借其他问题图片；旧缺图保留查看、重提交按新规则 |
| 9 填写入口 | 每日检查两个入口固定“填写” | 已提交记录仍能修改，不改占用/保存 |
| 10 行点击意见 | 经用户确认保留现有整行点击 | 按钮及图片不重复触发 |

## 保护范围与接入边界

不改变三部分独立提交、项目添加/移除和历史隐藏保护、用户候选范围/默认的现有原型行为、统计口径、日期默认/清空/重置、台账返回恢复。项目部添加仍按原机制补共享行，不生成检查正文或更新时间；单组提交不清空另一组输入，关闭未提交内容先确认。

每问题最多9张、每检查字段/人员部分最多10条、每条500字、单张5MB继续适用；图片1～9张从本次修改起逐问题校验。历史不合新规则的数据不自动补图或覆盖。逻辑/物理数据库及SQL同步应用校验约束，12张表及字段、索引不变，未执行真实DDL。

原型仍是IndexedDB及前端分页。正式后台能力、人员默认/全系统搜索和首次范围重校等6项既有差异，以及BD-01，继续见[符合性核对](../requirements/每日调度检查原型符合性核对.md)，不冒充本次已实现。

## 验证入口

在code目录执行：

```powershell
node scripts/test-daily-dispatch-check.mjs
node --test scripts/test-inspection-ledger-query.mjs scripts/test-inspection-ledger-status.mjs scripts/test-client-pagination.mjs
node scripts/smoke-inspection-report-1103.mjs
node scripts/smoke-inspection-ledger-query.mjs
node scripts/check-style-scope.mjs
npm run build
node scripts/check-style-scope.mjs --dist dist
node scripts/smoke-inspection-report-1103.mjs --built
node scripts/smoke-inspection-documents.mjs --built
```

实际结果记录于[实现与验证](../implementation.md)。隔离浏览器使用测试记录，截图/报告位于outputs/inspection-report-1103，日志位于logs；不修改日常浏览器数据。旧阶段带日期记录和参考原件保留，不改写为当前行为。
