# COC 调度中心（正式工程）

大屏与子模块源码目录。路由入口：`#/coc`（见 `src/router/index.js`）。

## 与历史 Demo 的关系

早期独立 Demo 已从仓库移除（2026-08-24 决策）；正式迭代只在本目录与 `src/views/cocAdmin/`、`src/coc/utils/` 进行。

## 与个人中心

- 处罚单待办：`type: penalty`
- 调度隐患待办：`type: dispatch_hazard`

处置入口：**个人中心 → 我的待办**（非模块内审批）。
