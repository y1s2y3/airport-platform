/** 阿里云智能语音交互 · 实时语音识别配置（凭证来自 .env.local） */
export function getAliyunNlsConfig() {
  return {
    appKey: import.meta.env.VITE_ALIYUN_NLS_APPKEY || '',
    token: import.meta.env.VITE_ALIYUN_NLS_TOKEN || '',
    gatewayUrl:
      import.meta.env.VITE_ALIYUN_NLS_GATEWAY ||
      'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1',
    projectName: import.meta.env.VITE_ALIYUN_NLS_PROJECT || '',
  }
}

export function isAliyunNlsConfigured() {
  const { appKey, token } = getAliyunNlsConfig()
  return Boolean(appKey && token)
}
