# 每日调度检查数据库物理设计（MySQL 8.0）

> **基线说明（2026-11-04）：** 本技术方案按旧Markdown PRD编制，尚未按[现行Word PRD v1.0](../requirements/Daily_Dispatch_Check_PRD_v1.0.docx)完成复核；当日统一调度二态已按最新确认与原非空字段一致，其余审查事项见[核查清单D04/F01](../requirements/每日调度检查_PRD_v1.0_核查清单.md)。本轮不改DDL或执行建库，不能把此稿视为新Word已对齐方案。

| 项目 | 内容 |
| --- | --- |
| 版本 / 日期 | V1.3 · 研发评审版 / 2026-11-03 |
| 业务基线 | [PRD V1.7](../requirements/每日调度检查需求文档_PRD.md)与[逻辑设计](每日调度检查数据库逻辑设计.md) |
| 数据库 | 按用户提供的相邻模块DDL约定：MySQL 8.0、InnoDB、utf8mb4、utf8mb4_general_ci |
| 交付 | [完整建表脚本](每日调度检查建表脚本_MySQL8.sql)，只定义本模块表，未连接业务数据库执行 |

本版同步安质部调度人员选填及项目部两类当前用户默认，保留逐问题图文必填约束；仅更新字段说明和应用约束，表、类型、可空性及索引结构不变。当前仅静态设计，未连接MySQL执行。

## 1. 物理约定

- 表前缀`ddc_`，id及外部引用为bigint，主键由平台应用侧生成。接口将bigint ID序列化为字符串，避免JavaScript数值精度问题；当前原型的字符串ID须由对接适配层映射，不把演示ID当生产bigint。
- `org_fid/org_fname`在主记录保留平台组织路径/名称快照，子表权限沿day_id关系链检查。项目、人员、组织、文件不建对端表、不写对端字段。
- 模块内及跨模块均无物理外键；普通索引只支持定位，不代替存在性/同日/同部分/组织权限检查。写入顺序、行级校验和事务由应用负责。
- `check_date`使用DATE并按北京时间确定业务归属；所有DATETIME(3)约定存UTC，接口输出带偏移/时区的时间字符串。建表会话与运行连接均需统一UTC，不把终端时区混入业务日。
- 字符长度遵循PRD和既有平台字段。VARCHAR(100/200/500)不表示按UTF-8字节数校验；项目部正常说明用LONGTEXT承载，不借建表新增500字限制。外部名称超过映射长度时不得静默截断，需核对平台真实字段。
- 枚举使用tinyint或ASCII代码列，合法值、互斥父级及跨表数量由服务端校验；DDL不依赖不同MySQL 8.0小版本的CHECK执行差异。
- 技术created_at/updated_at与业务last_submitted_at分开；初始化、范围增补不能让台账误显示业务保存时间。

