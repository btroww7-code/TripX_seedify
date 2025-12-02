import { supabase } from '../lib/supabase';
import { 
  generateFingerprint, 
  generateFingerprintHash, 
  getOSInfo, 
  getBrowserInfo, 
  getDeviceType,
  DeviceFingerprint,
  OSInfo,
  BrowserInfo
} from '../lib/fingerprintService';

export interface SessionData {
  fingerprint: string;
  fingerprintHash: string;
  fingerprintData: DeviceFingerprint;
  userAgent: string;
  os: string;
  osInfo: OSInfo;
  browser: string;
  browserInfo: BrowserInfo;
  deviceType: string;
  deviceInfo: any;
  ipAddress?: string;
  country?: string;
  city?: string;
}

const SESSION_TOKEN_KEY = 'tripx_session_token';
const SESSION_START_KEY = 'tripx_session_start';

/**
 * Get IP address (requires backend API)
 */
export async function getIPAddress(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.warn('Failed to get IP address:', error);
    return null;
  }
}

/**
 * Get location from IP (requires backend API)
 */
export async function getLocationFromIP(ip: string): Promise<{ country?: string; city?: string }> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name || undefined,
      city: data.city || undefined,
    };
  } catch (error) {
    console.warn('Failed to get location from IP:', error);
    return {};
  }
}

/**
 * Collect all session data with full fingerprint details
 */
export async function collectSessionData(): Promise<SessionData> {
  if (typeof window === 'undefined') {
    return {
      fingerprint: '',
      fingerprintHash: '',
      fingerprintData: {} as DeviceFingerprint,
      userAgent: '',
      os: 'Unknown',
      osInfo: { name: 'Unknown', version: 'Unknown', architecture: 'Unknown' },
      browser: 'Unknown',
      browserInfo: { name: 'Unknown', version: 'Unknown', engine: 'Unknown' },
      deviceType: 'Unknown',
      deviceInfo: {}
    };
  }

  // Get full fingerprint data
  const fingerprintData = generateFingerprint();
  const fingerprintHash = generateFingerprintHash();
  const osInfo = getOSInfo();
  const browserInfo = getBrowserInfo();
  const deviceType = getDeviceType();
  
  // Create full fingerprint string
  const fingerprint = JSON.stringify(fingerprintData);
  
  // Device info
  const deviceInfo = {
    screen: fingerprintData.screen,
    hardwareConcurrency: fingerprintData.hardwareConcurrency,
    deviceMemory: fingerprintData.deviceMemory,
    maxTouchPoints: fingerprintData.maxTouchPoints,
    timezone: fingerprintData.timezone,
    language: fingerprintData.language,
    languages: fingerprintData.languages,
    platform: fingerprintData.platform,
    vendor: fingerprintData.vendor,
    cookieEnabled: fingerprintData.cookieEnabled,
    doNotTrack: fingerprintData.doNotTrack
  };
  
  const userAgent = navigator.userAgent;
  const os = osInfo.name;
  const browser = browserInfo.name;
  
  let ipAddress: string | undefined;
  let country: string | undefined;
  let city: string | undefined;

  try {
    ipAddress = await getIPAddress() || undefined;
    if (ipAddress) {
      const location = await getLocationFromIP(ipAddress);
      country = location.country;
      city = location.city;
    }
  } catch (error) {
    console.warn('Failed to get IP/location:', error);
  }

  return {
    fingerprint,
    fingerprintHash,
    fingerprintData,
    userAgent,
    os,
    osInfo,
    browser,
    browserInfo,
    deviceType,
    deviceInfo,
    ipAddress,
    country,
    city,
  };
}

/**
 * Create a new session with full tracking data
 */
