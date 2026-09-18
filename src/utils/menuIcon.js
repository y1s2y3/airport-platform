/**
 * 菜单图标：统一空心（线框）风格
 * 参照「档案管理」FolderOpened；避免 HomeFilled / House 等实心剪影。
 */
export const MENU_ICON_OUTLINE_ALIAS = {
  // —— *Filled 实心对 → 空心 ——
  BellFilled: 'Bell',
  BrushFilled: 'Brush',
  CameraFilled: 'Camera',
  ChromeFilled: 'Monitor',
  CircleCheckFilled: 'CircleCheck',
  CircleCloseFilled: 'CircleClose',
  CirclePlusFilled: 'CirclePlus',
  DeleteFilled: 'Delete',
  ElemeFilled: 'Eleme',
  GoodsFilled: 'ShoppingBag',
  HelpFilled: 'Help',
  HomeFilled: 'Monitor',
  LocationFilled: 'Location',
  MoreFilled: 'More',
  PhoneFilled: 'Phone',
  PictureFilled: 'Picture',
  RemoveFilled: 'Remove',
  StarFilled: 'Star',
  SuccessFilled: 'CircleCheck',
  SwitchFilled: 'Switch',
  UploadFilled: 'Upload',
  UserFilled: 'User',
  VideoCameraFilled: 'VideoCamera',
  WalletFilled: 'Wallet',
  WarnTriangleFilled: 'Warning',
  WarningFilled: 'Warning',

  // —— 无 Filled 后缀但偏实心剪影 → 更空心/线框 ——
  House: 'Monitor',
  Avatar: 'User',
  Goods: 'ShoppingBag',
  Stamp: 'Tickets',
  Flag: 'Position',
  Medal: 'TrophyBase',
  Trophy: 'TrophyBase',
  Sunny: 'Sunrise',
  Box: 'Files',
  Collection: 'Notebook',
  Briefcase: 'SuitcaseLine',
  FirstAidKit: 'Help',
  DataBoard: 'DataLine',
  PieChart: 'DataAnalysis',
  Histogram: 'DataAnalysis',
  Platform: 'Monitor',
  Opportunity: 'Compass',
  SoldOut: 'ShoppingCart',
  WindPower: 'Rank',
  MagicStick: 'Brush',
  ChatDotRound: 'ChatLineRound',
  Grid: 'Operation',
  PriceTag: 'CollectionTag',
  Ticket: 'CollectionTag',
  Tickets: 'Notebook',
  TrendCharts: 'DataAnalysis',
  Notification: 'Bell',
  MuteNotification: 'Bell',
  Cpu: 'SetUp',
  Postcard: 'Document',
  OfficeBuilding: 'School',
  Suitcase: 'SuitcaseLine',
  Odometer: 'Compass',
  Aim: 'Compass',
  Ship: 'Van',
  Checked: 'CircleCheck',
  Failed: 'CircleClose',
  Select: 'CircleCheck',
  PictureRounded: 'Picture',
  ScaleToOriginal: 'Crop',
  Promotion: 'Position',
}

/** 文字型菜单图标（非 Element Plus 组件，直接展示文案） */
export const MENU_TEXT_ICONS = {
  AI: 'AI',
}

/** 是否为文字型菜单图标 */
export function isTextMenuIcon(name) {
  return Boolean(name && MENU_TEXT_ICONS[name])
}

/** 文字型图标展示文案 */
export function textMenuIconLabel(name) {
  return MENU_TEXT_ICONS[name] || name || ''
}

/** 解析为空心图标名（无映射则原样返回） */
export function resolveMenuIconName(name) {
  if (!name) return name
  if (isTextMenuIcon(name)) return name
  return MENU_ICON_OUTLINE_ALIAS[name] || name
}
