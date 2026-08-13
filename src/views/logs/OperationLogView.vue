<script setup>
import { ref, computed } from 'vue'
import { operationLogList } from '../../mock/systemLogs'

const currentPage = ref(1)
const pageSize = ref(10)
const detailVisible = ref(false)
const detailRow = ref(null)

const filteredList = computed(() => operationLogList)

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function openDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="operation-log-page page-card">
    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无操作日志">
      <el-table-column prop="operator" label="操作用户" min-width="110" />
      <el-table-column prop="loginAccount" label="登录账号" min-width="120" />
      <el-table-column prop="operateTime" label="操作时间" min-width="170" />
      <el-table-column prop="module" label="模块名称" min-width="120" />
      <el-table-column prop="type" label="操作类型" min-width="140" show-overflow-tooltip />
      <el-table-column prop="terminalType" label="终端类型" width="100" align="center" />
      <el-table-column label="来源IP" min-width="150">
        <template #default="{ row }">[{{ row.ip }}]</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
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

    <el-dialog v-model="detailVisible" title="日志详情" width="720px" destroy-on-close>
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item label="操作用户">{{ detailRow.operator }}</el-descriptions-item>
        <el-descriptions-item label="登录账号">{{ detailRow.loginAccount }}</el-descriptions-item>
        <el-descriptions-item label="所属组织">{{ detailRow.orgName }}</el-descriptions-item>
        <el-descriptions-item label="操作时间">{{ detailRow.operateTime }}</el-descriptions-item>
        <el-descriptions-item label="模块名称">{{ detailRow.module }}</el-descriptions-item>
        <el-descriptions-item label="操作类型">{{ detailRow.type }}</el-descriptions-item>
        <el-descriptions-item label="终端类型">{{ detailRow.terminalType }}</el-descriptions-item>
        <el-descriptions-item label="来源IP">[{{ detailRow.ip }}]</el-descriptions-item>
        <el-descriptions-item label="操作内容" :span="2">
          {{ detailRow.content }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.operation-log-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
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
