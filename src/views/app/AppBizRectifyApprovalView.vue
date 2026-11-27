<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getVisibleMobileRectification } from '../../composables/useMobileRectification'
import { currentWorkflowStep } from '../../utils/inspectionRectificationWorkflow'
import AppBizSubPage from './AppBizSubPage.vue'
import MobileRectifyApprovalView from '../mobile/MobileRectifyApprovalView.vue'

const route = useRoute()
const title = computed(() => currentWorkflowStep(getVisibleMobileRectification(route.params.id))?.label || '整改单审批')
</script>

<template>
  <AppBizSubPage :title="title" back-to="/app/rectify">
    <MobileRectifyApprovalView />
  </AppBizSubPage>
</template>
