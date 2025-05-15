
"use client";

import type { MenuItem } from "@/lib/types";
import { FeedItemDisplay } from "./FeedItemDisplay";
import { useRef, useEffect } from "react";

interface SwipeFeedProps {
  items: MenuItem[];
  onUpsellClick: (item: MenuItem) => void;
  onItemViewed: (itemId: string) => void;
}

export function SwipeFeed({ items, onUpsellClick, onItemViewed }: SwipeFeedProps) {
  const observer = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.75) { // Consider viewed if 75% visible
            const itemId = entry.target.getAttribute("data-item-id");
            if (itemId) {
              onItemViewed(itemId);
            }
          }
        });
      },
      { threshold: 0.75 } // Trigger when 75% of the item is visible
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.current?.observe(ref);
    });

    return () => {
      observer.current?.disconnect();
    };
  }, [items, onItemViewed]);

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        <p>No menu items to display in feed.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {items.map((item, index) => (
        <div
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          data-item-id={item.id}
          className="h-screen w-screen snap-start flex-shrink-0"
        >
          <FeedItemDisplay item={item} onUpsellClick={onUpsellClick} />
        </div>
      ))}
    </div>
  );
}
