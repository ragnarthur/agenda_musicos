import React, { useState, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  itemGap?: number;
  containerHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  className?: string;
}

const VirtualList = <T,>({
  items,
  itemHeight,
  itemGap = 0,
  containerHeight = 600,
  overscan = 5,
  renderItem,
  className = '',
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const fullItemHeight = itemHeight + itemGap;

  const { visibleRange, totalHeight } = useMemo(() => {
    const startIndex = Math.floor(scrollTop / fullItemHeight);
    const endIndex = Math.min(
      Math.ceil((scrollTop + containerHeight) / fullItemHeight) + overscan,
      items.length - 1
    );

    const total = items.length ? items.length * fullItemHeight - itemGap : 0;
    return {
      visibleRange: { start: startIndex, end: endIndex },
      totalHeight: total,
    };
  }, [scrollTop, items.length, fullItemHeight, overscan, itemGap, containerHeight]);

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
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          position: 'relative',
        }}
      >
        {visibleItems.map((item, index) => {
          const itemIndex = visibleRange.start + index;
          const top = itemIndex * fullItemHeight;
          return (
            <div
              key={((item as Record<string, unknown>).id as string | number) || itemIndex}
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: 0,
                width: '100%',
                height: `${itemHeight}px`,
              }}
            >
              {renderItem(item, itemIndex, { width: '100%', height: '100%' })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualList;
