"use client";

import type { MenuItem } from "@/lib/types";
import { FeedItemDisplay } from "./FeedItemDisplay";
import { useRef, useEffect } from "react";

interface SwipeFeedProps {
  items: MenuItem[];
  allMenuItems: MenuItem[]; // Pass all menu items for upsell context
  onUpsellClick: (item: MenuItem) => void;
  onItemViewed: (itemId: string) => void;
}

export function SwipeFeed({ items, allMenuItems, onUpsellClick, onItemViewed }: SwipeFeedProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) { 
            const itemId = entry.target.getAttribute("data-item-id");
            if (itemId) {
              onItemViewed(itemId);
            }
          }
        });
      },
      { root: null, threshold: 0.75 } 
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.current?.observe(ref);
    });

    return () => {
      observer.current?.disconnect();
    };
  }, [items, onItemViewed]);

  const handleUpsellViewed = (itemId: string) => {
    console.log(`Upsell item ${itemId} became visible in the main feed item's carousel.`);
    // This is where you'd send engagement data to backend/AI
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <p>No menu items to display in feed.</p>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 w-full overflow-y-auto snap-y snap-mandatory"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          data-item-id={item.id}
          className="h-full w-full snap-center flex-shrink-0 flex items-center justify-center p-4"
        >
          <div className="h-[95%] w-full max-w-sm">
             <FeedItemDisplay 
                item={item} 
                allMenuItems={allMenuItems}
                onUpsellClick={onUpsellClick}
                onUpsellViewed={handleUpsellViewed} 
             />
          </div>
        </div>
      ))}
    </div>
  );
}
