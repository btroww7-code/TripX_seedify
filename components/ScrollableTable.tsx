import React, { useRef, useEffect, useState } from 'react';

interface ScrollableTableProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

/**
 * Table wrapper with horizontal scrolling on both top and bottom
 * Main content scrollbar is hidden, only top and bottom scrollbars are visible
 */
export const ScrollableTable: React.FC<ScrollableTableProps> = ({ 
  children, 
  className = '',
  minWidth = '100%'
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showTopScroll, setShowTopScroll] = useState(false);
  const contentIdRef = useRef(`scrollable-content-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const checkScroll = () => {
      if (contentRef.current) {
        const hasHorizontalScroll = contentRef.current.scrollWidth > contentRef.current.clientWidth;
        setShowTopScroll(hasHorizontalScroll);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    
    // Check after content loads
    const timer = setTimeout(checkScroll, 100);

    return () => {
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [children]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (bottomScrollRef.current && bottomScrollRef.current.scrollLeft !== scrollLeft) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
    if (contentRef.current && contentRef.current.scrollLeft !== scrollLeft) {
      contentRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (topScrollRef.current && topScrollRef.current.scrollLeft !== scrollLeft) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    if (contentRef.current && contentRef.current.scrollLeft !== scrollLeft) {
      contentRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    if (topScrollRef.current && topScrollRef.current.scrollLeft !== scrollLeft) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    if (bottomScrollRef.current && bottomScrollRef.current.scrollLeft !== scrollLeft) {
      bottomScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  return (
    <>
      <style>{`
        .${contentIdRef.current}::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      <div className={`relative ${className}`}>
        {/* Top scrollbar */}
        {showTopScroll && (
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="overflow-x-auto overflow-y-hidden mb-2"
            style={{ 
              scrollbarWidth: 'thin', 
              scrollbarColor: '#4b5563 #1f2937',
              height: '17px'
            }}
          >
            <div style={{ 
              width: contentRef.current?.scrollWidth || '100%',
              height: '1px'
            }} />
          </div>
        )}
        
        {/* Content - hidden scrollbar, only show top and bottom */}
        <div
          ref={contentRef}
          onScroll={handleContentScroll}
          className={`overflow-x-auto ${contentIdRef.current}`}
          style={{ 
            scrollbarWidth: 'none', // Hide scrollbar on content (Firefox)
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          <div style={{ minWidth }}>
            {children}
          </div>
        </div>
        
        {/* Bottom scrollbar (always visible if needed) */}
        {showTopScroll && (
          <div
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            className="overflow-x-auto overflow-y-hidden mt-2"
            style={{ 
              scrollbarWidth: 'thin', 
              scrollbarColor: '#4b5563 #1f2937',
              height: '17px'
            }}
          >
            <div style={{ 
              width: contentRef.current?.scrollWidth || '100%',
              height: '1px'
            }} />
          </div>
        )}
      </div>
    </>
  );
};

