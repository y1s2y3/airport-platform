<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Download, Plus, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import {
  projectTree,
  getProjectPersonnel,
  getRealNameStats,
  workTypeOptions,
  entryStatusOptions,
  entryStatusTagClass,
  isSafetyEducationComplete,
  maskPhone,
  logPhoneView,
} from '../../mock/laborRealName'
import { canCreatePersonnel, isSiteIntegrationEnabled } from '../../mock/laborWarningConfig'
import { REALNAME_ENTRY_LABEL } from '../../constants/laborPersonStatus'
import {
  parsePersonnelImportFile,
  validatePersonnelImportRows,
  importPersonnelRows,
  downloadPersonnelImportTemplate,
  PERSONNEL_IMPORT_HEADERS,
} from '../../utils/laborPersonnelImport'

const router = useRouter()
const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const filters = ref({ workType: '', entryStatus: '', unitName: '' })
const visiblePhoneIds = ref(new Set())
const importVisible = ref(false)
const importPreview = ref([])
const importValidRows = ref([])
const importErrors = ref([])
const importParsing = ref(false)

const allPersonnel = computed(() => getProjectPersonnel(scopeProjectId.value))

const treeData = computed(() =>
  projectTree.map((group) => ({
    id: group.id,
    label: group.label,
    children: group.children?.map((item) => ({
      id: item.id,
      label: `${item.label.replace(/\(\d+\)$/, '')}(${item.count})`,
    })),
  })),
)

const filteredPersonnel = computed(() => {
  const kw = keyword.value.trim()
  return allPersonnel.value.filter((row) => {
    if (kw) {
      const hay = `${row.basic.personnelNo}${row.basic.name}${row.basic.phone}${row.basic.idNumber}${row.unit.team}${row.unit.unitName}`
      if (!hay.includes(kw)) return false
    }
    if (filters.value.workType && row.unit.workType !== filters.value.workType) return false
    if (filters.value.entryStatus && row.entryStatus !== filters.value.entryStatus) return false
    if (filters.value.unitName && !row.unit.unitName.includes(filters.value.unitName.trim())) {
      return false
    }
    return true
  })
})

const stats = computed(() => getRealNameStats(scopeProjectId.value))
const allowCreate = computed(() => canCreatePersonnel(scopeProjectId.value))
const allowImport = computed(() => allowCreate.value)
const siteIntegrated = computed(() => isSiteIntegrationEnabled(scopeProjectId.value))

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', unitName: '' }
  visiblePhoneIds.value = new Set()
})

function handleReset() {
  keyword.value = ''
  filters.value = { workType: '', entryStatus: '', unitName: '' }
}

function goDetail(row) {
  router.push({ name: 'RealNamePersonnelDetail', params: { id: row.id } })
}

function goCreate() {
  const query = isHqSelected.value ? { projectId: scopeProjectId.value } : undefined
  router.push({ name: 'RealNamePersonnelCreate', query })
}

function goEdit(row) {
  router.push({ name: 'RealNamePersonnelEdit', params: { id: row.id } })
}

function viewPhone(row) {
  visiblePhoneIds.value = new Set([...visiblePhoneIds.value, row.id])
  logPhoneView({
    personnelId: row.id,
    personnelNo: row.basic.personnelNo,
    name: row.basic.name,
    scene: '列表',
  })
}

function isPhoneVisible(id) {
  return visiblePhoneIds.value.has(id)
}

function resetImportState() {
  importPreview.value = []
  importValidRows.value = []
  importErrors.value = []
}

function openImport() {
  if (isHqSelected.value && !treeProjectId.value) {
    ElMessage.warning('请先在左侧选择项目')
    return
  }
  if (!allowImport.value) {
    ElMessage.warning('已对接现场实名制，不支持导入人员')
    return
  }
  resetImportState()
  importVisible.value = true
}

async function onImportFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return
  importParsing.value = true
  resetImportState()
  try {
    const { rows } = await parsePersonnelImportFile(file)
    const result = validatePersonnelImportRows(scopeProjectId.value, rows, allPersonnel.value)
    importPreview.value = result.preview
    importValidRows.value = result.validRows
    importErrors.value = result.errors
    if (result.validRows.length) {
      ElMessage.success(`已解析 ${result.validRows.length} 条可导入数据`)
    }
    if (result.errors.length) {
      ElMessage.warning(`有 ${result.errors.length} 条校验提示，请查看下方说明`)
    }
  } catch (err) {
    ElMessage.error(err.message || '解析失败')
  } finally {
    importParsing.value = false
  }
}

function confirmImport() {
  if (!importValidRows.value.length) {
    ElMessage.warning('没有可导入的数据')
    return
  }
  const count = importValidRows.value.length
  importPersonnelRows(scopeProjectId.value, importValidRows.value, scopeProjectLabel.value)
  importVisible.value = false
  resetImportState()
  if (importErrors.value.length) {
    ElMessage.success(`已成功导入 ${count} 人，${importErrors.value.length} 条未通过校验已跳过`)
  } else {
    ElMessage.success(`已成功导入 ${count} 人`)
  }
}
</script>

