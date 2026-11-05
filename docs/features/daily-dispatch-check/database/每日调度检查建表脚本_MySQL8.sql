-- 每日调度检查（DDC / daily-dispatch-check）数据库设计
-- 基线更新：现行业务依据为用户指定Word PRD v1.0（2026-11-04）；本脚本仍为旧Markdown方案，调度标记二态已与最新确认一致，其余内容尚待复核，本轮未改DDL或执行。
-- 对齐 PRD：每日调度检查需求文档_PRD.md V1.7（研发交底评审版，2026-11-03）
-- 范围：仅指挥部模块；项目、用户、组织、文件均引用平台现有数据，不创建或写入对端表
-- 外键：模块内和跨模块均不建物理FK；逻辑关联由应用层校验、事务和索引保障
-- 字符集：MySQL 8.0 / InnoDB / utf8mb4 / utf8mb4_general_ci
-- 仅创建本模块表，不包含删表或关闭外键检查；本轮未连接数据库执行，由研发评审验证后使用
-- id由平台应用侧生成；API将bigint id序列化为字符串，避免前端精度丢失
-- check_date为北京时间业务日期；DATETIME(3)约定存UTC，应用连接同样设置UTC
-- 枚举、互斥父级、跨表归属、数量及附件校验由应用层实现，不依赖CHECK版本差异
-- 调度人员选填：未选择/清空写NULL用户id、空字符串姓名、needs_user_binding=0；项目部姓名仍必填关联启用用户
-- 两类项目部新填写均默认当前登录启用用户；编辑保留原业务姓名，实际操作账号独立记录
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- table-role: main
-- 每日检查主记录：同一指挥部同一业务日期唯一；查询空日期不改变本表；生成、补行、初始化不更新last_submitted_at。
CREATE TABLE `ddc_day` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `hq_org_id` bigint NOT NULL COMMENT '所属指挥部组织id，引用平台现有组织，不新建租户',
  `org_fid` varchar(255) NULL DEFAULT NULL COMMENT '平台组织完整id快照，沿用既有权限口径',
  `org_fname` varchar(255) NULL DEFAULT NULL COMMENT '平台组织完整名称快照',
  `check_date` date NOT NULL COMMENT '北京时间业务检查日期，不存时间部分',
  `generated_at` datetime(3) NOT NULL COMMENT '实际生成时间，UTC；不得冒充零点快照时间',
  `project_snapshot_at` datetime(3) NOT NULL COMMENT '初始项目范围实际取数时间，UTC',
  `project_snapshot_ref` varchar(255) NULL DEFAULT NULL COMMENT '项目源可提供时记录快照或版本标识，不虚构版本',
  `scope_version` bigint unsigned NOT NULL DEFAULT 0 COMMENT '项目范围技术版本；不替代三部分正文版本',
  `defaults_initialized_at` datetime(3) NULL DEFAULT NULL COMMENT '首次默认值快照完成时间；NULL表示未初始化，空快照也写时间',
  `defaults_initialized_by` bigint NULL DEFAULT NULL COMMENT '首次初始化实际操作用户id',
  `last_submitted_at` datetime(3) NULL DEFAULT NULL COMMENT '三部分成功保存时间的最大值；没有保存为NULL',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_day_org_date` (`hq_org_id`, `check_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='每日检查主记录';

