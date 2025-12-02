import { useEffect } from 'react';
import { logActivity } from '../services/sessionService';
import { useWalletAuth } from './useWalletAuth';

/**
 * Hook to automatically track page visits and user activity
 */
export function useActivityTracking() {
  const { user } = useWalletAuth();

  useEffect(() => {
    if (!user?.id) {
      console.log('[useActivityTracking] No user ID, skipping tracking');
      return;
    }

    console.log('[useActivityTracking] User ID found, starting tracking:', user.id);

    // Track page visit
    const trackPageVisit = async () => {
      try {
        console.log('[useActivityTracking] Tracking page visit:', window.location.pathname);
        await logActivity(user.id, 'page_visit', {
          page: window.location.pathname,
          referrer: document.referrer || null,
          timestamp: new Date().toISOString()
        });
        console.log('[useActivityTracking] Page visit tracked successfully');
      } catch (error) {
        console.error('[useActivityTracking] Failed to track page visit:', error);
      }
    };

    // Track initial page visit
    trackPageVisit();

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        console.log('[useActivityTracking] Tracking page visibility');
        logActivity(user.id, 'page_visible', {
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        }).catch(err => console.error('[useActivityTracking] Failed to track visibility:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track clicks (throttled)
    let clickCount = 0;
    const handleClick = () => {
      clickCount++;
      if (clickCount % 10 === 0 && user?.id) {
        console.log('[useActivityTracking] Tracking user interaction:', clickCount);
        logActivity(user.id, 'user_interaction', {
          type: 'click',
          count: clickCount,
          page: window.location.pathname
        }).catch(err => console.error('[useActivityTracking] Failed to track clicks:', err));
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleClick);
    };
  }, [user?.id]);
}