<template>
  <div class="realname-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 人员实名制</div>
      <div class="page-heading">
        <h1 class="page-title">人员实名制</h1>
        <div class="page-actions">
          <el-button v-if="allowCreate" type="primary" class="ap-btn-primary" :icon="Plus" @click="goCreate">新增</el-button>
          <el-button v-if="allowImport" :icon="Upload" @click="openImport">导入</el-button>
          <el-button :icon="Download">导出</el-button>
        </div>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">
        <template v-if="siteIntegrated">
          已对接现场实名制，人员数据由现场系统同步，不支持新增；同步字段不可编辑，可在详情/编辑页补充安全教育等信息。
        </template>
        <template v-else>
          未对接现场实名制，支持新增、Excel 导入及全字段编辑。
        </template>
        入退场：入职登记「已入场」、离职办理「已退场」。
      </p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="treeProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

    <div class="personnel-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ scopeProjectLabel }}</div>
        <div class="panel-head">
          <div class="panel-stats">
            <span>登记 {{ stats.total }} 人</span>
            <span>已入场 {{ stats.entered }}</span>
            <span>已退场 {{ stats.exited }}</span>
            <span>在场 {{ stats.onSite }}</span>
            <span>特种作业 {{ stats.special }}</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input
            v-model="keyword"
            placeholder="编号 / 姓名 / 手机 / 证件号 / 班组 / 参建单位"
            clearable
            :prefix-icon="Search"
            class="search-input"
          />
          <el-select v-model="filters.workType" placeholder="工种/职务" clearable style="width: 110px">
            <el-option v-for="opt in workTypeOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-select v-model="filters.entryStatus" :placeholder="REALNAME_ENTRY_LABEL" clearable style="width: 100px">
            <el-option v-for="opt in entryStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-input v-model="filters.unitName" placeholder="参建单位" clearable style="width: 160px" />
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredPersonnel" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="basic.personnelNo" label="人员编号" width="130" show-overflow-tooltip />
          <el-table-column label="照片" width="70" align="center">
            <template #default="{ row }">
              <el-avatar :size="36" class="list-avatar">{{ row.basic.name.slice(0, 1) }}</el-avatar>
            </template>
          </el-table-column>
          <el-table-column prop="basic.name" label="姓名" width="90" />
          <el-table-column label="手机号码" width="170">
            <template #default="{ row }">
              <div class="phone-cell">
                <span>{{ isPhoneVisible(row.id) ? row.basic.phone : maskPhone(row.basic.phone) }}</span>
                <el-button
                  v-if="!isPhoneVisible(row.id)"
                  link
                  type="primary"
                  size="small"
                  @click="viewPhone(row)"
                >
                  查看
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="unit.workType" label="工种/职务" width="100" />
          <el-table-column prop="unit.unitName" label="参建单位名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="unit.team" label="所属班组" min-width="110" show-overflow-tooltip />
          <el-table-column :label="REALNAME_ENTRY_LABEL" width="90" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="entryStatusTagClass(row.entryStatus)">{{ row.entryStatus }}</span>
            </template>
          </el-table-column>
          <el-table-column label="安全教育" width="90" align="center">
            <template #default="{ row }">
              <span
                class="ap-status-tag"
                :class="isSafetyEducationComplete(row.safetyEducation) ? 'ap-tag-enabled' : 'ap-tag-high'"
              >
                {{ isSafetyEducationComplete(row.safetyEducation) ? '已完成' : '未完成' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
              <el-button link type="primary" size="small" @click="goEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
    </div>
    </div>

    <el-dialog v-model="importVisible" title="导入人员实名制" width="860px" destroy-on-close @closed="resetImportState">
      <div class="import-tip">
        仅未对接现场实名制的项目支持导入。必填列：{{ PERSONNEL_IMPORT_HEADERS.slice(0, 3).join('、') }}。
        <el-button link type="primary" @click="downloadPersonnelImportTemplate">下载导入模板</el-button>
      </div>
      <div v-if="isHqSelected" class="import-scope">导入目标项目：{{ scopeProjectLabel || '未选择' }}</div>
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.xls"
        :disabled="importParsing || (isHqSelected && !treeProjectId)"
        :on-change="onImportFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">将 Excel 拖到此处，或<em>点击上传</em></div>
      </el-upload>

      <div v-if="importErrors.length" class="import-errors">
        <div class="preview-head">校验提示</div>
        <ul>
          <li v-for="(msg, idx) in importErrors.slice(0, 8)" :key="idx">{{ msg }}</li>
        </ul>
        <p v-if="importErrors.length > 8" class="preview-more">… 另有 {{ importErrors.length - 8 }} 条</p>
      </div>

      <div v-if="importPreview.length" class="import-preview">
        <div class="preview-head">预览（{{ importPreview.length }} 条可导入）</div>
        <el-table :data="importPreview.slice(0, 8)" size="small" border max-height="260">
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="phone" label="手机号码" width="120" />
          <el-table-column prop="idNumber" label="证件号码" min-width="170" />
          <el-table-column prop="workType" label="工种/职务" width="90" />
          <el-table-column prop="unitName" label="参建单位" min-width="140" show-overflow-tooltip />
          <el-table-column prop="entryStatus" label="入退场" width="80" align="center" />
        </el-table>
        <p v-if="importPreview.length > 8" class="preview-more">… 另有 {{ importPreview.length - 8 }} 条</p>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button
          type="primary"
          class="ap-btn-primary"
          :disabled="!importValidRows.length"
          @click="confirmImport"
        >
          确认导入 {{ importValidRows.length ? `(${importValidRows.length} 人)` : '' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.realname-page {
  padding: 20px 24px 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-scope {
  margin: 4px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.page-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}

.project-tree-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}

.project-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 300px;
}

.list-avatar {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-size: 14px;
}

.phone-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.import-tip {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
  line-height: 1.6;
}

.import-scope {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
}

.import-preview,
.import-errors {
  margin-top: 16px;
}

.preview-head {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ap-text);
}

.import-errors ul {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: var(--ap-danger);
  line-height: 1.7;
}

.preview-more {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted);
}
</style>
