<script setup>
import { SAMPLE_DEMO_ROLE_OPTIONS, sampleDemoRole, setSampleDemoRole } from '../../../utils/sampleDemoRole.js'
import { useQmProjectScope } from '../../../composables/useCurrentProject'

const { isHqSelected } = useQmProjectScope()

function onChange(val) {
  setSampleDemoRole(val)
}
</script>

<template>
  <!-- 指挥部为跨项目只读视角，不参与样板审批办理，无需展示 Demo 角色切换 -->
  <el-alert
    v-if="!isHqSelected"
    type="info"
    :closable="false"
    show-icon
    class="sample-role-bar"
  >
    <template #title>
      <span class="role-bar-inner">
        <span>样板 Demo 角色（影响审批菜单与办理权限）：</span>
        <el-radio-group :model-value="sampleDemoRole" size="small" @update:model-value="onChange">
          <el-radio-button
            v-for="opt in SAMPLE_DEMO_ROLE_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
      </span>
    </template>
  </el-alert>
</template>

<style scoped>
.sample-role-bar {
  margin-bottom: 4px;
}
.role-bar-inner {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
</style>