-- table-role: detail
-- 已保存统一调度部分：未保存时可以不存在此行，前端expectedVersion=0；写入本表、所属项目内容与审计须同事务，不能写项目部两部分。
CREATE TABLE `ddc_hq_record` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_id` bigint NOT NULL COMMENT '逻辑关联ddc_day.id，唯一',
  `focus_department` varchar(200) NULL DEFAULT NULL COMMENT '重点调度部门，选填',
  `attendance` varchar(200) NULL DEFAULT NULL COMMENT '参会情况，首次编辑默认值在前端草稿中产生',
  `dispatcher_user_id` bigint NULL DEFAULT NULL COMMENT '选填；选择须为安质部启用用户，未选择或清空为NULL',
  `dispatcher_name_snapshot` varchar(200) NOT NULL COMMENT '已选调度人员姓名快照；未选择或清空写空字符串',
  `department_attendance` varchar(200) NULL DEFAULT NULL COMMENT '各部门参会情况，选填',
  `overall_remark` varchar(500) NULL DEFAULT NULL COMMENT '当日整体备注，不含单独附件',
  `needs_user_binding` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0已关联或选填留空，1仅迁移历史姓名待绑定；新保存为0',
  `version` bigint unsigned NOT NULL COMMENT '统一调度独立保存版本，首次为1',
  `first_submitted_at` datetime(3) NOT NULL COMMENT '首次成功保存时间，UTC',
  `last_submitted_at` datetime(3) NOT NULL COMMENT '最近成功保存时间，UTC',
  `operator_user_id` bigint NULL DEFAULT NULL COMMENT '最近保存实际操作用户id；新保存必有值，历史实际账号无法核实时可NULL',
  `operator_name_snapshot` varchar(255) NULL DEFAULT NULL COMMENT '实际操作用户姓名快照',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_hq_day` (`day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='已保存统一调度部分';

-- table-role: relation
-- 日期与项目的保存关系：历史查询按保存关系读取，不联查当前隐藏状态过滤；移除改状态不物理删关系，恢复沿用原名称快照；有内容/保存保护/有效锁时拒绝不合法移除。
CREATE TABLE `ddc_day_project` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_id` bigint NOT NULL COMMENT '逻辑关联ddc_day.id',
  `project_id` bigint NOT NULL COMMENT '引用平台项目id，不建对端项目表',
  `project_name_snapshot` varchar(255) NOT NULL COMMENT '项目纳入该日期时的完整名称快照',
  `project_short_name_snapshot` varchar(255) NULL DEFAULT NULL COMMENT '项目简称快照，可空',
  `sort_no` int unsigned NOT NULL COMMENT '稳定显示顺序，按sort_no和id排序',
  `inclusion_state` tinyint unsigned NOT NULL DEFAULT 1 COMMENT '1在当日范围内，0已移除但保留恢复关系',
  `is_unified` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '最后已保存的当日统一调度标记，只有统一调度部分能写',
  `ever_submitted_content` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '曾有已保存有效内容或调度标记的粘性保护标记，不允许客户端回退',
  `included_at` datetime(3) NOT NULL COMMENT '纳入关系时间，UTC，不作为业务保存时间',
  `removed_at` datetime(3) NULL DEFAULT NULL COMMENT '空白初始关系移除时间，UTC，恢复后置NULL',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_day_project` (`day_id`, `project_id`),
  KEY `idx_ddc_scope_rows` (`day_id`, `inclusion_state`, `sort_no`, `id`),
  KEY `idx_ddc_project_days` (`project_id`, `day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='日期与项目的保存关系';

-- table-role: detail
-- 统一调度的项目级内容：与日期项目关系及统一调度主记录必须属于同一日；不预建全量空白正文；安全/质量/摄像头结果存于ddc_check_item。
CREATE TABLE `ddc_hq_project` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `hq_record_id` bigint NOT NULL COMMENT '逻辑关联ddc_hq_record.id',
  `day_project_id` bigint NOT NULL COMMENT '逻辑关联ddc_day_project.id，唯一',
  `personnel_result_type` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '人员履职：0未填、1正常、3其他，不允许2发现问题',
  `personnel_other_text` varchar(100) NULL DEFAULT NULL COMMENT '人员履职其他说明，仅其他分支有效',
  `project_remark` varchar(100) NULL DEFAULT NULL COMMENT '项目行备注，附件独立关联；与整体备注分开',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_hq_project` (`day_project_id`),
  KEY `idx_ddc_hq_rows` (`hq_record_id`, `day_project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='统一调度的项目级内容';

-- table-role: detail
-- 值班人员或项目经理独立保存部分：无保存不预建记录；对应检查结果与问题、附件同事务写入；合法跨项目启用用户可以保存，不能按项目归属再次拒绝。
CREATE TABLE `ddc_project_check` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_project_id` bigint NOT NULL COMMENT '逻辑关联ddc_day_project.id',
  `part_kind` tinyint unsigned NOT NULL COMMENT '1项目部值班人员，2项目经理',
  `selected_user_id` bigint NULL DEFAULT NULL COMMENT '业务姓名对应系统用户id；新保存必有值，迁移历史未绑定可NULL',
  `selected_name_snapshot` varchar(255) NOT NULL COMMENT '本次检查业务姓名快照',
  `needs_user_binding` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0已关联身份，1仅迁移历史姓名待绑定；新保存必须为0',
  `version` bigint unsigned NOT NULL COMMENT '当前部分独立保存版本，首次为1；不与另一部分共用',
  `first_submitted_at` datetime(3) NOT NULL COMMENT '当前部分首次成功保存时间，UTC',
  `last_submitted_at` datetime(3) NOT NULL COMMENT '当前部分最近成功保存时间，UTC',
  `operator_user_id` bigint NULL DEFAULT NULL COMMENT '最近保存实际账号id；新保存必有值，历史实际账号无法核实时可NULL',
  `operator_name_snapshot` varchar(255) NULL DEFAULT NULL COMMENT '实际操作用户姓名快照',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_project_part` (`day_project_id`, `part_kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='值班人员或项目经理独立保存部分';

-- table-role: detail
-- 结构化检查结果：应用层校验唯一父级与check_key匹配；只存生效分支，其他正文/问题/附件不混入当前结果；HQ空结果可无行，项目部保存必须有完整有效结果。
CREATE TABLE `ddc_check_item` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `hq_project_id` bigint NULL DEFAULT NULL COMMENT '统一调度项目内容id；与project_check_id恰有一项非NULL',
  `project_check_id` bigint NULL DEFAULT NULL COMMENT '项目部独立部分id；与hq_project_id恰有一项非NULL',
  `check_key` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'HQ为SAFETY/QUALITY/CAMERA，项目部为PROJECT',
  `result_type` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '0未填、1正常、2发现问题、3其他',
  `normal_text` longtext NULL DEFAULT NULL COMMENT '正常说明；项目部必填且不擅加500字上限',
  `other_text` varchar(500) NULL DEFAULT NULL COMMENT '其他说明，有效文字必填且最多500字',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_hq_check` (`hq_project_id`, `check_key`),
  UNIQUE KEY `uk_ddc_person_check` (`project_check_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='结构化检查结果';

-- table-role: detail
-- 具体问题明细：仅发现问题分支保留1至10条；问题稳定id供附件关联，不以页面问题序号作为跨表主键。
CREATE TABLE `ddc_problem` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `check_item_id` bigint NOT NULL COMMENT '逻辑关联ddc_check_item.id',
  `sort_no` tinyint unsigned NOT NULL COMMENT '当前检查结果内的问题顺序，1至10',
  `description` varchar(500) NOT NULL COMMENT '问题有效描述，去除首尾空白后1至500字',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_problem_order` (`check_item_id`, `sort_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='具体问题明细';

-- table-role: relation
-- 检查图片引用与归属：不存base64、原图二进制或有时效的签名URL；问题图片按问题归属，统一调度及项目部每条问题必填1～9张，不额外设部分总数9张。
CREATE TABLE `ddc_attachment` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `check_item_id` bigint NULL DEFAULT NULL COMMENT '正常或其他分支的检查结果id；三个归属id恰有一个非NULL',
  `problem_id` bigint NULL DEFAULT NULL COMMENT '问题图片所属问题id；三个归属id恰有一个非NULL',
  `hq_project_id` bigint NULL DEFAULT NULL COMMENT '项目备注图片所属统一调度项目行；三个归属id恰有一个非NULL',
  `usage_kind` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'NORMAL/OTHER/PROBLEM/REMARK，必须与父级及当前分支一致',
  `file_id` bigint NOT NULL COMMENT '平台文件服务id，不另建对端文件表',
  `file_name_snapshot` varchar(255) NOT NULL COMMENT '文件名称快照',
  `mime_type` varchar(100) NOT NULL COMMENT '有效图片媒体类型，服务端核验',
  `size_bytes` bigint unsigned NOT NULL COMMENT '文件实际字节数，检查图片单张最大5MB',
  `sort_no` tinyint unsigned NOT NULL COMMENT '当前归属控件内图片顺序，1至9',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_check_image_order` (`check_item_id`, `usage_kind`, `sort_no`),
  UNIQUE KEY `uk_ddc_problem_image_order` (`problem_id`, `sort_no`),
  UNIQUE KEY `uk_ddc_remark_image_order` (`hq_project_id`, `sort_no`),
  KEY `idx_ddc_file_refs` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='检查图片引用与归属';

-- table-role: snapshot
-- 首次调度默认值快照明细：和day.defaults_initialized_at一起原子完成；空明细也必须有完成标记，取消重进不再次取数；不作为已保存检查结果。
CREATE TABLE `ddc_default_project` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_id` bigint NOT NULL COMMENT '逻辑关联ddc_day.id',
  `day_project_id` bigint NOT NULL COMMENT '逻辑关联ddc_day_project.id，必须同日',
  `dispatch_tag_snapshot` tinyint unsigned NOT NULL COMMENT '初始化读取的调度标签，0关1开',
  `hidden_snapshot` tinyint unsigned NOT NULL COMMENT '初始化取数时隐藏配置快照，0未隐藏1隐藏',
  `default_selected` tinyint unsigned NOT NULL COMMENT '按PRD首次规则得到的默认调度选择，0或1',
  `snapshot_at` datetime(3) NOT NULL COMMENT '本次默认快照时间，UTC',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_default_project` (`day_id`, `day_project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='首次调度默认值快照明细';

-- table-role: technical
-- 可续租的编辑占用：统一调度与两种项目部分资源粒度不同；有效期/续期间隔由研发评审，不能把原型120秒/30秒写成产品固定值。
CREATE TABLE `ddc_edit_lock` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_id` bigint NOT NULL COMMENT '逻辑关联ddc_day.id',
  `day_project_id` bigint NULL DEFAULT NULL COMMENT '项目部分引用日期项目关系；统一调度为NULL',
  `part_kind` tinyint unsigned NOT NULL COMMENT '0统一调度、1值班人员、2项目经理',
  `resource_key` varchar(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '唯一服务端资源键：HQ:日id或DUTY/MANAGER:日期项目id',
  `holder_user_id` bigint NULL DEFAULT NULL COMMENT '当前占用账号id，空闲为NULL',
  `holder_name_snapshot` varchar(255) NULL DEFAULT NULL COMMENT '占用账号姓名快照',
  `token_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NULL DEFAULT NULL COMMENT '不可猜测占用令牌的摘要；空闲为NULL',
  `lease_version` bigint unsigned NOT NULL DEFAULT 0 COMMENT '每次重新占用递增；释放保留资源行，旧令牌不得释放新锁',
  `expires_at` datetime(3) NULL DEFAULT NULL COMMENT '服务端UTC到期时间；空闲为NULL',
  `last_renewed_at` datetime(3) NULL DEFAULT NULL COMMENT '最近有效续期时间，UTC',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_lock_resource` (`resource_key`),
  KEY `idx_ddc_day_active_locks` (`day_id`, `expires_at`),
  KEY `idx_ddc_lock_holder` (`holder_user_id`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='可续租的编辑占用';

-- table-role: audit
-- 独立部分保存审计与请求去重：和业务正文在同一事务写入；只读、初始化、抽屉应用及补行不是业务保存；重复请求校验同一账号/资源/摘要后返回原保存回执，不再次加版本。
CREATE TABLE `ddc_change_log` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `day_id` bigint NOT NULL COMMENT '逻辑关联ddc_day.id',
  `day_project_id` bigint NULL DEFAULT NULL COMMENT '项目部分对应日期项目关系；统一调度为NULL',
  `part_kind` tinyint unsigned NOT NULL COMMENT '0统一调度、1值班人员、2项目经理',
  `request_id` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '服务端校验的保存幂等请求id，全局唯一',
  `payload_hash` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '所属部分规范化有效载荷摘要，用于识别相同请求id不同内容',
  `before_version` bigint unsigned NOT NULL COMMENT '变更前所属部分版本，首次为0',
  `after_version` bigint unsigned NOT NULL COMMENT '成功保存后的所属部分版本',
  `operator_user_id` bigint NOT NULL COMMENT '实际保存账号id',
  `operator_name_snapshot` varchar(255) NULL DEFAULT NULL COMMENT '实际账号姓名快照',
  `changed_at` datetime(3) NOT NULL COMMENT '成功保存时间，UTC',
  `before_snapshot` json NULL DEFAULT NULL COMMENT '所属部分变更前快照，仅内容及文件引用；首次可NULL',
  `after_snapshot` json NOT NULL COMMENT '所属部分变更后快照，仅内容及文件引用，不含图片二进制',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_submit_request` (`request_id`),
  KEY `idx_ddc_day_changes` (`day_id`, `changed_at`, `id`),
  KEY `idx_ddc_part_changes` (`day_project_id`, `part_kind`, `after_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='独立部分保存审计与请求去重';

-- table-role: technical
-- 历史导入备份与映射凭据：先备份后转换，不按历史文字推断检查结论；只迁移已确认映射，不按当前隐藏配置重建历史；来源文件与平台文件表保持逻辑引用。
CREATE TABLE `ddc_migration_backup` (
  `id` bigint NOT NULL COMMENT '主键id，沿用平台应用侧主键生成，不使用数据库自增',
  `batch_no` varchar(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '技术导入批次号，不是页面业务编号',
  `source_system` varchar(64) NOT NULL COMMENT '历史来源标识，含原型导出或旧系统',
  `source_record_key` varchar(128) NOT NULL COMMENT '原来源记录定位键',
  `hq_org_id` bigint NOT NULL COMMENT '归属指挥部组织id，防止跨作用域映射',
  `check_date` date NULL DEFAULT NULL COMMENT '可识别时记录原业务检查日期',
  `source_payload_file_id` bigint NOT NULL COMMENT '文件服务中原始导出包引用，避免把大段base64塞入MySQL',
  `content_sha256` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '原始备份内容校验摘要',
  `mapped_day_id` bigint NULL DEFAULT NULL COMMENT '成功映射到ddc_day.id后填写',
  `mapping_state` varchar(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'PENDING/MAPPED/REVIEW，需人工处理不能冒充已迁移',
  `mapping_note` varchar(1000) NULL DEFAULT NULL COMMENT '结构/用户/附件未映射原因及核对记录',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录创建时间，UTC',
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '技术更新时间，UTC；不作为业务最近保存时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ddc_migration_source` (`batch_no`, `source_record_key`),
  KEY `idx_ddc_migration_day` (`mapped_day_id`),
  KEY `idx_ddc_migration_review` (`hq_org_id`, `mapping_state`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='历史导入备份与映射凭据';
