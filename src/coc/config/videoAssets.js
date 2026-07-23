import videoMonitorThumbUrl from '../assets/video-monitor-thumb.png'
import handheldDeviceThumbUrl from '../assets/handheld-device-thumb.png'

export const VIDEO_MONITOR_THUMB_URL = videoMonitorThumbUrl
export const HANDHELD_DEVICE_THUMB_URL = handheldDeviceThumbUrl

export function isHandheldDeviceFeed(online, deviceType) {
  return online && deviceType === 'handheld'
}

export function isVideoMonitorFeed(online, palette = 'warm', deviceType) {
  if (deviceType === 'handheld') return false
  return online && palette !== 'cool'
}

export function videoPlaceholderColor(online, index = 0, palette = 'warm', deviceType) {
  if (!online) return 'linear-gradient(135deg, #e8e8e8, #d0d0d0)'
  if (deviceType === 'handheld') {
    return `url("${HANDHELD_DEVICE_THUMB_URL}") center/cover no-repeat`
  }
  if (palette === 'cool') {
    const cool = [200, 210, 220]
    const h = cool[index % cool.length]
    return `linear-gradient(135deg, hsl(${h}, 35%, 88%), hsl(${h + 10}, 40%, 78%))`
  }
  return `url("${VIDEO_MONITOR_THUMB_URL}") center/cover no-repeat`
}

export function videoPlaceholderClass(online, palette = 'warm', deviceType) {
  if (isHandheldDeviceFeed(online, deviceType)) return 'is-handheld-device'
  return isVideoMonitorFeed(online, palette, deviceType) ? 'is-video-monitor' : ''
}

let thumbImagePromise = null
let handheldThumbImagePromise = null

export function loadVideoMonitorThumbImage() {
  if (!thumbImagePromise) {
    thumbImagePromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = VIDEO_MONITOR_THUMB_URL
    })
  }
  return thumbImagePromise
}

export function loadHandheldDeviceThumbImage() {
  if (!handheldThumbImagePromise) {
    handheldThumbImagePromise = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = HANDHELD_DEVICE_THUMB_URL
    })
  }
  return handheldThumbImagePromise
}

export function resolveThumbImageLoader(deviceType) {
  return deviceType === 'handheld' ? loadHandheldDeviceThumbImage : loadVideoMonitorThumbImage
}
