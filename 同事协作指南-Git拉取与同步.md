# 同事协作指南 · 代码拉取与同步

> **所属系统**：工程建设智慧管控一体化平台
> **适用对象**：受邀加入 Gitee 仓库的协作同事（首次加入照第二节做一遍，之后只看第三、四节）
> **怎么用这份文件**：可以人工照着做，也可以**整篇交给 AI 助手**（DeepSeek Harness / Cursor / Claude 均可）由它代为执行；文末第十节另附一段可直接复制的指令。交给 AI 时建议同时说明：**你的操作系统（Windows / macOS / Linux）、本地是否已克隆过、本次要做什么**（首次拉取 / 改完推送 / 只拉最新）。
> **口径来源**：仓库根 `Git同步规则.md` 是唯一事实源，本文件是面向新同事的操作版，内容不一致时以 `Git同步规则.md` 为准。
> **更新日期**：2026-11-04

---

## 一、先记住三句话

1. **代码只有一处真相源**：Gitee 仓库 `SZ_airport` 的 `main` 分支。所有改动都往这里推，不要另建仓库、不要往别的仓库推。
2. **每次干活的第一步是「先拉」，最后一步是「提交并推送」**，中间不要跳过拉取直接推。
3. **只有工程目录进 Git**：`Airport_Expansion_Project_Informatization/` 之外的目录（调研记录、output、前端框架等）是各自本机的资料，不属于共享代码。

---

## 二、仓库信息（照抄，不要猜）

| 项目 | 内容 |
|---|---|
| Gitee 地址（HTTPS） | `https://gitee.com/yu-sailong1/SZ_airport.git` |
| 旧地址说明 | 2026-11-03 之前仓库名为 `shenzhan_airport`，现已改名；旧地址会 302 跳转到新地址，**请统一使用上面的新地址** |
| 协作分支 | `main`（仓库默认分支，克隆下来就在这里） |
| 目录布局 | **子目录布局**：仓库根下一层才是真实工程 `Airport_Expansion_Project_Informatization/` |
| 仓库容量 | 约 50 MB、约 700 个跟踪文件（不含依赖与构建产物，需本地安装） |
| 仓库顶层只有 6 项 | `.gitignore`、`AGENTS.md`、`Airport_Expansion_Project_Informatization/`、`Git同步规则.md`、`LICENSE`、`.dsh/` |
| **不在仓库里** | `node_modules/`、`dist/`、`release/`、调研记录、output、_archive、前端框架、memory、browser-screenshots —— 这些是本地资料，不进 Git |
| 线上演示站 | `https://y1s2y3.github.io/airport-platform/`（由管理员发布，**同事不要往它的仓库推任何东西**） |

技术栈：Vue 3 + Vite 8 + Element Plus + Vue Router + ECharts；数据是前端本地 Mock（`src/mock/`），本期**不写后端服务**。

---

## 三、一次性准备（只做一次，约 15 分钟）

### 3.1 接受邀请

1. 打开管理员发来的 Gitee 邀请链接，登录自己的 Gitee 账号并接受邀请；
2. 权限应为「开发者」（Developer）——能拉取、能推送到 `main`；
3. 用浏览器打开 `https://gitee.com/yu-sailong1/SZ_airport`，能看到仓库内容即说明权限已生效。

### 3.2 安装并配置 Git

1. 安装 **Git for Windows**（自带 Git Credential Manager 凭据管理器）：<https://git-scm.com/download/win>，一路默认安装即可。
2. 打开 PowerShell 或 Git Bash，配置提交身份（**必须做，否则提交会被拒绝或记错人**）：

```powershell
git config --global user.name  "你的姓名"
git config --global user.email "你的邮箱"
git config --global core.quotepath false    # 让中文文件名正常显示，不再转义成 \345\244\...
```

3. 版本确认：

```powershell
git --version     # 建议 2.40 以上
node -v           # 建议 v22 或 v24（Vite 8 要求 Node 20.19+ 或 22.12+）
npm -v
```

### 3.3 克隆代码

```powershell
cd D:\work                                       # 换成你自己的代码目录
git clone https://gitee.com/yu-sailong1/SZ_airport.git
cd SZ_airport
git branch --show-current                        # 应输出 main
```

首次克隆私有库会要求认证，两种方式任选：

- **账号 + 密码**：在弹窗里输入 Gitee 账号与密码；
- **账号 + 私人令牌（推荐）**：Gitee → 右上头像 →「设置」→「私人令牌」→ 生成新令牌（勾选 `projects` 权限），克隆时**用户名填 Gitee 账号，密码填令牌**。

