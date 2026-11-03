export function isTouchDevice() {
  const forced = new URLSearchParams(location.search).get('touch');
  if (forced === '1') return true;
  if (forced === '0') return false;
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}