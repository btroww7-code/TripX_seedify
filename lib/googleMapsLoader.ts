/**
 * Central Google Maps API Loader
 * Ensures Google Maps API is loaded only once across the entire application
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let isLoaded = false;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google: any;
    googleMapsLoader?: {
      isLoaded: boolean;
      load: () => Promise<void>;
    };
  }
}

/**
 * Loads Google Maps API only once
 * @param libraries - Comma-separated list of libraries to load (default: 'places,geometry')
 */
export const loadGoogleMaps = (libraries: string = 'places,geometry'): Promise<void> => {
  // Check if already loaded
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // If already loading, return existing promise
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Check if script already exists in DOM
  const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
  if (existingScript) {
    // Script exists, wait for it to load
    isLoading = true;
    loadPromise = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          isLoaded = true;
          isLoading = false;
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          console.error('Google Maps API failed to load');
        }
        isLoading = false;
        resolve();
      }, 10000);
    });
    return loadPromise;
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_MAPS_API_KEY) {
      const error = new Error('Google Maps API key not found');
      console.error(error);
      isLoading = false;
      reject(error);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${libraries}&language=en&region=US&loading=async`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    script.onload = () => {
      // Wait a bit for Google Maps to fully initialize
      setTimeout(() => {
        if (window.google?.maps) {
          isLoaded = true;
          isLoading = false;
          console.log('✅ Google Maps API loaded successfully');
          resolve();
        } else {
          isLoading = false;
          reject(new Error('Google Maps API loaded but not available'));
        }
      }, 100);
    };

    script.onerror = () => {
      isLoading = false;
      const error = new Error('Failed to load Google Maps API');
      console.error(error);
      reject(error);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

/**
 * Check if Google Maps API is loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return isLoaded && !!window.google?.maps;
};

/**
 * Wait for Google Maps API to be ready
 */
export const waitForGoogleMaps = (timeout: number = 10000): Promise<void> => {
  if (isGoogleMapsLoaded()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isGoogleMapsLoaded()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Google Maps API'));
      }
    }, 100);
  });
};

// Export global loader
if (typeof window !== 'undefined') {
  window.googleMapsLoader = {
    isLoaded: isLoaded,
    load: loadGoogleMaps,
  };
}