> 如果反复弹窗或认证失败：Windows「凭据管理器」→ Windows 凭据 → 删除 `git:https://gitee.com` 条目后重试。

### 3.4 安装依赖并跑起来

```powershell
cd Airport_Expansion_Project_Informatization
npm ci                                          # 国内网络慢可加 --registry=https://registry.npmmirror.com
npm run dev                                     # 自动打开 http://localhost:5173
```

- 页面标题应显示「工程建设智慧管控一体化平台」，左侧有菜单即算启动成功；
- 端口被占用时：`npm run dev -- --port 5174`；
- 构建标准产物：`npm run build`（输出 `dist/`）；
- 构建单文件演示版：`npm run build:html`（输出 `release/` 下的单个 HTML，可双击打开）。

> `package.json` 的脚本已内置 `--configLoader native`，**不需要也不要手工改**。
> 构建失败先别提交，按第六节排查；`node_modules/`、`dist/`、`release/` 都不要提交。

---

## 四、日常同步（每次改代码都走一遍，顺序不能乱）

> **铁律：先拉取 → 再看差异 → 合并 → 最后才提交和推送。** 反过来做（先推后拉）会把对方已推上去的提交覆盖掉。

### 4.1 开工第一步：先拉

```powershell
git status --short                              # 先看自己工作区有没有未提交的改动
git fetch origin main                           # ① 拉取远端最新
git diff --name-status HEAD origin/main         # ② 看差什么文件（别看提交数，看文件清单）
git merge --ff-only origin/main                 # ③ 合并；若提示不能快进，改用 git merge origin/main
git rev-list --left-right --count HEAD...origin/main   # ④ 自检：输出应为 0  0（右侧必须为 0）
```

如果第 ③ 步因为本地有未提交改动而失败，按下面处理后再继续：

```powershell
git stash push -m "wip: 本轮说明"               # 先暂存本地改动
git merge --ff-only origin/main                  # 合并远端
git stash pop                                    # 恢复本地改动（有冲突按第六节处理）
```

### 4.2 改代码

只在 `Airport_Expansion_Project_Informatization/` 内改；改完先本地跑通（`npm run dev` 或 `npm run build`）。

### 4.3 提交（只提交工程目录）

```powershell
git add Airport_Expansion_Project_Informatization
git status --short                               # 再核一眼，确认没有误加其它目录
git commit -m "feat: 一句话说明改了什么"
```

### 4.4 推送并自检

```powershell
git push origin HEAD:main

git ls-remote origin refs/heads/main             # 远端 main 的提交号
git rev-parse HEAD                               # 本地提交号（两者应一致）
git rev-list --left-right --count HEAD...origin/main   # 推送后应仍为 0  0
```

### 4.5 提交信息写法

| 前缀 | 什么时候用 | 例子 |
|---|---|---|
| `feat:` | 新功能、新页面、新交互 | `feat: 新增危大工程信息登记页面` |
| `fix:` | 修缺陷、改错值 | `fix: 修复监理隐患列表图片列错位` |
| `chore:` | 版本号、配置、杂项 | `chore: 同步 Pages 发布后版本号` |

一次同步只提交一次，说明写清楚「改了什么」，不要写「更新」「优化一下」这类空话。

---

## 五、同步范围红线（违反会污染仓库，务必守住）

仓库根 `.gitignore` 前三行就定义了范围：`/*` 忽略一切，然后只反忽略 `.gitignore`、`Airport_Expansion_Project_Informatization/`、`Git同步规则.md`、`LICENSE` 等白名单。**这个机制保证大目录不会被误推上去。**

**四条禁令**：

1. ❌ 禁止 `git add -f` / `git add --force`（会穿透忽略规则，把 GB 级本地目录推上去）；
2. ❌ 禁止改动根 `.gitignore` 的前 3 行范围规则；
3. ❌ 禁止把 `node_modules/`、`dist/`、`release/`、调研记录、output、_archive 等提交进仓库；
4. ❌ 禁止把 Gitee 仓库镜像或推送到 GitHub 发布库（两边目录布局不同，会导致线上构建失败）。

**推送前跑一遍范围体检**（结果不对就停下排查，不要硬推）：

