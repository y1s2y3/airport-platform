export * from './qmInspect.js'
export * from './qmFormTemplates.js'
export * from './qmAttachments.js'
export * from './qmArchive.js'
export * from './qmInspectOps.js'
export * from './qmApproverConfig.js'
export * from './qmSpecialAccept.js'
export * from './qmCompleteAccept.js'
export * from './qmInspectV2.js'
export { displayTaskLocationName, normalizeLocationFields } from './constructionLocation.js'

import { migrateTasksToV2 } from './qmInspectV2.js'
migrateTasksToV2()
