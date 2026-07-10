import { sidebarMenu } from '../config/menu'
import { appMenu } from '../config/appMenu'

export function mapMenuItemsToTree(items = []) {
  return items.map((item) => {
    const node = {
      id: item.key,
      label: item.label,
    }
    if (item.children?.length) {
      node.children = mapMenuItemsToTree(item.children)
    }
    return node
  })
}

export const webMenuPermissionTree = mapMenuItemsToTree(sidebarMenu)
export const appMenuPermissionTree = mapMenuItemsToTree(appMenu)

export function collectMenuTreeKeys(tree = []) {
  const keys = []
  function walk(nodes) {
    nodes.forEach((node) => {
      keys.push(node.id)
      if (node.children?.length) walk(node.children)
    })
  }
  walk(tree)
  return keys
}

export function collectMenuTreeLeafKeys(tree = []) {
  const keys = []
  function walk(nodes) {
    nodes.forEach((node) => {
      if (node.children?.length) walk(node.children)
      else keys.push(node.id)
    })
  }
  walk(tree)
  return keys
}