```powershell
git ls-tree --name-only HEAD          # 应只有 6 项，多出业务目录立刻停
git diff --cached --name-only | Where-Object { $_ -notlike '*Airport_Expansion_Project_Informatization/*' }
                                       # 暂存区越界检查：输出应为空（白名单文件除外）
git diff --name-status origin/main HEAD   # 本次到底要推哪些文件，逐条看
```

> 上面第二条是 **PowerShell 写法**；若使用 Git Bash / macOS / Linux，改用：
> `git diff --cached --name-only | grep -v '^Airport_Expansion_Project_Informatization/'`（输出应为空，白名单文件除外）。

大文件（录音、视频、超大 Excel、压缩包）请走网盘 / NAS / 移动硬盘，不要进 Git。

---

## 六、冲突处理

**什么时候会冲突**：两人改了「同一个文件的同一处」才冲突；改不同文件、或同一文件不同位置，Git 会自动合并。

- **机械冲突**（格式、缩进、空行）：可直接接受任一侧或保留两段，改完 `git add` + `git commit` 继续；
- **语义冲突**（同一功能两边各自实现、取值不同，例如同一个默认时长你写 6 小时、对方写 2 天）：**不要自己拍板**，把两侧改成一张对照表发给管理员，由业务方决定；
- 禁止用 `git checkout --ours`、`-X ours` 这类方式「蒙混」掉对方的改动。

冲突标记长这样，处理完要删干净：

```
<<<<<<< HEAD
你本地的内容
=======
远端的内容
>>>>>>> origin/main
```

---

## 七、常见问题对照表

| 现象 | 原因 | 处理 |
|---|---|---|
| `could not read Username` / 反复弹窗认证失败 | 凭据没存住或不支持密码登录 | 改用户名 + 私人令牌；或删除 Windows 凭据管理器里的 `git:https://gitee.com` 后重试 |
| `Updates were rejected because the remote contains work you do not have` | 远端有你的本地没有的提交（典型：忘了先拉） | 按 4.1 先 `fetch` + `merge`，再重新提交推送 |
| `Your local changes would be overwritten by merge` | 本地未提交改动和远端改了同一文件 | `git stash push` → 合并 → `git stash pop`，或直接提交本地改动后再合并 |
| `fatal: not a git repository` | 当前目录不在仓库内 | `cd` 到克隆下来的 `SZ_airport` 目录再执行 |
| `npm run dev` 打不开 / 端口被占用 | 5173 已被占用 | `npm run dev -- --port 5174` |
| 双击 `index.html` 白屏 | 工程目录的 `index.html` 是 Vite 开发入口，`file://` 打开必白屏 | 用 `npm run dev`，或先 `npm run build:html` 再打开 `release/` 下的单文件 HTML |
| 中文文件名显示成 `\345\244\...` | Git 默认转义非 ASCII 路径 | `git config --global core.quotepath false` |
| 构建报 Node 版本错误 | Node 版本过低 | 升级到 Node 22 LTS（或 ≥20.19）后删除 `node_modules` 重新 `npm ci` |

---

## 八、分工守则（减少冲突）

1. 尽量各自改**不同的模块/文件**；要动同一个文件，先在群里说一声；
2. 开工前先同步一次，确保拿到最新代码；
3. 一次只做一个功能，改完就提交推送，不要攒一大批；
4. 推送前本地能构建就先 `npm run build`，**构建失败不要推**；
5. 遇到不确定的业务口径（状态流转、字段取值、审批规则），停下来问管理员，不要自行编造。

---

## 九、管理员（我方）侧的配合动作

1. **邀请与权限**：已通过邀请链接把同事加为「开发者」；如需回收权限，在仓库「管理 → 仓库成员」中调整。
2. **同事推完之后**：我方每次同步的第一步同样是 `git fetch origin main` → `git diff --name-status HEAD origin/main` → `git merge --ff-only origin/main`，确认无分歧后再提交推送。
3. **线上发布只由我方执行**：GitHub Pages（`y1s2y3/airport-platform`）由管理员按 `Git同步规则.md` 第 3 节发布，同事只负责把代码合入 Gitee 的 `main`。

---

## 十、可直接复制给 AI 助手的指令块

> 用法：把 `====` 之间的整段复制给 AI 助手，并把尖括号内容替换成本次实际情况即可。

