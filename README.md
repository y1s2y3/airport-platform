# 深圳机场扩建工程信息化平台

基于 Figma「后台UI规范」实现的机场工程项目管理一体化前端，整合 COC 调度大屏与后台管理模块。

## 技术栈

- Vue 3 + Vite
- Element Plus
- Vue Router
- ECharts

## 启动

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build              # 标准 Web 构建
npm run build:html         # 一体化平台单文件 HTML
npm run build:coc-html     # COC 调度大屏单文件 HTML（三视图）
```

## 已实现模块

- 后台整体布局（顶部导航 + 左侧菜单 + 主内容区）
- COC 调度大屏（指挥部 / 项目视图 / 项目调度）
- 质量管理 · 质量控制点模板库
- 安全管理 · 劳务管理（看板、实名、考勤、预警、轨迹、设备等）
- 安全管理 · 车辆管理（看板、台账、通行、轨迹、预警等）
- 视频监控 · NVR 设备管理与监控页面

## 设计规范

- 主色：`#91003D`（深酒红）
- 侧栏背景：`#FBF5F6`
- 参考：Figma 后台UI规范 / 招投标用UI页面

## 版本

当前版本：**v0.3.0**