export async function createSession(
  userId: string,
  walletAddress?: string,
  email?: string
): Promise<string | null> {
  try {
    const sessionData = await collectSessionData();

    // Note: The RPC function may need to be updated to accept additional fields
    // For now, we'll pass what we can and log the full data
    const { data, error } = await supabase.rpc('create_user_session', {
      p_user_id: userId,
      p_wallet_address: walletAddress || null,
      p_email: email || null,
      p_fingerprint: sessionData.fingerprintHash, // Use hash for quick lookup
      p_user_agent: sessionData.userAgent,
      p_os: sessionData.os,
      p_browser: sessionData.browser,
      p_device_type: sessionData.deviceType,
      p_ip_address: sessionData.ipAddress || null,
      p_country: sessionData.country || null,
      p_city: sessionData.city || null,
      p_session_duration_hours: 24,
    });

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    const sessionToken = data as string;
    
    // Store full fingerprint data in session storage for later use
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
      localStorage.setItem(SESSION_START_KEY, Date.now().toString());
      sessionStorage.setItem('tripx_full_fingerprint', JSON.stringify(sessionData.fingerprintData));
      sessionStorage.setItem('tripx_os_info', JSON.stringify(sessionData.osInfo));
      sessionStorage.setItem('tripx_browser_info', JSON.stringify(sessionData.browserInfo));
      sessionStorage.setItem('tripx_device_info', JSON.stringify(sessionData.deviceInfo));
    }

    // Log activity for admin panel - insert into both tables
    try {
      // Insert into user_activity_events
      const activityResult = await supabase.from('user_activity_events').insert({
        user_id: userId,
        event_type: 'session_start',
        event_data: {
          session_token: sessionToken,
          fingerprint_hash: sessionData.fingerprintHash,
          device_type: sessionData.deviceType,
          os: sessionData.os,
          browser: sessionData.browser
        },
        ip_address: sessionData.ipAddress || null,
        user_agent: sessionData.userAgent,
        fingerprint: sessionData.fingerprint,
        fingerprint_hash: sessionData.fingerprintHash,
        country: sessionData.country || null,
        city: sessionData.city || null,
        device_type: sessionData.deviceType,
        device_info: sessionData.deviceInfo,
        os_info: sessionData.osInfo,
        browser_info: sessionData.browserInfo
      });
      
      if (activityResult.error) {
        console.warn('Failed to log session activity to user_activity_events:', activityResult.error);
      } else {
        console.log('[SessionService] Activity logged to user_activity_events');
      }

      // Also insert into admin_activity_log for compatibility
      await supabase.from('admin_activity_log').insert({
        user_id: userId,
        action_type: 'session_start',
        action_details: {
          session_token: sessionToken,
          fingerprint_hash: sessionData.fingerprintHash,
          device_type: sessionData.deviceType,
          os: sessionData.os,
          browser: sessionData.browser
        },
        ip_address: sessionData.ipAddress || null,
        user_agent: sessionData.userAgent,
        fingerprint: sessionData.fingerprint,
        fingerprint_hash: sessionData.fingerprintHash,
        country: sessionData.country || null,
        city: sessionData.city || null,
        device_type: sessionData.deviceType,
        device_info: sessionData.deviceInfo,
        os_info: sessionData.osInfo,
        browser_info: sessionData.browserInfo
      }).catch(err => console.warn('Failed to log to admin_activity_log:', err));
    } catch (logError) {
      console.warn('Failed to log activity:', logError);
    }

    return sessionToken;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Log user activity for admin panel
 */
export async function logActivity(
  userId: string,
  actionType: string,
  actionDetails: any,
  sessionData?: SessionData
): Promise<void> {
  try {
    // Get current session data if not provided
    let data = sessionData;
    if (!data) {
      data = await collectSessionData();
    }

    // Get session token if available
    const sessionToken = typeof window !== 'undefined' 
      ? localStorage.getItem(SESSION_TOKEN_KEY) 
      : null;

    // Try RPC function first, fallback to direct insert
    const rpcResult = await supabase.rpc('log_user_activity_event', {
      p_user_id: userId,
      p_event_type: actionType,
      p_event_data: actionDetails,
      p_ip_address: data.ipAddress || null,
      p_user_agent: data.userAgent,
      p_fingerprint: data.fingerprint,
      p_fingerprint_hash: data.fingerprintHash,
      p_country: data.country || null,
      p_city: data.city || null,
      p_device_type: data.deviceType,
      p_device_info: data.deviceInfo,
      p_os_info: data.osInfo,
      p_browser_info: data.browserInfo,
      p_session_id: null
    });

    // If RPC fails, use direct insert
    if (rpcResult.error) {
      console.log('[SessionService] RPC failed, using direct insert:', rpcResult.error);
      const insertResult = await supabase.from('user_activity_events').insert({
        user_id: userId,
        event_type: actionType,
        event_data: actionDetails,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent,
        fingerprint: data.fingerprint,
        fingerprint_hash: data.fingerprintHash,
        country: data.country || null,
        city: data.city || null,
        device_type: data.deviceType,
        device_info: data.deviceInfo,
        os_info: data.osInfo,
        browser_info: data.browserInfo
      });
      
      if (insertResult.error) {
        console.error('[SessionService] Direct insert also failed:', insertResult.error);
      } else {
        console.log('[SessionService] Activity logged successfully via direct insert');
      }

      // Also log to admin_activity_log
      await supabase.from('admin_activity_log').insert({
        user_id: userId,
        action_type: actionType,
        action_details: actionDetails,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent,
        fingerprint: data.fingerprint,
        fingerprint_hash: data.fingerprintHash,
        country: data.country || null,
        city: data.city || null,
        device_type: data.deviceType,
        device_info: data.deviceInfo,
        os_info: data.osInfo,
        browser_info: data.browserInfo
      }).catch(err => console.warn('Failed to log to admin_activity_log:', err));
    } else {
      console.log('[SessionService] Activity logged successfully via RPC');
    }
  } catch (error) {
    console.warn('Failed to log activity:', error);
  }
}

/**
 * Validate current session
 */
export async function validateSession(): Promise<{
  isValid: boolean;
  userId?: string;
  walletAddress?: string;
  email?: string;
}> {
  if (typeof window === 'undefined') {
    return { isValid: false };
  }

  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!sessionToken) {
    return { isValid: false };
  }

  try {
    const { data, error } = await supabase.rpc('validate_session', {
      p_session_token: sessionToken,
    });

    if (error || !data) {
      // Session invalid, clear it
      clearSession();
      return { isValid: false };
    }

    const session = data as {
      is_valid: boolean;
      user_id: string;
      wallet_address: string | null;
      email: string | null;
    };

    if (!session.is_valid) {
      clearSession();
      return { isValid: false };
    }

    return {
      isValid: true,
      userId: session.user_id,
      walletAddress: session.wallet_address || undefined,
      email: session.email || undefined,
    };
  } catch (error) {
    console.error('Error validating session:', error);
    clearSession();
    return { isValid: false };
  }
}

