<script setup>
import '../styles/todoHandleBlocks.css'

defineProps({
  todo: { type: Object, required: true },
})
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">实模一致验收信息</div>
      <el-tag size="small" type="warning" effect="light">
        {{
          todo.detail?.currentNode ||
          (todo.asbuiltNode === 'pm' ? '待项目经理终审' : '待监理审')
        }}
      </el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="验收单号">
        {{ todo.detail?.bizNo || todo.asbuiltAcceptanceId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="任务名称" :span="2">
        {{ todo.detail?.title || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="所选节点" :span="2">
        {{ todo.detail?.nodePaths || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="对比地址" :span="2">
        <a
          v-if="todo.detail?.compareUrl && todo.detail.compareUrl !== '—'"
          :href="todo.detail.compareUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ todo.detail.compareUrl }}
        </a>
        <span v-else>—</span>
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ todo.applicant || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="提交时间">
        {{ todo.applyTime || '—' }}
      </el-descriptions-item>
    </el-descriptions>
  </section>
</template>
