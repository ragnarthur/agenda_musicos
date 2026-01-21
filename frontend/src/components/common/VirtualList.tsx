import React, { useState, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
}

const VirtualList = <T,>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = '',
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const containerHeight = 600;

  const { visibleRange, totalHeight } = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
      items.length - 1
    );

    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight: items.length * itemHeight,
    };
  }, [scrollTop, items.length, itemHeight, overscan]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);

    if (!isScrolling) {
      setIsScrolling(true);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  return (
    <div
      className={`overflow-y-auto ${isScrolling ? 'scroll-smooth' : ''} ${className}`}
      onScroll={handleScroll}
      style={{ height: '100%' }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        {visibleItems.map((item, index) => (
          <div
            key={((item as Record<string, unknown>).id as string | number) || index}
            style={{
              position: 'absolute',
              top: `${(visibleRange.start + index) * itemHeight}px`,
              left: 0,
              width: '100%',
            }}
          >
            {renderItem(item, index, { position: 'absolute', top: `${(visibleRange.start + index) * itemHeight}px`, left: 0, width: '100%' })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VirtualList;
