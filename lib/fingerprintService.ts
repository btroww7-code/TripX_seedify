/**
 * Browser Fingerprinting Service
 * Collects detailed device and browser information for security and analytics
 */

export interface DeviceFingerprint {
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  timezone: string;
  language: string;
  languages: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  canvas: string | null;
  webgl: string | null;
  plugins: string[];
  userAgent: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  vendor: string;
  vendorSub: string;
  product: string;
  productSub: string;
}

export interface OSInfo {
  name: string;
  version: string;
  architecture: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
}

/**
 * Generate canvas fingerprint
 */
function getCanvasFingerprint(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Fingerprint', 4, 17);

    return canvas.toDataURL();
  } catch (e) {
    return null;
  }
}

/**
 * Generate WebGL fingerprint
 */
function getWebGLFingerprint(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor}|${renderer}`;
  } catch (e) {
    return null;
  }
}

/**
 * Detect OS from user agent
 */
function detectOS(): OSInfo {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let architecture = 'Unknown';

  if (ua.includes('Windows')) {
    name = 'Windows';
    if (ua.includes('Windows NT 10.0')) version = '10';
    else if (ua.includes('Windows NT 6.3')) version = '8.1';
    else if (ua.includes('Windows NT 6.2')) version = '8';
    else if (ua.includes('Windows NT 6.1')) version = '7';
    else if (ua.includes('Windows NT 6.0')) version = 'Vista';
    else if (ua.includes('Windows NT 5.1')) version = 'XP';
  } else if (ua.includes('Mac OS X')) {
    name = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) version = match[1].replace('_', '.');
  } else if (ua.includes('Linux')) {
    name = 'Linux';
    const match = ua.match(/Linux ([^;)]+)/);
    if (match) version = match[1];
  } else if (ua.includes('Android')) {
    name = 'Android';
    const match = ua.match(/Android (\d+\.\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    name = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    if (match) version = match[1].replace('_', '.');
  }

  // Detect architecture
  if (navigator.userAgentData && (navigator.userAgentData as any).platform) {
    architecture = (navigator.userAgentData as any).platform;
  } else if (ua.includes('x64') || ua.includes('x86_64') || ua.includes('Win64')) {
    architecture = 'x64';
  } else if (ua.includes('x86') || ua.includes('Win32')) {
    architecture = 'x86';
  } else if (ua.includes('ARM')) {
    architecture = 'ARM';
  }

  return { name, version, architecture };
}

/**
 * Detect browser from user agent
 */
function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    if (match) version = match[1];
    engine = 'Blink';
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    if (match) version = match[1];
    engine = 'Gecko';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+\.\d+)/);
    if (match) version = match[1];
    engine = 'WebKit';
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    if (match) version = match[1];
    engine = 'Blink';
  } else if (ua.includes('OPR')) {
    name = 'Opera';
    const match = ua.match(/OPR\/(\d+\.\d+)/);
    if (match) version = match[1];
    engine = 'Blink';
  }

  return { name, version, engine };
}

/**
 * Get list of installed plugins
 */
function getPlugins(): string[] {
  try {
    return Array.from(navigator.plugins).map(plugin => plugin.name);
  } catch (e) {
    return [];
  }
}

/**
 * Generate complete device fingerprint
 */
export function generateFingerprint(): DeviceFingerprint {
  return {
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages || [navigator.language],
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || undefined,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    canvas: getCanvasFingerprint(),
    webgl: getWebGLFingerprint(),
    plugins: getPlugins(),
    userAgent: navigator.userAgent,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || null,
    vendor: navigator.vendor,
    vendorSub: navigator.vendorSub,
    product: navigator.product,
    productSub: navigator.productSub,
  };
}

/**
 * Get OS information
 */
export function getOSInfo(): OSInfo {
  return detectOS();
}

/**
 * Get browser information
 */
export function getBrowserInfo(): BrowserInfo {
  return detectBrowser();
}

/**
 * Generate fingerprint hash (simplified version for quick comparison)
 */
export function generateFingerprintHash(): string {
  const fp = generateFingerprint();
  const os = getOSInfo();
  const browser = getBrowserInfo();
  
  const key = `${fp.screen.width}x${fp.screen.height}_${fp.timezone}_${fp.language}_${os.name}_${browser.name}_${fp.hardwareConcurrency}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Get device type (mobile, tablet, desktop)
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  const ua = navigator.userAgent;
  
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) {
    return 'mobile';
  }
  
  return 'desktop';
}

