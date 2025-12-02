import React, { useEffect, useRef, useState } from 'react';

interface EPodroznikScraperProps {
  from: string;
  to: string;
  time: string;
  onResultsFound: (journeys: any[]) => void;
  onError: (error: string) => void;
}

/**
 * Hidden iframe component that scrapes e-podroznik.pl results
 * Automatically fills the form and extracts journey data
 */
export const EPodroznikScraper: React.FC<EPodroznikScraperProps> = ({
  from,
  to,
  time,
  onResultsFound,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!from || !to) return;

    console.log('🚆 EPodroznik iframe scraper: Starting search', { from, to, time });
    setIsLoading(true);

    // Load e-podroznik.pl through BACKEND PROXY (bypass CORS)
    if (iframeRef.current) {
      iframeRef.current.src = 'http://localhost:3002/api/epodroznik-proxy';
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout for scraping
    timeoutRef.current = setTimeout(() => {
      fillFormAndExtract();
    }, 3000); // Wait 3s for iframe to load

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [from, to, time]);

  const fillFormAndExtract = () => {
    try {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) {
        onError('Iframe not loaded');
        setIsLoading(false);
        return;
      }

      const iframeDoc = iframe.contentWindow.document;

      console.log('📝 Filling e-podroznik form in iframe...');

      // Find and fill FROM field
      const fromInput = iframeDoc.querySelector<HTMLInputElement>(
        'input[name="queryFrom"], input#queryFrom, input[id*="from"]'
      );
      if (fromInput) {
        fromInput.value = from;
        fromInput.dispatchEvent(new Event('input', { bubbles: true }));
        fromInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ FROM field filled:', from);
      }

      // Wait a bit for autocomplete
      setTimeout(() => {
        // Find and fill TO field
        const toInput = iframeDoc.querySelector<HTMLInputElement>(
          'input[name="queryTo"], input#queryTo, input[id*="to"]'
        );
        if (toInput) {
          toInput.value = to;
          toInput.dispatchEvent(new Event('input', { bubbles: true }));
          toInput.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('✅ TO field filled:', to);
        }

        // Set time if provided
        if (time) {
          const [hour, minute] = time.split(':');
          
          const hourSelect = iframeDoc.querySelector<HTMLSelectElement>(
            'select[name="hour"]'
          );
          if (hourSelect && hour) {
            hourSelect.value = hour;
            hourSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }

          const minuteSelect = iframeDoc.querySelector<HTMLSelectElement>(
            'select[name="minute"]'
          );
          if (minuteSelect && minute) {
            minuteSelect.value = minute;
            minuteSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // Submit the form
        setTimeout(() => {
          const submitButton = iframeDoc.querySelector<HTMLButtonElement>(
            'input[type="submit"], button[type="submit"], button[class*="search"]'
          );
          if (submitButton) {
            console.log('🔍 Clicking search button...');
            submitButton.click();

            // Wait for results to load
            setTimeout(() => {
              extractResults(iframeDoc);
            }, 5000); // Wait 5s for results
          } else {
            console.error('❌ Submit button not found');
            onError('Could not submit form');
            setIsLoading(false);
          }
        }, 1000);
      }, 1000);
    } catch (error) {
      console.error('❌ Error filling form:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const extractResults = (iframeDoc: Document) => {
    try {
      console.log('📊 Extracting results from e-podroznik...');

      const journeys: any[] = [];

      // Try multiple selectors for connection boxes
      const connectionSelectors = [
        'div[class*="connectionBox"]',
        'div[class*="connection"]',
        'div[class*="route-result"]',
        'tr[class*="connection"]',
        'div[class*="journey"]',
        '.connection',
        '.route',
        '.result-item'
      ];

      let connections: Element[] = [];
      for (const selector of connectionSelectors) {
        const elements = Array.from(iframeDoc.querySelectorAll(selector));
        if (elements.length > 0) {
          connections = elements;
          console.log(`✅ Found ${elements.length} connections using selector: ${selector}`);
          break;
        }
      }

      if (connections.length === 0) {
        console.warn('⚠️ No connection boxes found, trying fallback extraction...');
        
        // Fallback: Look for time patterns in entire page
        const bodyText = iframeDoc.body.textContent || '';
        const timePattern = /(\d{1,2}:\d{2})\s*[-–→]\s*(\d{1,2}:\d{2})/g;
        let match;
        let count = 0;

        while ((match = timePattern.exec(bodyText)) && count < 10) {
          journeys.push({
            departure_time: match[1],
            arrival_time: match[2],
            duration_minutes: 120,
            transfers: 0,
            source: 'e-podroznik.pl',
            summary: 'Transport publiczny',
            legs: [{
              mode: 'BUS',
              type: 'transit',
              from: { stop_name: from, lat: 0, lon: 0, departure_time: match[1] },
              to: { stop_name: to, lat: 0, lon: 0, arrival_time: match[2] },
              route: { name: 'PKS/Bus', type: 'BUS', company: 'Local Transport' },
              line_name: 'PKS',
              duration_minutes: 120,
              operator: 'PKS'
            }]
          });
          count++;
        }

        if (journeys.length > 0) {
          console.log(`✅ Extracted ${journeys.length} journeys using fallback`);
          onResultsFound(journeys);
          setIsLoading(false);
          return;
        }
      }

      // Extract from connection boxes
      connections.forEach((box, index) => {
        try {
          const text = box.textContent || '';

          // Extract times (HH:MM format)
          const timeMatches = text.match(/\d{1,2}:\d{2}/g) || [];

          if (timeMatches.length >= 2) {
            const departure = timeMatches[0];
            const arrival = timeMatches[timeMatches.length - 1];

            // Extract carrier names
            const carriers = text.match(
              /(PKP[^\s,]*|PKS[^\s,]*|FlixBus|PolskiBus|InterCity|TLK|IC|EIC|EIP|Pendolino)/gi
            ) || [];

            // Extract transfer count
            const transferMatch = text.match(/(\d+)\s*przesiad/i);
            const transfers = transferMatch ? parseInt(transferMatch[1]) : 0;

            // Extract duration
            const durationMatch = text.match(/(\d+)\s*(h|godz)/i);
            const durationHours = durationMatch ? parseInt(durationMatch[1]) : 2;

            journeys.push({
              departure_time: departure,
              arrival_time: arrival,
              duration_minutes: durationHours * 60,
              transfers: transfers,
              source: 'e-podroznik.pl',
              summary: carriers.join(', ') || 'Transport publiczny',
              legs: [{
                mode: carriers.some(c => c.match(/PKP|IC|TLK|EIC|EIP/i)) ? 'HEAVY_RAIL' : 'BUS',
                type: 'transit',
                from: {
                  stop_name: from,
                  lat: 0,
                  lon: 0,
                  departure_time: departure
                },
                to: {
                  stop_name: to,
                  lat: 0,
                  lon: 0,
                  arrival_time: arrival
                },
                route: {
                  name: carriers[0] || 'Bus',
                  type: carriers.some(c => c.match(/PKP|IC|TLK|EIC/i)) ? 'HEAVY_RAIL' : 'BUS',
                  company: carriers.join(', ') || 'Local Transport'
                },
                line_name: carriers[0] || 'PKS',
                duration_minutes: durationHours * 60,
                operator: carriers[0] || 'PKS'
              }]
            });

            console.log(`✅ Extracted journey ${index + 1}:`, {
              departure,
              arrival,
              carriers: carriers.join(', ')
            });
          }
        } catch (err) {
          console.error(`❌ Error extracting journey ${index}:`, err);
        }
      });

      console.log(`📊 Total journeys extracted: ${journeys.length}`);

      if (journeys.length > 0) {
        onResultsFound(journeys);
      } else {
        onError('No journeys found in e-podroznik.pl');
      }

      setIsLoading(false);
    } catch (error) {
      console.error('❌ Error extracting results:', error);
      onError(error instanceof Error ? error.message : 'Extraction failed');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'none' }}>
      <iframe
        ref={iframeRef}
        title="e-podroznik scraper"
        style={{
          width: '1280px',
          height: '800px',
          border: 'none',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px'
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation"
      />
      {isLoading && (
        <div style={{ display: 'none' }}>
          Scraping e-podroznik.pl...
        </div>
      )}
    </div>
  );
};
