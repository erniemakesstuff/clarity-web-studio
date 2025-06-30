
"use client";

import type { MenuItem } from "@/lib/types";
import { FeedItemDisplay } from "./FeedItemDisplay";
import { useRef, useEffect } from "react";
import { useMenuAnalytics } from "@/hooks/useMenuAnalytics";
import { useParams } from 'next/navigation';


interface SwipeFeedProps {
  items: MenuItem[];
  allMenuItems: MenuItem[]; // Pass all menu items for upsell context
  onUpsellClick: (item: MenuItem) => void;
}

export function SwipeFeed({ items, allMenuItems, onUpsellClick }: SwipeFeedProps) {
  const params = useParams();
  const ownerId = params.ownerId as string;
  const menuId = params.menuId as string;
  
  const { startTrackingEngagement, endTrackingEngagement } = useMenuAnalytics(ownerId, menuId);
  const observer = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const itemName = entry.target.getAttribute("data-item-name");
          const item = items.find(i => i.name === itemName);

          if (item) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                startTrackingEngagement(item);
            } else {
                endTrackingEngagement(item.name);
            }
          }
        });
      },
      { root: null, threshold: [0.74, 0.75] } // Fire when crossing the 0.75 threshold
    );

    itemRefs.current.forEach((ref) => {
      if (ref) observer.current?.observe(ref);
    });

    return () => {
      // When the component unmounts, make sure to end engagement for any item currently being tracked.
      itemRefs.current.forEach(ref => {
        if (ref) {
            const itemName = ref.getAttribute("data-item-name");
            if (itemName) {
                endTrackingEngagement(itemName);
            }
        }
      });
      observer.current?.disconnect();
    };
  }, [items, startTrackingEngagement, endTrackingEngagement]);

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
          data-item-name={item.name}
          className="h-[95%] w-full snap-center flex-shrink-0 flex items-center justify-center p-4"
        >
          <div className="h-full w-full max-w-sm">
             <FeedItemDisplay 
                item={item} 
                allMenuItems={allMenuItems}
                onUpsellClick={onUpsellClick}
             />
          </div>
        </div>
      ))}
    </div>
  );
}
