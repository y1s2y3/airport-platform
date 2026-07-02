import heroImg from '../assets/hero.png'

export const profileDemoImages = {
  projectEffect: heroImg,
}

export function resolveProfileImage(value, demoSrc) {
  if (!value) return demoSrc
  if (/^(data:|https?:|\/|blob:)/.test(value)) return value
  return demoSrc
}

export function isUploadedImage(value) {
  return Boolean(value && /^(data:|https?:|\/|blob:)/.test(value))
}
