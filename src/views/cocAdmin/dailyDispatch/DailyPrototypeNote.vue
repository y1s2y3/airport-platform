<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { dailyDispatchDocuments } from '../../../config/dailyDispatchDocuments.js'
import DailyCheckDialog from './DailyCheckDialog.vue'
const visible = ref(false), downloading = ref('')

async function downloadDocument(entry) {
  if (downloading.value) return
  downloading.value = entry.id
  let url, link
  try {
    let content = entry.content
    if (entry.url) {
      const response = await fetch(entry.url)
      if (!response.ok) throw new Error('Document unavailable')
      content = await response.arrayBuffer()
    }
    const blob = new Blob([content], { type: entry.mimeType })
    url = URL.createObjectURL(blob)
    link = document.createElement('a')
    link.href = url
    link.download = entry.fileName
    link.hidden = true
    document.body.appendChild(link)
    link.click()
  } catch {
    ElMessage.error('文档下载失败，请重试')
  } finally {
    downloading.value = ''
    link?.remove()
    if (url) setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
</script>
<template>
  <el-button link type="primary" size="small" @click="visible = true">原型说明</el-button>
  <DailyCheckDialog v-model="visible" title="每日调度检查 · 原型说明" width="900px"><div class="daily-prototype-content">
    <section v-if="dailyDispatchDocuments.length" class="daily-prototype-documents" aria-label="相关文档">
      <h3>相关文档</h3>
      <p class="daily-document-hint">当前业务核对依据为下列Word PRD；各入口使用同一份文件。</p>
      <ul class="daily-document-list">
        <li v-for="entry in dailyDispatchDocuments" :key="entry.id" class="daily-prototype-document">
          <div class="daily-document-info">
            <div class="daily-document-heading"><strong>{{ entry.title }}</strong><span class="daily-document-format">{{ entry.format }}</span></div>
            <p class="daily-document-description">{{ entry.description }}</p>
          </div>
          <el-button type="primary" plain :icon="Download" :aria-label="`下载${entry.title}`" :loading="downloading === entry.id" :disabled="!!downloading && downloading !== entry.id" @click="downloadDocument(entry)">下载</el-button>
        </li>
      </ul>
    </section>
    <h3>依据与使用范围</h3><p>以下业务说明以《每日调度检查 · 产品需求文档》v1.1（项目范围与预填修订）为准。PRD所属菜单为【调度中心】→【每日调度检查】，仅工程指挥部层级可见；可登录指挥部的账号均可使用入口，本期不按业务岗位细分操作权限，仍受数据范围、编辑占用与填写校验约束。业务姓名与实际登录操作账号分别记录。</p>
    <h3>填写、保存与查看</h3><p>每日检查按日期展示人员履职、安全质量、摄像头、值班人员和项目经理五类结果，固定提供【统一调度检查填写】【项目部检查填写】【查看详情】。检查统计是只读台账，提供十个候选业务字段、两类范围问题合计和【查看详情】，不提供填写。</p>
    <p>同一检查日期的统一调度部分先取得独占才进入填写；被占用时提示并返回每日检查台账。项目抽屉【应用到当前表单】只更新页面草稿；页面【保存】才整块生效，成功后释放占用、返回每日检查并刷新摘要。页面【返回】或【取消】均先弹【未保存内容】；继续填写保留当前编辑，确认放弃才舍弃修改并返回。抽屉仅在有未应用修改时确认放弃。</p>
    <p>两个台账复用唯一的【COC调度会检查记录表详情】。项目行和查看按钮打开同一个只读双Tab抽屉，图片点击只预览，不触发行点击；查看、预览和初始化均不更新业务保存时间。详情返回实际来源台账；填写与查看都保留来源日期、条数、有效页码及可恢复滚动。</p>
    <h3>项目部独立填写</h3><p>项目部入口先显示当日项目列表、项目总数及两类已填项目数。抽屉只有值班人员和项目经理两个独立折叠分组，不显示Tab、当日统一调度、基本信息或整体备注。占用按日期＋项目＋检查类型分别判断；各组独立填写、保存、取消，不覆盖另一组或统一调度。填写时展开，标题实时显示草稿状态；折叠保留临时输入和图片。关闭或切换项目有未保存编辑时先确认；取消恢复本组上次保存内容。</p>
    <h3>日期查询与分页</h3><p>业务日期按北京时间确定。每日检查和检查统计默认最近30个自然日（含当天）、日期倒序，每页10条，可切换10/20/50并跳页。完整日期范围包含首尾；两端清空后点击【查询】表示不限日期，保留空白历史日表；只空一端或日期非法时提示，不替换成默认范围。【重置】恢复最近30日，查询或切换条数回第1页，超界修正到有效页。</p>
    <p>两个页签分别保持筛选输入和已应用条件；下级返回恢复来源状态并读取最新摘要，页面刷新或菜单新进入使用默认条件。检查统计列选择为临时状态，再次进入、页面刷新或本页刷新恢复默认列；合计基于全部匹配日期，不受当前页或隐藏列影响。加载失败明确提示，不显示成0条。</p>
    <h3>项目范围与临时预填</h3><p>正式日表在北京时间每日零点生成，按生成时的隐藏配置确定当日项目列表。范围形成后，上游隐藏配置变化不自动增加或移除项目；进入填写或重新读取标签也不重新生成项目列表。历史已纳入项目继续保留，本期暂不考虑历史首次补建和范围还原。隐藏配置异常但清单可用时显示全部项目；当前项目数据读取失败时采用昨日项目清单，昨日也不可用则明确报项目数据异常，不生成空表冒充成功。回退只复用项目清单，不复制昨日检查结果、人员、图片或调度标记；项目名称按基础信息展示。添加时只选择当前未隐藏、未纳入项目：统一调度添加/移除先进入草稿，页面保存才生效；项目部添加补入共享关系，本身不产生检查正文或业务保存时间。删除需保护已保存内容、图片、标记和有效项目占用，并二次确认。</p>
    <p>【当日统一调度】与项目范围分别管理。仅有“是/否”两种状态：勾选为“是”，未勾选为“否”。取得对应日期统一调度编辑占用后，如果该部分尚未成功保存，每次进入均重新读取最新项目隐藏配置与调度标签：仅对已纳入该日期项目列表且当前未隐藏、标签有效开启的项目勾选“是”，并为人员履职、安全、质量、摄像头临时预填“正常”；标签关闭、无有效值或无法读取时全部默认“否”，不自动填写四类检查。不设置空状态，历史已纳入项目及项目部记录保留。预填仅存在于本次页面草稿，不更新保存时间或参与统计；校验失败、保存失败、占用失效或仅保存项目部部分均不视为统一调度首次成功保存。点击【继续填写】保留本次预填和人工修改；【确认放弃】丢弃全部未保存内容并释放占用，再次进入重新读取最新标签，不恢复旧初始化快照。首次成功保存后以已保存内容为准，之后标签变化、手动勾选、添加项目或手动清空后再次保存均不自动补“正常”。同一次会话打开/关闭抽屉、切换项目、应用到当前表单和刷新关联内容不重新初始化。</p>
    <h3>人员、检查分支与图片</h3><p>安质部调度人员选填，从安质部及其下级部门启用人员中单选；留空保存清除当前关联。项目部两类业务姓名必填，首次默认当前登录启用用户，编辑保留已选姓名；支持按姓名关键词搜索全系统启用用户、跨项目选中和回显，无效人员不得作为有效选中项。人员选择展示“姓名（组织-岗位）”。</p>
    <p>人员履职只有【正常】【其他】，选其他时有效说明必填、最多100字。安全、质量、摄像头可选【正常】【发现问题】【其他】；发现问题每字段1～10条，每条有效描述最多500字，且各自上传1～9张图片，不能用另一条或另一部分图片抵扣；选其他时有效说明必填、最多500字，统一调度这三类其他分支没有额外截图强制要求。</p>
    <p>项目部两类检查必选【正常】【发现问题】【其他】，首次未保存部分默认正常。正常说明有效文字必填，默认“现场施工、监理管理人员在岗在位，施工正常”，且截图1～9张；其他说明最多500字并上传1～9张；发现问题每部分1～10条、逐问题图文必填。支持jpg/jpeg/png/gif/webp/bmp/svg，单张不超过5MB，每个上传控件最多9张，不把多条问题图片合并为9张总上限。项目备注最多100字、可附0～9张图片；整体备注最多500字，与项目备注分开。会话内切换分支保留临时输入，未选分支不参与当前有效统计。</p>
    <h3>状态、统计与原型边界</h3><p>五类结果仅聚合已保存内容。人员履职按其他＞正常＞--展示；另外四类按发现问题＞其他＞正常＞--展示，部分未填不把已有正常降为--，也不表示全部完成。两类问题数只统计已保存且当日统一调度为“是”的项目：安全与质量相加、摄像头独立，项目部问题不并入。有效问题显示条数；没有问题且有明确正常为0；仅其他或无结论为--。范围合计只累加有效整数，全空仍为--。</p>
    <p>当前原型使用本地摘要和前端分页，日表、图片、占用及日志在本浏览器模拟；尚无真实后台零点任务、跨设备编辑占用或全系统人员搜索，日期和时间仍受设备本地时区影响。原型在浏览器刷新后丢弃未保存输入、带出已保存内容并重新申请占用；这类浏览器刷新行为仍需在PRD中补充明确。调度标记已按最新确认统一为是/否；历史项目名称沿用已有快照，PRD尚需明确历史名称是否随基础信息更新；历史首次补建已暂缓，不列为本期未实现项。以上实现差异与待明确口径不作为上文业务规则的替代。</p>
  </div><template #footer><el-button type="primary" @click="visible = false">知道了</el-button></template></DailyCheckDialog>
</template>
<style scoped>
.daily-prototype-content { display: flex; flex-direction: column; gap: 10px; line-height: 1.8; color: var(--ap-text-secondary); }
.daily-prototype-content h3 { font-size: 14px; color: var(--ap-text); margin: 6px 0 0; }
.daily-prototype-content p { margin: 0; }
.daily-prototype-documents { display: flex; flex-direction: column; gap: 8px; padding-bottom: 16px; border-bottom: 1px solid var(--ap-border); }
.daily-prototype-documents h3 { margin: 0; color: var(--ap-text); }
.daily-document-hint, .daily-document-description { font-size: 13px; color: var(--ap-text-secondary); }
.daily-document-list { display: flex; flex-direction: column; gap: 10px; padding: 0; margin: 0; list-style: none; }
.daily-prototype-document { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-width: 0; padding: 12px 14px; border: 1px solid var(--ap-border); border-radius: 6px; background: var(--ap-bg-soft); }
.daily-document-info { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.daily-document-heading { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 12px; row-gap: 2px; }
.daily-document-heading strong { color: var(--ap-text); font-size: 14px; font-weight: 600; }
.daily-document-format { color: var(--ap-text-secondary); font-size: 12px; white-space: nowrap; }
.daily-prototype-document > .el-button { flex-shrink: 0; }
@media (max-width: 600px) {
  .daily-prototype-document { flex-direction: column; align-items: stretch; gap: 10px; }
  .daily-prototype-document > .el-button { align-self: flex-start; }
}
</style>
