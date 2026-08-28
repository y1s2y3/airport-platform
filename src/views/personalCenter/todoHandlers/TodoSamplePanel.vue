<script setup>
import '../styles/todoHandleBlocks.css'

defineProps({
  todo: { type: Object, required: true },
})
</script>

<template>
  <section class="block block--panel">
    <div class="block-head">
      <div class="block-title">样板报审信息</div>
      <el-tag size="small" type="warning" effect="light">
        {{ todo.detail?.currentNode || (todo.sampleNode === 'pm' ? '待项目经理审' : '待监理审') }}
      </el-tag>
    </div>
    <el-descriptions :column="2" border size="small" class="desc-panel">
      <el-descriptions-item label="报审编号">
        {{ todo.detail?.applicationId || todo.sampleApplicationId || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="类型">
        {{ todo.detail?.bizType || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="名称">
        {{ todo.detail?.title || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="施工部位">
        {{ todo.detail?.usePart || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ todo.applicant || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-if="todo.sampleBizType === 'material'" label="供应商">
        {{ todo.detail?.supplier || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material'"
        label="材料指标说明"
        :span="2"
      >
        {{ todo.detail?.indicatorDesc || todo.detail?.briefing || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-else label="关键工序样板说明" :span="2">
        {{ todo.detail?.briefing || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.effectImages?.length"
        label="效果图"
        :span="2"
      >
        {{ todo.detail.effectImages.map((f) => f.name || f).join('、') }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.approvalFiles?.length"
        label="审批文件"
        :span="2"
      >
        {{ todo.detail.approvalFiles.map((f) => f.name || f).join('、') }}
      </el-descriptions-item>
    </el-descriptions>
  </section>
</template>
