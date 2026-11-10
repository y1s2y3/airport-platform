# 每日调度检查

所属系统：工程建设智慧管控一体化平台

## 来源与接入

本功能从独立开发工程的最终提交 8027fcb11c2073eede72b21e695b60fbed143722 增量接入，团队基础版本为 252df82ea6080c1f6fa6de355ad25ec88a5701d8。仅迁入每日调度检查及所需接入点，沿用团队现行公共主题、菜单组织、用户/项目/组织数据与构建配置。

工程指挥部 → 调度中心 → 每日调度检查，地址为 `#/coc-admin/daily-dispatch-check`。统一调度、值班人员和项目经理检查关联同一日期及项目；项目部两类内容独立保存。项目调度标签在项目信息管理配置。

## 需求及下载资料

- [当前 Word PRD v1.2](requirements/Daily_Dispatch_Check_PRD_v1.2.docx)
- [此前 v1.1（项目范围与预填修订）](requirements/Daily_Dispatch_Check_PRD_v1.1_project_scope_revision.docx)
- [此前 v1.1（项目范围补充前）](requirements/Daily_Dispatch_Check_PRD_v1.1.docx)
- [v1.1预填修订与验证](revisions/prd-v1.1-prefill.md)
- [历史 Word PRD v1.0](requirements/Daily_Dispatch_Check_PRD_v1.0.docx)
- [v1.0历史差异及61条字段核查](requirements/每日调度检查_PRD_v1.0_核查清单.md)

以下 Markdown 和数据库方案为旧基线参考，尚未据新 Word 完整复核：

- [需求文档 PRD](requirements/每日调度检查需求文档_PRD.md)
- [原型符合性核对](requirements/每日调度检查原型符合性核对.md)
- [数据库逻辑设计](database/每日调度检查数据库逻辑设计.md)
- [数据库物理设计](database/每日调度检查数据库物理设计_MySQL8.md)
- [MySQL 8 建表脚本](database/每日调度检查建表脚本_MySQL8.sql)
- [查询、分页与加载方案](query-and-loading.md)

v1.2简化第5章模块功能架构，并校正验收编号、术语及空值说明；未改变功能规则。各页面的原型说明统一使用v1.2并仅提供当前 Word PRD 下载，下载配置仍支持扩展。Word 在工程内由 `src/config/dailyDispatchDocuments.js` 直接引用为二进制资源，下载文件与最终来源逐字节一致；旧资料保留供评审，不在下载列表展示。本轮没有执行数据库建表或接入后端。

## 已确认的默认值与异常处理

日表生成时按当时的隐藏配置确定项目列表，范围形成后不因上游隐藏变化自动增删。预填只处理已纳入且当前未隐藏的项目；重新显示或开启标签不会自动入表，范围扩充沿用手动添加项目。

当日统一调度仅有是/否：勾选为是，未勾选为否，无法读取有效标签时全部为否。统一调度首次成功保存前，每次取得编辑占用进入填写时重新读取最新隐藏配置及标签，临时预填四项正常；确认放弃后不恢复旧快照。首次成功保存后以已保存内容为准，清空、手动勾选及添加项目不再自动补填。项目部保存独立，初始草稿不参与统计。项目隐藏配置异常但清单可读时显示全部来源项目；清单失败仅复用昨日项目ID和名称，不复制昨日检查、人员、图片或标记；当前及昨日都不可用时明确报错，不生成伪空表。历史首次补建/范围还原暂缓，已有历史记录继续保护。

## 登录身份与首次业务姓名

项目部值班人员、项目经理首次填写各自检查部分时，自动取得当前登录的启用系统用户；已保存部分继续保留原选姓名，业务姓名与实际操作账号分别记录。原型演示账号`1`现对应系统内已启用的“COC调度室”用户，可沿用原登录方式；表单读取该用户记录，不写死姓名，也不切换为其他账号。顶栏同步显示当前登录用户的姓名，页面刷新后恢复同一身份。其他已登记启用账号默认其自身姓名；停用或未登记账号不借用其他用户。

## 检查统计的文字溢出提示

【重点调度部门】【参会情况】【安质部调度人员】【各部门参会情况】【检查项目】统一使用默认深色溢出提示。列表仍保留最多四行摘要；只有实际省略时才悬浮显示该单元格全文，不附加标题、计数或编号。检查项目保留原有项目换行，其他文字保留原文换行；过长内容使用组件库细滚动条。未省略或空值不显示提示，也不继承整页“每日调度检查”的原生标题提示。日期、数值和检查状态列继续沿用原展示。【查看详情】继续用于打开该日完整检查记录，项目范围、统计及保存规则不变。

## 数据及公共组件边界

日表、图片、模拟编辑占用和日志保存在当前浏览器 IndexedDB。正式跨设备并发、附件服务和服务端分页尚未实现，本轮差异与验证见v1.1预填修订记录，v1.0核查清单及旧符合性核对仅供历史参考。沿用现有项目和系统用户 ID；仅增量加入明确标注的功能演示调度员及账号1对应的“COC调度室”启用演示用户。

公共主题和对话框标题沿用团队新版。附件公共组件保留团队现有样式及图片压缩实现（默认关闭，每日检查未启用）；按用户确认增量补入可选上传文案、异步追加时使用最新列表及数量校验、只读/卸载后停止回写。未传入自定义文案的既有页面仍显示原默认文字。`BusinessPagedTable` 及分页辅助仅供本次新增的每日检查列表使用，没有把其他业务台账切换成该封装。项目管理仅增加本功能所需的调度标签，不带入旧工程对其他模块的分页改动。

## 本地检查

在工程目录执行以下命令：

```powershell
node scripts/test-daily-dispatch-check.mjs
node scripts/test-inspection-card-status.mjs
node scripts/test-inspection-examples.mjs
node scripts/test-inspection-ledger-query.mjs
node scripts/test-inspection-ledger-status.mjs
node scripts/test-client-pagination.mjs
node scripts/check-style-scope.mjs
npm run build
node scripts/check-style-scope.mjs --dist dist
node scripts/smoke-inspection-attachments.mjs
node scripts/smoke-inspection-ledger-query.mjs
node scripts/smoke-inspection-save-session.mjs
node scripts/smoke-inspection-personnel-rules.mjs
node scripts/smoke-inspection-report-1103.mjs
node scripts/smoke-inspection-cancel-examples.mjs
node scripts/smoke-inspection-documents.mjs
node scripts/smoke-inspection-documents.mjs --built
```

浏览器脚本启动隔离测试服务并在结束后关闭，截图和结果写入仓库根的本地忽略目录 `outputs/`。

文档中的源码链接已按团队工程目录适配；未迁移的历史归档保留原来源名称，业务规则正文保持来源版本。来源实现/迭代记录与本次团队集成验证分别记录。

本次本地合入范围、公共组件处理和测试结果见[集成验证记录](integration.md)。

此前集成时已同步的团队基线为`ac270291d86cb9146ee160e7488f2c2f652fc216`；该次历史同步与验证见[集成验证记录](integration.md)。
