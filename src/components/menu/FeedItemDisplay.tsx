
"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon, MediaObject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, Zap, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { getUpsellSuggestions, type UpsellSuggestionsInput } from "@/ai/flows/upsell-suggestions";
import { UpsellCarouselCard } from "./UpsellCarouselCard"; // New import

interface FeedItemDisplayProps {
  item: MenuItem;
  allMenuItems: MenuItem[]; // For fetching upsell suggestions
  onUpsellClick: (item: MenuItem) => void; // Used by UpsellCarouselCard
  onUpsellViewed: (itemId: string) => void; // For tracking engagement
}

const dietaryIconMap: Record<DietaryIcon, React.ReactNode> = {
  vegetarian: <Leaf size={18} className="text-green-500" />,
  vegan: <Leaf size={18} className="text-green-600" />,
  "gluten-free": <WheatOff size={18} className="text-orange-500" />,
  spicy: <Flame size={18} className="text-red-500" />,
};

const dietaryIconTooltip: Record<DietaryIcon, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  spicy: "Spicy",
};

export function FeedItemDisplay({ item, allMenuItems, onUpsellClick, onUpsellViewed }: FeedItemDisplayProps) {
  const [upsellSuggestions, setUpsellSuggestions] = useState<MenuItem[]>([]);
  const [isLoadingUpsells, setIsLoadingUpsells] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const upsellObserver = useRef<IntersectionObserver | null>(null);
  const viewedUpsellIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsLoadingUpsells(true);
    viewedUpsellIds.current.clear();
    const menuDescription = allMenuItems.map(i => `${i.name} - ${i.description} (${i.price})`).join("\n");
    const input: UpsellSuggestionsInput = {
      menuDescription: menuDescription,
      orderedItem: item.name,
    };

    getUpsellSuggestions(input)
      .then(response => {
        const suggestedNames = response.upsellSuggestions;
        const detailedSuggestions = suggestedNames
          .map(name => allMenuItems.find(menuItem => menuItem.name === name || name.includes(menuItem.name)))
          .filter((i): i is MenuItem => Boolean(i))
          .slice(0, 3); // Max 3 upsells
        setUpsellSuggestions(detailedSuggestions);
      })
      .catch(error => {
        console.error("Error fetching upsell suggestions for feed:", error);
        setUpsellSuggestions([]);
      })
      .finally(() => {
        setIsLoadingUpsells(false);
      });
  }, [item, allMenuItems]);

  useEffect(() => {
    if (upsellObserver.current) upsellObserver.current.disconnect();

    upsellObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const upsellId = entry.target.getAttribute("data-upsell-id");
            if (upsellId && !viewedUpsellIds.current.has(upsellId)) {
              onUpsellViewed(upsellId);
              viewedUpsellIds.current.add(upsellId); // Track to avoid multiple logs for same item
              console.log(`Upsell item ${upsellId} viewed in carousel`);
            }
          }
        });
      },
      { threshold: 0.5, root: scrollContainerRef.current } // 50% visible within the horizontal scroller
    );

    const currentUpsellCards = scrollContainerRef.current?.querySelectorAll("[data-upsell-id]");
    currentUpsellCards?.forEach(card => upsellObserver.current?.observe(card));

    return () => {
      upsellObserver.current?.disconnect();
    };
  }, [upsellSuggestions, onUpsellViewed]);


  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const mainMedia = item.media && item.media.length > 0 ? item.media : [{ type: 'image' as 'image', url: '', dataAiHint: 'placeholder food item' }];


  return (
    <div className="relative h-full w-full flex flex-col text-white overflow-hidden bg-black">
      {/* Horizontal Scroll Container for Media & Upsells */}
      <div
        ref={scrollContainerRef}
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
      >
        {mainMedia.map((media, index) => (
          <div key={`main-media-${index}`} className="relative h-full w-full flex-shrink-0 snap-start">
            {media.url ? (
              media.type === 'video' ? (
                <video
                  src={media.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  onError={(e) => console.error("Video error:", e, media.url)}
                  data-ai-hint="food video"
                />
              ) : (
                <Image
                  src={media.url}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  priority={index === 0} // Prioritize first image
                  data-ai-hint={media.dataAiHint || "food item"}
                />
              )
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
                <Zap size={128} className="text-primary-foreground opacity-30" />
              </div>
            )}
             {/* Overlay Gradient for text visibility on main media */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-5"></div>
          </div>
        ))}

        {/* Upsell Item Cards */}
        {!isLoadingUpsells && upsellSuggestions.map((upsellItem, index) => (
          <div key={`upsell-${upsellItem.id}-${index}`} data-upsell-id={upsellItem.id} className="h-full w-full flex-shrink-0 snap-start bg-gray-900 flex items-center justify-center p-4">
            <UpsellCarouselCard item={upsellItem} onOrderClick={() => onUpsellClick(upsellItem)} />
          </div>
        ))}
        {isLoadingUpsells && (
           <div className="h-full w-full flex-shrink-0 snap-start bg-gray-900 flex items-center justify-center p-4 text-white">Loading suggestions...</div>
        )}
      </div>

      {/* Main Item Info Overlay - Common for all main media slides */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10 space-y-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
          {item.name}
        </h2>
        
        {item.dietaryIcons && item.dietaryIcons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.dietaryIcons.map((iconType) => (
              <Badge 
                key={iconType} 
                variant="outline" 
                className="flex items-center gap-1.5 py-1 px-2.5 text-sm bg-white/20 backdrop-blur-sm border-white/30 text-white" 
                title={dietaryIconTooltip[iconType]}
              >
                {dietaryIconMap[iconType]}
                <span>{dietaryIconTooltip[iconType]}</span>
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm md:text-base text-gray-200 line-clamp-2 md:line-clamp-3 leading-relaxed shadow-black [text-shadow:_0_1px_3px_var(--tw-shadow-color)]">
          {item.description}
        </p>

        <p className="text-2xl md:text-3xl font-extrabold text-white shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)] pt-1">
          {item.price}
        </p>
      </div>

      {/* Carousel Controls - Visible only if there's more than one slide (main media + upsells) */}
      {(mainMedia.length + upsellSuggestions.length) > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 sm:h-12 sm:w-12"
            onClick={() => scroll('left')}
            aria-label="Previous item"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 hover:bg-black/50 rounded-full h-10 w-10 sm:h-12 sm:w-12"
            onClick={() => scroll('right')}
            aria-label="Next item"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </Button>
        </>
      )}
    </div>
  );
}
