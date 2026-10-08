<script setup>
/**
 * 质量验评整改单详情（已下线）
 * 旧路由已 redirect 至深填报；本页仅作兜底空态，避免直链/缓存入口白屏。
 */
import { useRouter } from 'vue-router'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  rectifyId: { type: String, default: '' },
  todoId: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])
const router = useRouter()

function handleBack() {
  if (props.embedded) {
    emit('back')
    return
  }
  router.push('/qm/inspect/form-fill-deep')
}
</script>

<template>
  <div class="pg">
    <div v-if="!embedded" class="hd">
      <el-button text @click="handleBack">‹ 返回</el-button>
      <h3 class="pt">整改单详情</h3>
    </div>
    <el-empty description="质量验评整改单已下线">
      <template #description>
        <p class="title">质量验评整改单已下线</p>
        <p class="desc">
          独立整改 / 复验单据已废止。请前往质量验评深填报办理；已驳回请重新申报。
        </p>
      </template>
      <el-button type="primary" @click="handleBack">{{ embedded ? '返回' : '前往验评填报' }}</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.pg { padding: 0 0 24px; }
.hd { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.pt { margin: 0; font-size: 18px; font-weight: 600; color: #1f2329; }
.title { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1f2329; }
.desc { margin: 0; font-size: 13px; line-height: 1.6; color: #646a73; max-width: 420px; }
</style>
