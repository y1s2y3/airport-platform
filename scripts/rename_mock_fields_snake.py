# -*- coding: utf-8 -*-
"""将车辆/人员 Mock 与相关 Vue 字段键统一为 PRD snake_case。"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"C:\Users\13065\Desktop\机场平台2期\Airport_Expansion_Project_Informatization\src")

# 长键优先。仅业务数据字段；不改 rule_key、路由 key、部分导出常量名可另处理。
RENAMES: list[tuple[str, str]] = [
    # vehicle + shared
    ("todayInCount", "today_in_count"),
    ("todayOutCount", "today_out_count"),
    ("onSiteCount", "on_site_count"),
    ("projectName", "project_name"),
    ("projectId", "project_id"),
    ("projectCode", "project_code"),
    ("systemName", "system_name"),
    ("updatedAt", "updated_at"),
    ("plateNo", "plate_no"),
    ("vehicleType", "vehicle_type"),
    ("gateName", "gate_name"),
    ("recordTime", "record_time"),
    ("externalId", "external_id"),
    ("warningNo", "warning_no"),
    ("triggeredAt", "triggered_at"),
    ("closedAt", "closed_at"),
    ("createdAt", "created_at"),
    ("createdBy", "created_by"),
    # dashboard short names used in vehicle mock (align to PRD)
    ("todayIn", "today_in_count"),
    ("todayOut", "today_out_count"),
    # labor
    ("todayManagerAttendanceRate", "today_manager_attendance_rate"),
    ("todaySpecialAttendanceRate", "today_special_attendance_rate"),
    ("todayManageAttendanceRate", "today_manage_attendance_rate"),
    ("todayLaborAttendanceRate", "today_labor_attendance_rate"),
    ("totalRegisteredInclExited", "total_registered_incl_exited"),
    ("cumulativeWarningCount", "cumulative_warning_count"),
    ("specialRegisteredCount", "special_registered_count"),
    ("unhandledWarningCount", "unhandled_warning_count"),
    ("specialCertAttachment", "special_cert_attachment"),
    ("pendingWarningCount", "pending_warning_count"),
    ("todayAttendanceRate", "today_attendance_rate"),
    ("level3EducationDone", "level3_education_done"),
    ("managePresentCount", "manage_present_count"),
    ("laborPresentCount", "labor_present_count"),
    ("personnelCategory", "personnel_category"),
    ("newWarningCount", "new_warning_count"),
    ("pendingManual", "pending_manual"),
    ("registeredTotal", "registered_total"),
    ("registeredCount", "registered_count"),
    ("todayWarningCount", "today_warning_count"),
    ("attendanceRate", "attendance_rate"),
    ("defaultRecipientId", "default_recipient_id"),
    ("personnelNo", "personnel_no"),
    ("personnelId", "personnel_id"),
    ("entryStatus", "entry_status"),
    ("onSiteStatus", "on_site_status"),
    ("exitedCount", "exited_count"),
    ("enteredCount", "entered_count"),
    ("offSiteCount", "off_site_count"),
    ("clockInCount", "clock_in_count"),
    ("clockOutCount", "clock_out_count"),
    ("recordCount", "record_count"),
    ("handleMode", "handle_mode"),
    ("currentLevel", "current_level"),
    ("triggerReason", "trigger_reason"),
    ("ruleLabel", "rule_label"),
    ("educationType", "education_type"),
    ("trainDate", "train_date"),
    ("certValidTo", "cert_valid_to"),
    ("certNo", "cert_no"),
    ("isSpecial", "is_special"),
    ("isTeamLeader", "is_team_leader"),
    ("unitName", "unit_name"),
    ("unitType", "unit_type"),
    ("creditCode", "credit_code"),
    ("workType", "work_type"),
    ("workHours", "work_hours"),
    ("idNumberRaw", "id_number_raw"),
    ("idNumber", "id_number"),
    ("idCardRaw", "id_card_raw"),
    ("idCard", "id_card"),
    ("idType", "id_type"),
    ("idValidFrom", "id_valid_from"),
    ("idValidTo", "id_valid_to"),
    ("nativePlace", "native_place"),
    ("politicalStatus", "political_status"),
    ("healthStatus", "health_status"),
    ("medicalHistory", "medical_history"),
    ("managerCount", "manager_count"),
    ("manageCount", "manage_count"),
    ("laborCount", "labor_count"),
    ("specialCount", "special_count"),
    ("onDutyCount", "on_duty_count"),
    ("ageBand", "age_band"),
    ("statDate", "stat_date"),
    ("reportDays", "report_days"),
    ("recipientId", "recipient_id"),
    ("positionId", "position_id"),
    ("gateIn", "gate_in"),
    ("gateOut", "gate_out"),
    ("clockIn", "clock_in"),
    ("clockOut", "clock_out"),
    # vehicle dashboard short key last (avoid eating onSiteStatus)
    ("onSite", "on_site_count"),
]

# 保护：规则编码、状态机英文值、路由/菜单 key 等
PROTECT = [
    "noLevel3Education",
    "specialCertMissing",
    "workOver12h",
    "ageLimit",
    "elderlyReminder",
    "idCardExpired",
    "absentDays",
    "managerAttendance",
    "blacklistEntry",
    "selectedProjectId",  # composable 状态，非 PRD 实体字段
    "scopeProjectId",
    "dashboardScopeId",
    "HQ_PROJECT_OPTION",
    "vehicle-dashboard",
    "app-vehicle-dashboard",
]

GLOBS = [
    "mock/vehicleManagement.js",
    "mock/laborRealName.js",
    "mock/laborManagement.js",
    "mock/laborWarningList.js",
    "mock/laborWarningConfig.js",
    "mock/laborAttendanceDetail.js",
    "mock/laborAttendanceStats.js",
    "mock/laborPersonnelTrack.js",
    "mock/laborBlacklist.js",
    "views/vehicle/**/*.vue",
    "views/safety/**/*.vue",
    "views/track/**/*.vue",
    "composables/useLabor*.js",
    "composables/useInspection*.js",
]


def should_process(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    for g in GLOBS:
        if g.endswith("**/*.vue") or g.endswith("**/*.js"):
            prefix = g.split("**")[0]
            if rel.startswith(prefix) and path.suffix in {".vue", ".js"}:
                return True
        elif rel == g:
            return True
    # extra labor views paths
    if "/Labor" in path.name or "RealName" in path.name or "labor" in path.name.lower():
        if path.suffix in {".vue", ".js"} and "views" in path.parts:
            return True
    return False


def replace_identifiers(text: str) -> tuple[str, int]:
    # mask protected tokens
    masks = {}
    out = text
    for i, token in enumerate(PROTECT):
        placeholder = f"__PROTECT_{i}__"
        if token in out:
            masks[placeholder] = token
            out = out.replace(token, placeholder)
    count = 0
    for old, new in RENAMES:
        # word-ish boundary: not preceded/followed by identifier char
        pattern = re.compile(rf"(?<![A-Za-z0-9_]){re.escape(old)}(?![A-Za-z0-9_])")
        out, n = pattern.subn(new, out)
        count += n
    for placeholder, token in masks.items():
        out = out.replace(placeholder, token)
    return out, count


def main():
    files = [p for p in ROOT.rglob("*") if p.is_file() and p.suffix in {".js", ".vue"}]
    total_files = 0
    total_hits = 0
    changed = []
    for path in files:
        try:
            if not should_process(path):
                # also process any safety labor views by path contains
                rel = path.as_posix()
                if not (
                    "/mock/labor" in rel
                    or "/mock/vehicle" in rel
                    or "/views/vehicle/" in rel
                    or "/views/safety/" in rel
                    or "/views/track/" in rel
                ):
                    continue
        except Exception:
            continue
        raw = path.read_text(encoding="utf-8")
        new, n = replace_identifiers(raw)
        if n and new != raw:
            path.write_text(new, encoding="utf-8")
            total_files += 1
            total_hits += n
            changed.append((path.relative_to(ROOT).as_posix(), n))
    print(f"files={total_files} hits={total_hits}")
    for p, n in sorted(changed, key=lambda x: -x[1])[:40]:
        print(f"  {n:4d}  {p}")


if __name__ == "__main__":
    main()
