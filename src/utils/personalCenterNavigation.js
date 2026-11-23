export const PERSONAL_CENTER_TABS = ['todo', 'done', 'started', 'cc', 'warning-center', 'notice']

export function personalCenterReturnLocation(query, fallbackTab = 'todo') {
  const path = query.returnTo
  if (path !== '/workbench' && path !== '/personal-center') return null
  const tab = PERSONAL_CENTER_TABS.includes(query.returnTab) ? query.returnTab : fallbackTab
  return { path, query: tab === 'todo' ? {} : { tab } }
}
