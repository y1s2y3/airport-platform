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
      <el-descriptions-item label="使用部位">
        {{ todo.detail?.usePart || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.unitName"
        label="单位工程"
      >
        {{ todo.detail.unitName }}
      </el-descriptions-item>
      <el-descriptions-item label="项目">
        {{ todo.detail?.project || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="申请人">
        {{ todo.applicant || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-if="todo.sampleBizType === 'material'" label="材料类型">
        {{ todo.detail?.materialType || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.sampleDate"
        label="送样日期"
      >
        {{ todo.detail.sampleDate }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.brandName"
        label="品牌"
      >
        {{ todo.detail.brandName }}
      </el-descriptions-item>
      <el-descriptions-item v-if="todo.sampleBizType === 'material'" label="生产厂家">
        {{ todo.detail?.manufacturer || todo.detail?.supplier || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material'"
        label="规格（或技术参数）"
        :span="2"
      >
        {{ todo.detail?.spec || todo.detail?.indicatorDesc || todo.detail?.briefing || '—' }}
      </el-descriptions-item>
      <el-descriptions-item v-else label="关键工序样板说明" :span="2">
        {{ todo.detail?.briefing || '—' }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.effectImages?.length"
        label="样品照片"
        :span="2"
      >
        {{ todo.detail.effectImages.map((f) => f.name || f).join('、') }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.approvalFiles?.length"
        label="材料设备送样定板报审签字附件"
        :span="2"
      >
        {{ todo.detail.approvalFiles.map((f) => f.name || f).join('、') }}
      </el-descriptions-item>
      <el-descriptions-item
        v-if="todo.sampleBizType === 'material' && todo.detail?.certificateFiles?.length"
        label="样品出厂质量证明文件"
        :span="2"
      >
        {{ todo.detail.certificateFiles.map((f) => f.name || f).join('、') }}
      </el-descriptions-item>
    </el-descriptions>
  </section>
</template>