建表语法、字符集及表选项依据[MySQL官方CREATE TABLE说明](https://dev.mysql.com/doc/refman/8.0/en/create-table.html)。保留平台“不建物理外键”的约定，不从其他模块示例复制删表或关闭外键检查语句。

## 2. 表与字段字典

物理字段字典与交付SQL由同一份本次设计定义生成。SQL为新建库的初始DDL，不是对已有生产表的ALTER升级脚本；已有同名表需研发/DBA先做结构差异评审。

### 2.1 ddc_day — 每日检查主记录

同一指挥部同一业务日期唯一；查询空日期不改变本表；生成、补行、初始化不更新last_submitted_at。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `hq_org_id` | `bigint` | 否 | 调用方写入 | 所属指挥部组织id，引用平台现有组织，不新建租户 |
| `org_fid` | `varchar(255)` | 是 | NULL | 平台组织完整id快照，沿用既有权限口径 |
| `org_fname` | `varchar(255)` | 是 | NULL | 平台组织完整名称快照 |
| `check_date` | `date` | 否 | 调用方写入 | 北京时间业务检查日期，不存时间部分 |
| `generated_at` | `datetime(3)` | 否 | 调用方写入 | 实际生成时间，UTC；不得冒充零点快照时间 |
| `project_snapshot_at` | `datetime(3)` | 否 | 调用方写入 | 初始项目范围实际取数时间，UTC |
| `project_snapshot_ref` | `varchar(255)` | 是 | NULL | 项目源可提供时记录快照或版本标识，不虚构版本 |
| `scope_version` | `bigint unsigned` | 否 | `0` | 项目范围技术版本；不替代三部分正文版本 |
| `defaults_initialized_at` | `datetime(3)` | 是 | NULL | 首次默认值快照完成时间；NULL表示未初始化，空快照也写时间 |
| `defaults_initialized_by` | `bigint` | 是 | NULL | 首次初始化实际操作用户id |
| `last_submitted_at` | `datetime(3)` | 是 | NULL | 三部分成功保存时间的最大值；没有保存为NULL |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_day_org_date (hq_org_id, check_date)`。同一指挥部日期唯一，日期查询/倒序分页复用该索引，不重复建立同前缀列表索引，也不为当前没有的保存时间筛选预建索引；实际执行计划由DBA验证。

### 2.2 ddc_hq_record — 已保存统一调度部分

未保存时可以不存在此行，前端expectedVersion=0；写入本表、所属项目内容与审计须同事务，不能写项目部两部分。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day.id，唯一 |
| `focus_department` | `varchar(200)` | 是 | NULL | 重点调度部门，选填 |
| `attendance` | `varchar(200)` | 是 | NULL | 参会情况，首次编辑默认值在前端草稿中产生 |
| `dispatcher_user_id` | `bigint` | 是 | NULL | 选填；选择须为安质部启用用户，未选择或清空为NULL |
| `dispatcher_name_snapshot` | `varchar(200)` | 否 | 调用方写入 | 已选调度人员姓名快照；未选择或清空写空字符串 |
| `department_attendance` | `varchar(200)` | 是 | NULL | 各部门参会情况，选填 |
| `overall_remark` | `varchar(500)` | 是 | NULL | 当日整体备注，不含单独附件 |
| `needs_user_binding` | `tinyint unsigned` | 否 | `0` | 0已关联或选填留空，1仅迁移历史姓名待绑定；新保存为0 |
| `version` | `bigint unsigned` | 否 | 调用方写入 | 统一调度独立保存版本，首次为1 |
| `first_submitted_at` | `datetime(3)` | 否 | 调用方写入 | 首次成功保存时间，UTC |
| `last_submitted_at` | `datetime(3)` | 否 | 调用方写入 | 最近成功保存时间，UTC |
| `operator_user_id` | `bigint` | 是 | NULL | 最近保存实际操作用户id；新保存必有值，历史实际账号无法核实时可NULL |
| `operator_name_snapshot` | `varchar(255)` | 是 | NULL | 实际操作用户姓名快照 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_hq_day (day_id)`。

### 2.3 ddc_day_project — 日期与项目的保存关系

历史查询按保存关系读取，不联查当前隐藏状态过滤；移除改状态不物理删关系，恢复沿用原名称快照；有内容/保存保护/有效锁时拒绝不合法移除。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day.id |
| `project_id` | `bigint` | 否 | 调用方写入 | 引用平台项目id，不建对端项目表 |
| `project_name_snapshot` | `varchar(255)` | 否 | 调用方写入 | 项目纳入该日期时的完整名称快照 |
| `project_short_name_snapshot` | `varchar(255)` | 是 | NULL | 项目简称快照，可空 |
| `sort_no` | `int unsigned` | 否 | 调用方写入 | 稳定显示顺序，按sort_no和id排序 |
| `inclusion_state` | `tinyint unsigned` | 否 | `1` | 1在当日范围内，0已移除但保留恢复关系 |
| `is_unified` | `tinyint unsigned` | 否 | `0` | 最后已保存的当日统一调度标记，只有统一调度部分能写 |
| `ever_submitted_content` | `tinyint unsigned` | 否 | `0` | 曾有已保存有效内容或调度标记的粘性保护标记，不允许客户端回退 |
| `included_at` | `datetime(3)` | 否 | 调用方写入 | 纳入关系时间，UTC，不作为业务保存时间 |
| `removed_at` | `datetime(3)` | 是 | NULL | 空白初始关系移除时间，UTC，恢复后置NULL |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_day_project (day_id, project_id)`；普通`idx_ddc_scope_rows (day_id, inclusion_state, sort_no, id)`；普通`idx_ddc_project_days (project_id, day_id)`。

### 2.4 ddc_hq_project — 统一调度的项目级内容

与日期项目关系及统一调度主记录必须属于同一日；不预建全量空白正文；安全/质量/摄像头结果存于ddc_check_item。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `hq_record_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_hq_record.id |
| `day_project_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day_project.id，唯一 |
| `personnel_result_type` | `tinyint unsigned` | 否 | `0` | 人员履职：0未填、1正常、3其他，不允许2发现问题 |
| `personnel_other_text` | `varchar(100)` | 是 | NULL | 人员履职其他说明，仅其他分支有效 |
| `project_remark` | `varchar(100)` | 是 | NULL | 项目行备注，附件独立关联；与整体备注分开 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_hq_project (day_project_id)`；普通`idx_ddc_hq_rows (hq_record_id, day_project_id)`。

### 2.5 ddc_project_check — 值班人员或项目经理独立保存部分

无保存不预建记录；对应检查结果与问题、附件同事务写入；合法跨项目启用用户可以保存，不能按项目归属再次拒绝。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_project_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day_project.id |
| `part_kind` | `tinyint unsigned` | 否 | 调用方写入 | 1项目部值班人员，2项目经理 |
| `selected_user_id` | `bigint` | 是 | NULL | 业务姓名对应系统用户id；新保存必有值，迁移历史未绑定可NULL |
| `selected_name_snapshot` | `varchar(255)` | 否 | 调用方写入 | 本次检查业务姓名快照 |
| `needs_user_binding` | `tinyint unsigned` | 否 | `0` | 0已关联身份，1仅迁移历史姓名待绑定；新保存必须为0 |
| `version` | `bigint unsigned` | 否 | 调用方写入 | 当前部分独立保存版本，首次为1；不与另一部分共用 |
| `first_submitted_at` | `datetime(3)` | 否 | 调用方写入 | 当前部分首次成功保存时间，UTC |
| `last_submitted_at` | `datetime(3)` | 否 | 调用方写入 | 当前部分最近成功保存时间，UTC |
| `operator_user_id` | `bigint` | 是 | NULL | 最近保存实际账号id；新保存必有值，历史实际账号无法核实时可NULL |
| `operator_name_snapshot` | `varchar(255)` | 是 | NULL | 实际操作用户姓名快照 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_project_part (day_project_id, part_kind)`。

### 2.6 ddc_check_item — 结构化检查结果

应用层校验唯一父级与check_key匹配；只存生效分支，其他正文/问题/附件不混入当前结果；HQ空结果可无行，项目部保存必须有完整有效结果。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `hq_project_id` | `bigint` | 是 | NULL | 统一调度项目内容id；与project_check_id恰有一项非NULL |
| `project_check_id` | `bigint` | 是 | NULL | 项目部独立部分id；与hq_project_id恰有一项非NULL |
| `check_key` | `varchar(16) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | HQ为SAFETY/QUALITY/CAMERA，项目部为PROJECT |
| `result_type` | `tinyint unsigned` | 否 | `0` | 0未填、1正常、2发现问题、3其他 |
| `normal_text` | `longtext` | 是 | NULL | 正常说明；项目部必填且不擅加500字上限 |
| `other_text` | `varchar(500)` | 是 | NULL | 其他说明，有效文字必填且最多500字 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_hq_check (hq_project_id, check_key)`；唯一`uk_ddc_person_check (project_check_id)`。

### 2.7 ddc_problem — 具体问题明细

仅发现问题分支保留1至10条；问题稳定id供附件关联，不以页面问题序号作为跨表主键。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `check_item_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_check_item.id |
| `sort_no` | `tinyint unsigned` | 否 | 调用方写入 | 当前检查结果内的问题顺序，1至10 |
| `description` | `varchar(500)` | 否 | 调用方写入 | 问题有效描述，去除首尾空白后1至500字 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_problem_order (check_item_id, sort_no)`。

### 2.8 ddc_attachment — 检查图片引用与归属

不存base64、原图二进制或有时效的签名URL；问题图片按问题归属，统一调度及项目部每条问题必填1～9张，不额外设部分总数9张。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `check_item_id` | `bigint` | 是 | NULL | 正常或其他分支的检查结果id；三个归属id恰有一个非NULL |
| `problem_id` | `bigint` | 是 | NULL | 问题图片所属问题id；三个归属id恰有一个非NULL |
| `hq_project_id` | `bigint` | 是 | NULL | 项目备注图片所属统一调度项目行；三个归属id恰有一个非NULL |
| `usage_kind` | `varchar(16) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | NORMAL/OTHER/PROBLEM/REMARK，必须与父级及当前分支一致 |
| `file_id` | `bigint` | 否 | 调用方写入 | 平台文件服务id，不另建对端文件表 |
| `file_name_snapshot` | `varchar(255)` | 否 | 调用方写入 | 文件名称快照 |
| `mime_type` | `varchar(100)` | 否 | 调用方写入 | 有效图片媒体类型，服务端核验 |
| `size_bytes` | `bigint unsigned` | 否 | 调用方写入 | 文件实际字节数，检查图片单张最大5MB |
| `sort_no` | `tinyint unsigned` | 否 | 调用方写入 | 当前归属控件内图片顺序，1至9 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_check_image_order (check_item_id, usage_kind, sort_no)`；唯一`uk_ddc_problem_image_order (problem_id, sort_no)`；唯一`uk_ddc_remark_image_order (hq_project_id, sort_no)`；普通`idx_ddc_file_refs (file_id)`。

### 2.9 ddc_default_project — 首次调度默认值快照明细

和day.defaults_initialized_at一起原子完成；空明细也必须有完成标记，取消重进不再次取数；不作为已保存检查结果。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day.id |
| `day_project_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day_project.id，必须同日 |
| `dispatch_tag_snapshot` | `tinyint unsigned` | 否 | 调用方写入 | 初始化读取的调度标签，0关1开 |
| `hidden_snapshot` | `tinyint unsigned` | 否 | 调用方写入 | 初始化取数时隐藏配置快照，0未隐藏1隐藏 |
| `default_selected` | `tinyint unsigned` | 否 | 调用方写入 | 按PRD首次规则得到的默认调度选择，0或1 |
| `snapshot_at` | `datetime(3)` | 否 | 调用方写入 | 本次默认快照时间，UTC |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |

索引：主键`id`；唯一`uk_ddc_default_project (day_id, day_project_id)`。

### 2.10 ddc_edit_lock — 可续租的编辑占用

统一调度与两种项目部分资源粒度不同；有效期/续期间隔由研发评审，不能把原型120秒/30秒写成产品固定值。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day.id |
| `day_project_id` | `bigint` | 是 | NULL | 项目部分引用日期项目关系；统一调度为NULL |
| `part_kind` | `tinyint unsigned` | 否 | 调用方写入 | 0统一调度、1值班人员、2项目经理 |
| `resource_key` | `varchar(96) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | 唯一服务端资源键：HQ:日id或DUTY/MANAGER:日期项目id |
| `holder_user_id` | `bigint` | 是 | NULL | 当前占用账号id，空闲为NULL |
| `holder_name_snapshot` | `varchar(255)` | 是 | NULL | 占用账号姓名快照 |
| `token_hash` | `char(64) CHARACTER SET ascii COLLATE ascii_bin` | 是 | NULL | 不可猜测占用令牌的摘要；空闲为NULL |
| `lease_version` | `bigint unsigned` | 否 | `0` | 每次重新占用递增；释放保留资源行，旧令牌不得释放新锁 |
| `expires_at` | `datetime(3)` | 是 | NULL | 服务端UTC到期时间；空闲为NULL |
| `last_renewed_at` | `datetime(3)` | 是 | NULL | 最近有效续期时间，UTC |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_lock_resource (resource_key)`；普通`idx_ddc_day_active_locks (day_id, expires_at)`；普通`idx_ddc_lock_holder (holder_user_id, expires_at)`。

### 2.11 ddc_change_log — 独立部分保存审计与请求去重

和业务正文在同一事务写入；只读、初始化、抽屉应用及补行不是业务保存；重复请求校验同一账号/资源/摘要后返回原保存回执，不再次加版本。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `day_id` | `bigint` | 否 | 调用方写入 | 逻辑关联ddc_day.id |
| `day_project_id` | `bigint` | 是 | NULL | 项目部分对应日期项目关系；统一调度为NULL |
| `part_kind` | `tinyint unsigned` | 否 | 调用方写入 | 0统一调度、1值班人员、2项目经理 |
| `request_id` | `varchar(64) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | 服务端校验的保存幂等请求id，全局唯一 |
| `payload_hash` | `char(64) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | 所属部分规范化有效载荷摘要，用于识别相同请求id不同内容 |
| `before_version` | `bigint unsigned` | 否 | 调用方写入 | 变更前所属部分版本，首次为0 |
| `after_version` | `bigint unsigned` | 否 | 调用方写入 | 成功保存后的所属部分版本 |
| `operator_user_id` | `bigint` | 否 | 调用方写入 | 实际保存账号id |
| `operator_name_snapshot` | `varchar(255)` | 是 | NULL | 实际账号姓名快照 |
| `changed_at` | `datetime(3)` | 否 | 调用方写入 | 成功保存时间，UTC |
| `before_snapshot` | `json` | 是 | NULL | 所属部分变更前快照，仅内容及文件引用；首次可NULL |
| `after_snapshot` | `json` | 否 | 调用方写入 | 所属部分变更后快照，仅内容及文件引用，不含图片二进制 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |

索引：主键`id`；唯一`uk_ddc_submit_request (request_id)`；普通`idx_ddc_day_changes (day_id, changed_at, id)`；普通`idx_ddc_part_changes (day_project_id, part_kind, after_version)`。

### 2.12 ddc_migration_backup — 历史导入备份与映射凭据

先备份后转换，不按历史文字推断检查结论；只迁移已确认映射，不按当前隐藏配置重建历史；来源文件与平台文件表保持逻辑引用。

| 字段 | MySQL类型 | 可空 | 默认值 | 含义与约束 |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | 否 | 调用方写入 | 主键id，沿用平台应用侧主键生成，不使用数据库自增 |
| `batch_no` | `varchar(64) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | 技术导入批次号，不是页面业务编号 |
| `source_system` | `varchar(64)` | 否 | 调用方写入 | 历史来源标识，含原型导出或旧系统 |
| `source_record_key` | `varchar(128)` | 否 | 调用方写入 | 原来源记录定位键 |
| `hq_org_id` | `bigint` | 否 | 调用方写入 | 归属指挥部组织id，防止跨作用域映射 |
| `check_date` | `date` | 是 | NULL | 可识别时记录原业务检查日期 |
| `source_payload_file_id` | `bigint` | 否 | 调用方写入 | 文件服务中原始导出包引用，避免把大段base64塞入MySQL |
| `content_sha256` | `char(64) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | 原始备份内容校验摘要 |
| `mapped_day_id` | `bigint` | 是 | NULL | 成功映射到ddc_day.id后填写 |
| `mapping_state` | `varchar(16) CHARACTER SET ascii COLLATE ascii_bin` | 否 | 调用方写入 | PENDING/MAPPED/REVIEW，需人工处理不能冒充已迁移 |
| `mapping_note` | `varchar(1000)` | 是 | NULL | 结构/用户/附件未映射原因及核对记录 |
| `created_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3)` | 记录创建时间，UTC |
| `updated_at` | `datetime(3)` | 否 | `CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` | 技术更新时间，UTC；不作为业务最近保存时间 |

索引：主键`id`；唯一`uk_ddc_migration_source (batch_no, source_record_key)`；普通`idx_ddc_migration_day (mapped_day_id)`；普通`idx_ddc_migration_review (hq_org_id, mapping_state, id)`。

## 3. 必须由应用实现的关系与约束

| 检查点 | 必须验证 |
| --- | --- |
| 全部逻辑父级 | 引用存在，属于同一指挥部/日期；不可仅凭传入子表ID写入 |
| check_item | hq_project_id/project_check_id恰一个非空；HQ只允许SAFETY/QUALITY/CAMERA，项目部分只允许PROJECT |
| attachment | check_item_id/problem_id/hq_project_id恰一个非空；usage_kind匹配有效分支和父级 |
| 分支清理 | 只改所属部分当前结果，未生效分支及删除问题不参与统计/校验；不能清理他人部分或其他问题附件 |
| 范围保护 | inclusion_state改变前查最新内容、ever_submitted_content和有效项目占用；恢复沿用名称，当前隐藏不排除历史 |
| 业务姓名 | 项目部姓名必填且关联启用用户，支持合法跨项目选择；调度人员选填，有值时限定安质部启用用户，无值写NULL ID＋空姓名＋needs_user_binding=0；历史姓名只读/取消保留，成功保存才按新值更新 |
| 编辑占用 | 持有人、令牌摘要、lease_version、expires_at及资源键一致；旧客户端不能释放新锁 |
| 幂等 | request_id已成功必须验证原账号/资源/载荷摘要，返回原回执，不再次写审计/版本 |
| 校验和数量 | 文字、问题1～10、每问题图片1～9张、项目部正常/其他1～9张、备注0～9张及单张5MB |

可空字段参与不同父级唯一索引时，不能靠NULL值推导互斥父级约束；父级互斥始终由应用验证。稳定排序使用业务日期及唯一ID，不用自增假设或中文名称排序确定身份。

## 4. 保存事务与索引使用

占用和版本核验必须在短事务内与业务写入、审计保存配合；固定锁定顺序见逻辑设计第6节。MySQL的锁定读取应在事务内使用，不能用一次普通SELECT的旧结果代替保存时核验，参见[官方Locking Reads说明](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html)。

| 操作 | 主要索引与读写要求 |
| --- | --- |
| 幂等建日 | uk_ddc_day_org_date，重复不能覆盖日表和历史范围 |
| 日期列表 | uk_ddc_day_org_date，以权限和可选日期过滤后倒序分页；不预取图片或所有详情 |
| 项目详情 | idx_ddc_scope_rows，读取active保存关系及名称，不按当前隐藏过滤 |
| 统一调度/两部分 | uk_ddc_hq_day、uk_ddc_hq_project、uk_ddc_project_part定位所属部分；version比较后写 |
| 结果/问题/附件 | 对应父级唯一/顺序索引，按当前页day集合聚合，不导致问题×图片连接放大计数 |
| 编辑占用与范围重校 | uk_ddc_lock_resource、idx_ddc_day_active_locks；同一共享范围锁定顺序防并发漏查 |
| 成功保存重试 | uk_ddc_submit_request，先检查成功请求回执，避免网络超时导致重复版本 |
| 日志/迁移 | 按day_id及时间定位，原导出包引用可核验，业务权限不能被技术索引绕过 |

只列首版有明确访问路径的索引，不预建独立全文/分区/冗余摘要表。真实项目数、日表年限和并发由研发实测执行计划后调整索引；增加索引属于技术评审，不能改变统计或日期筛选口径。索引语法依据[MySQL官方CREATE INDEX说明](https://dev.mysql.com/doc/refman/8.0/en/create-index.html)。

## 5. 摘要与问题合计实现约束

列表查询拆为：匹配日期总数、当前页日期ID、当前页摘要聚合，以及需要时的完整筛选范围合计。五类结果和数量由同一规则计算，不能为了十条列表把所有完整检查表下载到前端。

先按check_item聚合有效问题数量，再与项目关系/图片关联，不能直接COUNT多表连接后的问题行；一条问题有多张图仍只计一条问题。安全质量仅取HQ且is_unified=1的SAFETY/QUALITY，摄像头独立取CAMERA，项目部问题不加进这两项。

无HQ保存为NULL；有问题为有效条数；无问题但该维度存在明确正常为0；其他/未填为NULL。范围合计保留SUM全部NULL仍为NULL的语义，不统一COALESCE成0。关系为空的日表通过LEFT JOIN保留；空日期参数省略日期谓词，不换成默认时间。

状态优先级为发现问题＞其他＞正常＞未填，必须显式映射，例如`CASE result_type WHEN 2 THEN 3 WHEN 3 THEN 2 WHEN 1 THEN 1 ELSE 0 END`，不能直接MAX枚举值。项目部值班和经理分别按part_kind聚合。

同一请求的记录/total/totals采用一致读取；跨页若需要固定查询集合，评审查询令牌/快照方案。没有前台业务删日功能，也不允许以清空日期触发删除；后台迁移、修复等并发变化不能被稳定排序这一条规则掩盖。

## 6. 研发评审项与执行验证

| 项目 | 责任与交付 |
| --- | --- |
| 平台字段适配 | 研发核对组织路径、用户/项目/文件实际主键和公共审计字段，调整物理命名但不改变逻辑关系 |
| MySQL实例参数 | DBA核对实际8.0小版本、sql_mode、UTC连接、备份、容量和索引执行计划 |
| 并发实现 | 研发验证版本原子比较、占用续租、范围与有效锁的竞态、幂等重试及死锁回滚 |
| 任务和附件 | 研发/运维评审调度补偿、原始快照恢复、文件引用/临时文件清理、日志备份保留 |
| 验证范围 | 在隔离实例执行建表和边界写入，再做接口、并发、性能与迁移回归；产品核对业务结果，技术组负责技术选型与执行证明 |

本轮对DDL做MySQL语法静态解析及表/字段/索引/无物理外键/无破坏性语句核对。当前机器未发现可直接使用的MySQL命令行或Docker，本轮未连接数据库执行DDL；不能将解析通过写成实例建表或生产性能验收通过。


### 本轮保存与填写准入约束

保存成功即形成有效结果；first_submitted_at、last_submitted_at及submit相关表/方法沿用历史命名，字段/索引结构不变。进入统一调度填写前必须按组织＋检查日期＋统一调度资源原子申请占用，失败返回占用反馈，不开放填写页；其他日期及项目部两个部分独立。只读详情不占用。返回/取消确认放弃后释放自己的令牌，保存成功同事务写正文/审计并释放，失败不丢输入。

正式服务端应核验刷新恢复所携原会话令牌、持有人及旧会话有效性，不能只凭相同用户ID接管活跃会话；恢复需原子更换令牌/租约版本，旧令牌不能再写入或释放新占用。断线回收、心跳及跨设备可靠性由正式服务端实现，原型浏览器存活证明不替代该机制。