```
====
你是我的 Git 协作助手。我参与「工程建设智慧管控一体化平台」的前端原型项目，需要在本地拉取代码、修改后推送到 Gitee。
请严格按下面的信息与流程执行；遇到「必须停下来问我」的情况，先问我再继续，不要自行猜测。
开始前先告诉我三件事：你的操作系统（Windows / macOS / Linux）、我本地是否已克隆过这个仓库、本次要做什么（首次拉取 / 改完推送 / 只拉取最新）。

一、仓库信息（照此执行）
- Gitee 仓库（唯一真相源）：https://gitee.com/yu-sailong1/SZ_airport.git
  分支：main（默认分支）；目录布局：子目录布局，真实工程在 Airport_Expansion_Project_Informatization/ 下。
  仓库 2026-11-03 前名为 shenzhan_airport，现已改名，请统一使用 SZ_airport 这个新地址。
- 仓库顶层只有 6 项：.gitignore、AGENTS.md、Airport_Expansion_Project_Informatization/、Git同步规则.md、LICENSE、.dsh/
- 不进 Git 的本地目录：node_modules/、dist/、release/、调研记录、output、_archive、前端框架 等。
- GitHub 发布库（y1s2y3/airport-platform）只由管理员发布，禁止我推送。
- 技术栈：Vue 3 + Vite 8 + Element Plus，数据为前端本地 Mock，不写后端。

二、首次准备（若我本地还没有仓库）
  git config --global user.name  "<我的姓名>"
  git config --global user.email "<我的邮箱>"
  git config --global core.quotepath false
  cd <我的代码目录>
  git clone https://gitee.com/yu-sailong1/SZ_airport.git
  cd SZ_airport
  git branch --show-current            # 应为 main
  cd Airport_Expansion_Project_Informatization
  npm ci                               # 国内慢可加 --registry=https://registry.npmmirror.com
  npm run dev                          # 应打开 http://localhost:5173，标题为「工程建设智慧管控一体化平台」
                                       # 注意：这是常驻进程，确认页面正常后按 Ctrl+C 停止，不要让它阻塞后续步骤

三、每次改代码的固定流程（顺序不能变）
1) 先拉取并合并：
     git status --short
     git fetch origin main
     git diff --name-status HEAD origin/main
     git merge --ff-only origin/main
     git rev-list --left-right --count HEAD...origin/main    # 输出必须右侧为 0（0  0）
   若因本地未提交改动导致合并失败：git stash push -m "wip: <说明>" → git merge --ff-only origin/main → git stash pop
2) 改代码：只在 Airport_Expansion_Project_Informatization/ 内改；改完本地跑通（npm run dev 或 npm run build）。
3) 提交（只提交工程目录，禁止 git add -f）：
     git add Airport_Expansion_Project_Informatization
     git status --short
     git commit -m "feat: <一句话说明>"          # 前缀用 feat: / fix: / chore:
4) 推送并自检：
     git push origin HEAD:main
     git ls-remote origin refs/heads/main        # 远端提交号
     git rev-parse HEAD                          # 本地提交号（应一致）
     git rev-list --left-right --count HEAD...origin/main    # 应为 0  0
5) 范围体检（推送前执行，结果异常就停）：
     git ls-tree --name-only HEAD                # 应只有 6 项
     # PowerShell 写法（输出应为空）：
     git diff --cached --name-only | Where-Object { $_ -notlike '*Airport_Expansion_Project_Informatization/*' }
     # Git Bash / macOS / Linux 写法（输出应为空）：
     git diff --cached --name-only | grep -v '^Airport_Expansion_Project_Informatization/'

四、红线（违反即事故）
- 禁止 git add -f / git add --force；
- 禁止改动根 .gitignore 的前 3 行范围规则；
- 禁止提交 node_modules/、dist/、release/、调研记录、output、_archive 等本地目录；
- 禁止往 GitHub 发布库（y1s2y3/airport-platform）推任何东西；
- 禁止用 checkout --ours / -X ours 掩盖对方改动；
- 构建失败不要推送。

五、冲突处理
- 机械冲突（格式/缩进/空行）可自行合并；
- 语义冲突（同一功能两边取值不同）必须列「两边对照表」发给我，由我找业务方拍板，不得自行选择。

六、完成后给我一份核对报告
1. 这次拉取了哪些文件（文件清单）、合并了几个提交；
2. 自己改了哪些文件、提交信息是什么；
3. 推送结果：本地与远端 main 的提交号，分歧是否为 0 0；
4. 有无冲突、如果有是怎么处理的。

七、遇到这些情况停下来问我
- 语义冲突；
- 不确定某个文件该不该提交；
- 认证/权限失败，重试仍不行；
- 本地构建失败；
- 网络持续报错（可先重试 3~5 次）。
====
```