/**
 * Delete current session
 */
export async function deleteSession(endReason: 'logout' | 'expired' | 'browser_close' | 'hard_refresh' | 'server_restart' | 'session_timeout' | 'manual' = 'logout'): Promise<void> {
  if (typeof window === 'undefined') return;

  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (sessionToken) {
    try {
      await supabase.rpc('delete_session', {
        p_session_token: sessionToken,
        p_end_reason: endReason,
      });
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  clearSession();
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_START_KEY);
  }
}

/**
 * Check if session exists in localStorage
 */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Get session token from localStorage
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Check if this is a hard refresh or new session
 */
export function isNewSession(): boolean {
  if (typeof window === 'undefined') return true;

  const sessionStart = localStorage.getItem(SESSION_START_KEY);
  if (!sessionStart) return true;

  // Check if session is older than 24 hours (expired)
  const sessionAge = Date.now() - parseInt(sessionStart, 10);
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  return sessionAge > twentyFourHours;
}

/**
 * Setup beforeunload handler to clear session on browser close
 */
export function setupSessionCleanup(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleBeforeUnload = () => {
    // Mark session for cleanup
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('tripx_session_closing', 'true');
    }
  };

  const handleVisibilityChange = () => {
    // If page becomes hidden, mark for cleanup
    if (document.hidden) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tripx_session_closing', 'true');
      }
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

