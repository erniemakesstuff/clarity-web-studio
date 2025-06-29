"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, Zap } from "lucide-react";
import React from "react";

interface FeedItemDisplayProps {
  item: MenuItem;
  // These props are kept for API compatibility but are not used in this simplified view
  allMenuItems: MenuItem[];
  onUpsellClick: (item: MenuItem) => void;
  onUpsellViewed: (itemId: string) => void;
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

export function FeedItemDisplay({ item }: FeedItemDisplayProps) {
  const primaryImage = item.media && item.media[0] ? item.media[0] : null;

  return (
    <div className="relative h-full w-full flex flex-col text-white overflow-hidden bg-black rounded-2xl shadow-lg">
      {/* Media */}
      <div className="absolute inset-0 z-0">
        {primaryImage && primaryImage.url ? (
            <Image
              src={primaryImage.url}
              alt={item.name}
              layout="fill"
              objectFit="cover"
              priority
              data-ai-hint={primaryImage.dataAiHint || "food item"}
            />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
            <Zap size={128} className="text-primary-foreground opacity-30" />
          </div>
        )}
        {/* Overlay Gradient for text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex-grow flex flex-col justify-end p-6 md:p-10 space-y-3">
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
    </div>
  );
}
