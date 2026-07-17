export function isMobileDevice() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (navigator.userAgentData?.mobile) {
    return true;
  }

  return window.matchMedia('(pointer: coarse)').matches
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function hasSecureCameraContext() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.isSecureContext
    || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}
