<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Expand, Odometer, Position, Scissor } from '@element-plus/icons-vue'
import CocHqHeader from '../coc/components/hq/CocHqHeader.vue'
import HqEdgeLights from '../coc/components/hq/HqEdgeLights.vue'
import HqNavTab from '../coc/components/hq/HqNavTab.vue'
import SsStage from './components/SsStage.vue'
import SsSideColumn from './components/SsSideColumn.vue'
import SsCollapseRail from './components/SsCollapseRail.vue'
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  HQ_SELECTION_ID,
  buildProjects,
} from '../coc/mock/data.js'
import { SCREEN_DATA, SCREEN_TABS } from './mock/screenStyleData.js'
import '../coc/styles/theme.css'
import '../coc/styles/hq-dark-theme.css'
import './styles/screen-style.css'

/**
 * 「大屏样式」样板屏
 *
 * 视觉体系直接复用 COC 调度大屏：CocHqHeader（顶部标题栏）+ HqEdgeLights（屏边缘光效）+
 * CocPanelHeading / .panel-card（数据面板卡）+ HqNavTab（切页），中间底图用项目航拍图（深色化）。
 * 布局按参考图：中间模型底图 + 左右数据栏 + 底部居中切页 + 两侧数据栏可收起。
 */
const projects = ref(buildProjects())
const selectedProjectId = ref(HQ_SELECTION_ID)
const statusFilters = ref(['在建'])

const activeTab = ref('safety')
/** 一键收起：两侧数据栏 + 切页 + 研判条一起收起，底部换成模型工具条 */
const collapsed = ref(false)
const activeTool = ref('')
const scale = ref(1)

/** 模型浏览工具（收起数据栏后展示，样板阶段为演示态） */
const MODEL_TOOLS = [
  { key: 'section', label: '剖切', icon: Scissor },
  { key: 'measure', label: '测量', icon: Odometer },
  { key: 'roam', label: '漫游', icon: Position },
  { key: 'explode', label: '爆炸', icon: Expand },
]

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (!collapsed.value) activeTool.value = ''
}

const screenTitle = '工程建设智慧管控一体化平台'
const scopeLabel = '深圳机场扩建工程 · T1航站区'

const current = computed(() => SCREEN_DATA[activeTab.value] || SCREEN_DATA.safety)
/** 切页按 visible 过滤：当前只开放「安全态势」，质量 / 项目要素隐藏待后续迭代 */
const visibleTabs = computed(() => SCREEN_TABS.filter((tab) => tab.visible !== false))

const viewportStyle = computed(() => ({
  '--coc-viewport-scale': String(scale.value),
  '--coc-font-boost': `${Math.round(2.5 * scale.value * 10) / 10}px`,
}))

const canvasStyle = computed(() => ({ transform: `scale(${scale.value})` }))

function updateScale() {
  const scaleW = window.innerWidth / DESIGN_WIDTH
  const scaleH = window.innerHeight / DESIGN_HEIGHT
  scale.value = Math.min(scaleW, scaleH)
}

/** 样板屏固定指挥部全量视角，项目下拉切换不生效（仅避免受控组件告警） */
function handleProjectChange() {}

onMounted(() => {
  updateScale()
  document.body.classList.add('coc-hq-shell')
  window.addEventListener('resize', updateScale)
})

onBeforeUnmount(() => {
  document.body.classList.remove('coc-hq-shell')
  window.removeEventListener('resize', updateScale)
})
</script>

<template>
  <div class="screen-style-app">
    <div class="screen-viewport" :style="viewportStyle">
      <div class="screen-canvas coc-hq-mode" :style="canvasStyle">
      <!-- 中间：航拍底图 + 模型浮标 -->
      <SsStage :markers="current.markers" :active-key="activeTab" />

      <!-- COC 屏边缘光效与顶部标题栏 -->
      <HqEdgeLights />
      <CocHqHeader
        :title="screenTitle"
        :projects="projects"
        :selection-id="selectedProjectId"
        :status-filters="statusFilters"
        hide-toolbar
        @project-change="handleProjectChange"
      >
        <template #left>
          <span class="ss-scope">
            <i class="ss-scope__dot" />
            {{ scopeLabel }}
            <em>LIVE 实时态势</em>
          </span>
        </template>
      </CocHqHeader>

      <!-- 左右数据栏（收起时整体滑出） -->
      <SsSideColumn side="left" :panels="current.left" :open="!collapsed" />
      <SsSideColumn side="right" :panels="current.right" :open="!collapsed" />

      <!-- 收起把手：贴在数据栏内侧边缘，点击一键收起/展开两侧数据栏与底部切页 -->
      <SsCollapseRail side="left" :collapsed="collapsed" @toggle="toggleCollapsed" />
      <SsCollapseRail side="right" :collapsed="collapsed" @toggle="toggleCollapsed" />

      <!-- 底部：全局研判结论（地图下方、切页上方） -->
      <div v-if="current.verdict" class="ss-verdict" :class="{ 'is-hidden': collapsed }">
        <span class="ss-verdict__label">全局研判</span>
        <p class="ss-verdict__text">{{ current.verdict.text }}</p>
        <span class="ss-verdict__stats">
          <span
            v-for="stat in current.verdict.stats"
            :key="stat.label"
            class="ss-verdict__stat"
            :class="`is-${stat.tone}`"
          >
            <em>{{ stat.label }}</em><b>{{ stat.value }}</b>
          </span>
        </span>
      </div>

      <!-- 底部居中切页（复用 COC 大屏 Tab 样式；质量 / 项目要素只展示不可点） -->
      <div class="ss-tabbar" :class="{ 'is-hidden': collapsed }" role="tablist" aria-label="大屏态势切页">
        <HqNavTab
          v-for="tab in visibleTabs"
          :key="tab.key"
          :label="tab.label"
          :active="tab.key === activeTab"
          :disabled="tab.disabled === true"
          @click="tab.disabled ? null : (activeTab = tab.key)"
        />
      </div>

      <!-- 收起后：模型浏览工具条（剖切 / 测量 / 漫游 / 爆炸） -->
      <div class="ss-tools" :class="{ 'is-visible': collapsed }" role="toolbar" aria-label="模型浏览工具">
        <button
          v-for="tool in MODEL_TOOLS"
          :key="tool.key"
          type="button"
          class="ss-tool"
          :class="{ 'is-active': activeTool === tool.key }"
          @click="activeTool = activeTool === tool.key ? '' : tool.key"
        >
          <span class="ss-tool__inner">
            <el-icon :size="14"><component :is="tool.icon" /></el-icon>
            <em>{{ tool.label }}</em>
          </span>
        </button>
      </div>

      <p class="ss-foot-note">
        <span class="ss-foot-note__dot" />
        {{ current.footerNote }}
        <em>演示数据</em>
      </p>

      <div class="screen-badge">1920×1080 · 缩放 {{ Math.round(scale * 100) }}%</div>
      </div>
    </div>
  </div>
</template>
