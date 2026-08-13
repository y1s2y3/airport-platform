<script setup>
import { ref, computed } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { loginLogList, loginOrgOptions, loginTerminalOptions } from '../../mock/systemLogs'

const orgFilter = ref('')
const dateRange = ref([])
const keyword = ref('')
const terminalFilter = ref('')
const expanded = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

const orgSelectOptions = loginOrgOptions.filter((item) => item.value !== '')
const terminalSelectOptions = loginTerminalOptions.filter((item) => item.value)

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return loginLogList.filter((row) => {
    if (orgFilter.value && row.orgName !== orgFilter.value) return false
    if (terminalFilter.value && row.terminalType !== terminalFilter.value) return false
    if (dateRange.value?.length === 2) {
      const day = row.loginTime.slice(0, 10)
      if (day < dateRange.value[0] || day > dateRange.value[1]) return false
    }
    if (!kw) return true
    return (
      row.name.toLowerCase().includes(kw) ||
      row.loginAccount.toLowerCase().includes(kw) ||
      row.phone.includes(kw)
    )
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  orgFilter.value = ''
  dateRange.value = []
  keyword.value = ''
  terminalFilter.value = ''
  currentPage.value = 1
}

function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div class="login-log-page page-card">
    <div class="filter-panel">
      <div class="filter-row">
        <span class="field-label">所属组织</span>
        <el-select v-model="orgFilter" placeholder="请选择" clearable class="filter-select">
          <el-option
            v-for="opt in orgSelectOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <span class="field-label">登录时间</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD"
          class="filter-date"
        />

        <span class="field-label">用户信息</span>
        <el-input
          v-model="keyword"
          class="filter-input"
          placeholder="姓名、账号、手机号"
          clearable
          @keyup.enter="handleSearch"
        />

        <div class="filter-actions">
          <el-button text class="expand-btn" @click="toggleExpand">
            {{ expanded ? '收起' : '展开' }}
            <el-icon><component :is="expanded ? ArrowUp : ArrowDown" /></el-icon>
          </el-button>
          <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>

      <div v-if="expanded" class="filter-row expanded-row">
        <span class="field-label">终端类型</span>
        <el-select v-model="terminalFilter" placeholder="请选择" clearable class="filter-select">
          <el-option
            v-for="opt in terminalSelectOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
    </div>

    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无登录日志">
      <el-table-column prop="name" label="用户姓名" min-width="110" />
      <el-table-column prop="phone" label="手机号" min-width="130" />
      <el-table-column prop="loginAccount" label="登录账号" min-width="120" />
      <el-table-column prop="orgName" label="所属组织" min-width="120" show-overflow-tooltip />
      <el-table-column prop="terminalType" label="终端类型" width="100" align="center" />
      <el-table-column label="登录IP" min-width="150">
        <template #default="{ row }">[{{ row.ip }}]</template>
      </el-table-column>
      <el-table-column prop="loginTime" label="登录时间" min-width="170" />
    </el-table>

    <div class="table-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.login-log-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.filter-panel {
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.expanded-row {
  margin-top: 10px;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-select {
  width: 180px;
}

.filter-date {
  width: 280px;
}

.filter-input {
  width: 220px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.expand-btn {
  color: var(--ap-primary);
}

.table-head {
  margin-bottom: 10px;
}

.total-text {
  font-size: 14px;
  color: var(--ap-text-secondary);
}

.ap-table {
  flex: 1;
}

.table-footer {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
