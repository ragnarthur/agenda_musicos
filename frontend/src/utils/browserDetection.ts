/**
 * Browser and platform detection utilities
 * Used to provide optimal UX across different browsers and devices
 */

/**
 * Detects if the current browser is Safari
 */
export const isSafari = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') > -1 && ua.indexOf('chrome') === -1;
};

/**
 * Detects if the current device is iOS
 */
export const isIOS = (): boolean => {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
};

/**
 * Detects if the browser is Safari on iOS
 */
export const isIOSSafari = (): boolean => {
  return isIOS() && isSafari();
};

/**
 * Get recommended geolocation timeout for current browser
 * iOS Safari needs longer timeouts due to stricter GPS handling
 */
export const getGeolocationTimeout = (): number => {
  if (isIOSSafari()) {
    return 15000; // 15 seconds for iOS Safari
  }
  return 10000; // 10 seconds for others
};

/**
 * Get recommended getCurrentPosition timeout for current browser
 * iOS Safari needs longer timeouts for GPS positioning
 */
export const getPositionTimeout = (): number => {
  if (isIOSSafari()) {
    return 12000; // 12 seconds for iOS Safari
  }
  return 8000; // 8 seconds for others
};
